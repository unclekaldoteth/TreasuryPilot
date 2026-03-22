"use client";

import { startTransition, useEffect, useState } from "react";
import { DecisionPipeline } from "@/components/payments/decision-pipeline";
import { SectionCard } from "@/components/layout/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import type {
  AuditEvent,
  Decision,
  PaymentIntent,
  PaymentRequestRecord,
  PolicyEvaluation,
  Vendor,
} from "@/lib/types";

type StoredTransaction = {
  id: string;
  network: string;
  asset: string;
  amount: number;
  txHash: string | null;
  txStatus: "submitted" | "confirmed" | "failed";
  submittedAt: string | null;
  confirmedAt: string | null;
};

type PaymentDetailResponse = {
  paymentRequest: PaymentRequestRecord | null;
  intent: PaymentIntent | null;
  evaluation: PolicyEvaluation | null;
  approvals: Array<{
    id: string;
    status: string;
    reviewerLabel: string | null;
    reviewNotes: string | null;
    createdAt: string;
  }>;
  transactions: StoredTransaction[];
  auditEvents: AuditEvent[];
  error?: string;
};

const defaultDraft = "Pay Northstar Design 250 USDT for February design work";
const pollIntervalMs = 5000;

function formatTimestamp(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function hasPendingPayments(payments: PaymentRequestRecord[]) {
  return payments.some((payment) => payment.status === "executing");
}

function detailNeedsRefresh(detail: PaymentDetailResponse | null) {
  return detail?.transactions.some((transaction) => transaction.txStatus === "submitted") ?? false;
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json()) as T & { error?: string };

  if (!response.ok && !("paymentRequest" in payload)) {
    throw new Error(payload.error ?? "Request failed.");
  }

  return payload;
}

async function fetchVendors() {
  return requestJson<{ vendors: Vendor[] }>("/api/vendors");
}

async function fetchPayments(refresh: boolean) {
  const endpoint = refresh ? "/api/payments?refresh=true" : "/api/payments";
  return requestJson<{ payments: PaymentRequestRecord[] }>(endpoint);
}

async function fetchPaymentDetail(paymentId: string, refresh: boolean) {
  const endpoint = refresh ? `/api/payments/${paymentId}?refresh=true` : `/api/payments/${paymentId}`;
  return requestJson<PaymentDetailResponse>(endpoint);
}

function resolveSelectedPaymentId(
  payments: PaymentRequestRecord[],
  current: string | null,
  preferred: string | null = null,
) {
  if (preferred && payments.some((payment) => payment.id === preferred)) {
    return preferred;
  }

  if (current && payments.some((payment) => payment.id === current)) {
    return current;
  }

  return payments[0]?.id ?? null;
}

export function PaymentConsole() {
  const [payments, setPayments] = useState<PaymentRequestRecord[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [paymentDetail, setPaymentDetail] = useState<PaymentDetailResponse | null>(null);
  const [draftRequest, setDraftRequest] = useState(defaultDraft);
  const [requesterLabel, setRequesterLabel] = useState("Treasury admin");
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pipelineDecision, setPipelineDecision] = useState<Decision | null>(null);
  const [pipelineAnimate, setPipelineAnimate] = useState(false);
  const [pipelineRunId, setPipelineRunId] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const payload = await fetchVendors();

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setVendors(payload.vendors ?? []);
        });
      } catch {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setVendors([]);
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const payload = await fetchPayments(false);

        if (cancelled) {
          return;
        }

        const nextPayments = payload.payments ?? [];
        const nextSelectedPaymentId = nextPayments[0]?.id ?? null;

        startTransition(() => {
          setPayments(nextPayments);
          setSelectedPaymentId(nextSelectedPaymentId);
          setListError(null);

          if (!nextSelectedPaymentId) {
            setPaymentDetail(null);
            setDetailError(null);
          }
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setListError(error instanceof Error ? error.message : "Unable to load payments.");
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedPaymentId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const payload = await fetchPaymentDetail(selectedPaymentId, false);

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setPaymentDetail(payload);
          setDetailError(null);
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setPaymentDetail(null);
          setDetailError(error instanceof Error ? error.message : "Unable to load payment detail.");
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedPaymentId]);

  const isPolling =
    hasPendingPayments(payments) || (selectedPaymentId !== null && detailNeedsRefresh(paymentDetail));
  const isRefreshing = isPolling && selectedPaymentId !== null;

  useEffect(() => {
    if (!isPolling || !selectedPaymentId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const [paymentsPayload, detailPayload] = await Promise.all([
            fetchPayments(true),
            fetchPaymentDetail(selectedPaymentId, false),
          ]);
          const nextPayments = paymentsPayload.payments ?? [];
          const nextSelectedPaymentId = resolveSelectedPaymentId(
            nextPayments,
            selectedPaymentId,
            selectedPaymentId,
          );

          startTransition(() => {
            setPayments(nextPayments);
            setSelectedPaymentId(nextSelectedPaymentId);
            setListError(null);

            if (nextSelectedPaymentId === selectedPaymentId) {
              setPaymentDetail(detailPayload);
              setDetailError(null);
            } else {
              setPaymentDetail(null);
              setDetailError(null);
            }
          });
        } catch (error) {
          startTransition(() => {
            setDetailError(error instanceof Error ? error.message : "Unable to refresh payment detail.");
          });
        }
      })();
    }, pollIntervalMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isPolling, selectedPaymentId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage(null);
    setPipelineDecision(null);
    setPipelineAnimate(false);

    try {
      const payload = await requestJson<PaymentDetailResponse>("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          rawRequest: draftRequest,
          requesterLabel,
        }),
      });

      const createdPaymentId = payload.paymentRequest?.id ?? null;
      const paymentsPayload = await fetchPayments(true);
      const nextPayments = paymentsPayload.payments ?? [];
      const nextSelectedPaymentId = resolveSelectedPaymentId(
        nextPayments,
        selectedPaymentId,
        createdPaymentId,
      );

      startTransition(() => {
        setPayments(nextPayments);
        setSelectedPaymentId(nextSelectedPaymentId);
        setListError(null);
      });

      if (createdPaymentId) {
        const detailPayload = await fetchPaymentDetail(createdPaymentId, false);

        startTransition(() => {
          setPaymentDetail(detailPayload);
          setDetailError(null);
        });
      }

      const decision = payload.evaluation?.decision as Decision | undefined;
      if (decision) {
        setPipelineDecision(decision);
        setPipelineAnimate(true);
        setPipelineRunId((current) => current + 1);
      }

      setSubmitMessage(payload.error ?? "Payment request stored.");
    } catch (error) {
      setSubmitMessage(error instanceof Error ? error.message : "Unable to submit payment request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedSummary = payments.find((payment) => payment.id === selectedPaymentId) ?? null;

  return (
    <div className="space-y-4">
      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Request composer" eyebrow="Natural language input">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Requester
              </span>
              <input
                value={requesterLabel}
                onChange={(event) => setRequesterLabel(event.target.value)}
                className="w-full rounded-[1rem] border border-[var(--border)] bg-white/80 px-4 py-3 text-sm text-[var(--ink)] outline-none"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Payment request
              </span>
              <textarea
                className="min-h-40 w-full rounded-[1.3rem] border border-[var(--border)] bg-white/80 p-4 text-sm leading-6 text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
                value={draftRequest}
                onChange={(event) => setDraftRequest(event.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {vendors.map((vendor) => (
                <button
                  key={vendor.id}
                  type="button"
                  onClick={() =>
                    setDraftRequest(`Pay ${vendor.name} 250 USDT for ${vendor.category} services`)
                  }
                  className="rounded-full border border-[var(--border)] bg-white/70 px-3 py-1 text-xs font-medium text-[var(--muted)] transition hover:bg-white"
                >
                  {vendor.name}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-[var(--muted)]">
                {submitMessage ?? "Submit a request to persist it and watch live execution updates here."}
              </p>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-[var(--navy)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#10273c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Submit request"}
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Selected request" eyebrow="Live status">
          {pipelineDecision && (
            <div className="mb-4">
              <DecisionPipeline
                key={`${pipelineDecision}-${pipelineRunId}`}
                decision={pipelineDecision}
                animate={pipelineAnimate}
              />
            </div>
          )}
          {selectedSummary ? (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-[1.3rem] border border-[var(--border)] bg-white/70 p-4 text-sm text-[var(--muted)]">
                <div className="flex items-center justify-between gap-3">
                  <span>Recipient</span>
                  <strong className="text-right text-[var(--ink)]">{selectedSummary.recipient}</strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Amount</span>
                  <strong className="text-right text-[var(--ink)]">{selectedSummary.amount}</strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Decision</span>
                  <StatusPill label={selectedSummary.decision} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Lifecycle</span>
                  <StatusPill label={selectedSummary.status} />
                </div>
              </div>
              <p className="text-sm leading-6 text-[var(--muted)]">
                {paymentDetail?.evaluation?.reason ?? selectedSummary.rationale}
              </p>
              {paymentDetail?.evaluation?.results && paymentDetail.evaluation.results.length > 0 && (
                <details className="group rounded-[1.2rem] border border-[var(--border)] bg-white/65">
                  <summary className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gold)] transition-colors hover:text-[var(--ink)]">
                    Policy evaluation ({paymentDetail.evaluation.results.filter(r => r.passed).length}/{paymentDetail.evaluation.results.length} passed)
                  </summary>
                  <div className="space-y-2 px-4 pb-4">
                    {paymentDetail.evaluation.results.map((rule) => (
                      <div
                        key={rule.rule}
                        className="flex items-start gap-3 rounded-[0.8rem] border border-[var(--border)] bg-white/80 px-3 py-2 text-sm"
                      >
                        <span className={`mt-0.5 text-base leading-none ${rule.passed ? "text-[var(--mint)]" : "text-[var(--rose)]"}`}>
                          {rule.passed ? "✓" : "✕"}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-[var(--ink)]">
                            {rule.rule.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs leading-5 text-[var(--muted)]">{rule.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
              <div className="rounded-[1.2rem] border border-[var(--border)] bg-white/65 p-4 text-sm text-[var(--muted)]">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium text-[var(--ink)]">Polling</span>
                  <StatusPill label={isPolling ? "pending" : "connected"} />
                  <span>{isPolling ? "Watching pending execution for receipt updates." : "No pending transfers."}</span>
                </div>
                {isRefreshing ? (
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--gold)]">
                    Refreshing every {pollIntervalMs / 1000}s while execution is pending
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm leading-6 text-[var(--muted)]">
              No stored payments yet. Submit a request to populate the console.
            </p>
          )}
          {detailError ? <p className="mt-4 text-sm text-[var(--rose)]">{detailError}</p> : null}
        </SectionCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
        <SectionCard title="Request list" eyebrow="Live queue">
          {listError ? <p className="text-sm text-[var(--rose)]">{listError}</p> : null}
          <div className="space-y-3">
            {payments.length === 0 ? (
              <p className="text-sm leading-6 text-[var(--muted)]">
                No payment requests have been created yet.
              </p>
            ) : (
              payments.map((payment) => {
                const isSelected = payment.id === selectedPaymentId;

                return (
                  <button
                    key={payment.id}
                    type="button"
                    onClick={() => setSelectedPaymentId(payment.id)}
                    className={`w-full rounded-[1.25rem] border p-4 text-left transition ${
                      isSelected
                        ? "border-[var(--navy)] bg-[rgba(13,31,44,0.08)]"
                        : "border-[var(--border)] bg-white/65 hover:bg-white"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold tracking-[-0.02em] text-[var(--ink)]">
                          {payment.rawRequest}
                        </p>
                        <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                          {payment.requestSource} request • {formatTimestamp(payment.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusPill label={payment.decision} />
                        <StatusPill label={payment.status} />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </SectionCard>

        <SectionCard title="Execution detail" eyebrow="Audit and transaction trail">
          {paymentDetail?.paymentRequest ? (
            <div className="space-y-4">
              <article className="rounded-[1.2rem] border border-[var(--border)] bg-white/65 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold tracking-[-0.02em] text-[var(--ink)]">
                      {paymentDetail.intent?.recipientName ?? paymentDetail.paymentRequest.recipient}
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {paymentDetail.intent?.recipientAddress ?? "No recipient address stored"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      {paymentDetail.paymentRequest.amount}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      {paymentDetail.intent?.category ?? "uncategorized"}
                    </p>
                  </div>
                </div>
              </article>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3 rounded-[1.2rem] border border-[var(--border)] bg-white/65 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gold)]">
                    Transactions
                  </p>
                  {paymentDetail.transactions.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">No transactions recorded yet.</p>
                  ) : (
                    paymentDetail.transactions.map((transaction) => (
                      <div key={transaction.id} className="space-y-2 rounded-[1rem] border border-[var(--border)] bg-white/80 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <StatusPill label={transaction.txStatus} />
                          <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                            {transaction.network}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-[var(--ink)]">
                          {transaction.txHash ?? "No transaction hash yet"}
                        </p>
                        <p className="text-sm text-[var(--muted)]">
                          Submitted {formatTimestamp(transaction.submittedAt)}
                        </p>
                        <p className="text-sm text-[var(--muted)]">
                          Confirmed {formatTimestamp(transaction.confirmedAt)}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-3 rounded-[1.2rem] border border-[var(--border)] bg-white/65 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gold)]">
                    Audit events
                  </p>
                  {paymentDetail.auditEvents.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">No audit events recorded yet.</p>
                  ) : (
                    paymentDetail.auditEvents.map((event) => (
                      <div key={event.id} className="rounded-[1rem] border border-[var(--border)] bg-white/80 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-[var(--ink)]">{event.eventType}</p>
                          <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                            {formatTimestamp(event.createdAt)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{event.summary}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-6 text-[var(--muted)]">
              Select a payment from the queue to inspect its transaction and audit trail.
            </p>
          )}
        </SectionCard>
      </section>
    </div>
  );
}
