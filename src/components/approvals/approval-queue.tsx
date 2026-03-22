"use client";

import { startTransition, useMemo, useState } from "react";
import { SectionCard } from "@/components/layout/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import type { ApprovalRecord } from "@/lib/types";

type ApprovalsResponse = {
  approvals: ApprovalRecord[];
};

type ApprovalActionResponse = {
  approval?: ApprovalRecord;
  paymentRequestId?: string;
  transaction?: {
    txHash?: string;
    status: string;
    error?: string;
  };
  error?: string;
};

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

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }

  return payload;
}

function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function ApprovalQueue({ initialApprovals }: { initialApprovals: ApprovalRecord[] }) {
  const [approvals, setApprovals] = useState(initialApprovals);
  const [reviewerLabel, setReviewerLabel] = useState("Treasury admin");
  const [reviewNotes, setReviewNotes] = useState("");
  const [busyApprovalId, setBusyApprovalId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadApprovals() {
    try {
      const payload = await requestJson<ApprovalsResponse>("/api/approvals");

      startTransition(() => {
        setApprovals(payload.approvals ?? []);
        setError(null);
      });
    } catch (loadError) {
      startTransition(() => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load approvals.");
      });
    }
  }

  async function runAction(approvalId: string, action: "approve" | "reject") {
    setBusyApprovalId(approvalId);
    setMessage(null);
    setError(null);

    try {
      const endpoint =
        action === "approve"
          ? `/api/approvals/${approvalId}/approve`
          : `/api/approvals/${approvalId}/reject`;

      const payload = await requestJson<ApprovalActionResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify({
          reviewerLabel,
          reviewNotes,
        }),
      });

      await loadApprovals();

      startTransition(() => {
        setMessage(
          action === "approve"
            ? payload.transaction?.txHash
              ? `Approval executed. Submitted transaction ${payload.transaction.txHash}.`
              : "Approval recorded."
            : "Approval request rejected.",
        );
      });
    } catch (actionError) {
      startTransition(() => {
        setError(actionError instanceof Error ? actionError.message : "Approval action failed.");
      });
    } finally {
      setBusyApprovalId(null);
    }
  }

  const pendingApprovals = useMemo(
    () => approvals.filter((approval) => approval.status === "pending"),
    [approvals],
  );
  const resolvedApprovals = useMemo(
    () => approvals.filter((approval) => approval.status !== "pending"),
    [approvals],
  );

  return (
    <div className="space-y-4">
      <SectionCard title="Reviewer defaults" eyebrow="Approval metadata">
        <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Reviewer
            </span>
            <input
              value={reviewerLabel}
              onChange={(event) => setReviewerLabel(event.target.value)}
              className="w-full rounded-[1rem] border border-[var(--border)] bg-white/80 px-4 py-3 text-sm text-[var(--ink)] outline-none"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Review notes
            </span>
            <textarea
              value={reviewNotes}
              onChange={(event) => setReviewNotes(event.target.value)}
              className="min-h-24 w-full rounded-[1rem] border border-[var(--border)] bg-white/80 p-4 text-sm leading-6 text-[var(--ink)] outline-none"
              placeholder="Optional note that will be stored alongside the review decision."
            />
          </label>
        </div>
        {message ? <p className="mt-4 text-sm text-[var(--mint)]">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-[var(--rose)]">{error}</p> : null}
      </SectionCard>

      <SectionCard title="Pending items" eyebrow="Human review">
        {pendingApprovals.length === 0 ? (
          <p className="text-sm leading-6 text-[var(--muted)]">
            No pending approvals right now.
          </p>
        ) : (
          <div className="space-y-4">
            {pendingApprovals.map((approval) => (
              <article
                key={approval.id}
                className="rounded-[1.4rem] border border-[var(--border)] bg-white/72 p-5 shadow-[0_12px_34px_-28px_var(--shadow)]"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <p className="text-lg font-semibold tracking-[-0.03em]">{approval.vendor}</p>
                    <p className="text-sm leading-6 text-[var(--muted)]">{approval.reason}</p>
                    <p className="text-sm text-[var(--muted)]">
                      Requested at {formatTimestamp(approval.requestedAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-3 md:items-end">
                    <StatusPill label={approval.status} />
                    <p className="text-xl font-semibold tracking-[-0.03em]">{approval.amount}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={busyApprovalId === approval.id}
                    onClick={() => void runAction(approval.id, "approve")}
                    className="rounded-full bg-[var(--navy)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#10273c] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyApprovalId === approval.id ? "Submitting..." : "Approve payment"}
                  </button>
                  <button
                    type="button"
                    disabled={busyApprovalId === approval.id}
                    onClick={() => void runAction(approval.id, "reject")}
                    className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--paper)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reject request
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Resolved items" eyebrow="Recent outcomes">
        {resolvedApprovals.length === 0 ? (
          <p className="text-sm leading-6 text-[var(--muted)]">
            No resolved approvals yet.
          </p>
        ) : (
          <div className="space-y-4">
            {resolvedApprovals.map((approval) => (
              <article
                key={approval.id}
                className="rounded-[1.25rem] border border-[var(--border)] bg-white/68 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <p className="text-base font-semibold tracking-[-0.02em] text-[var(--ink)]">
                      {approval.vendor}
                    </p>
                    <p className="text-sm leading-6 text-[var(--muted)]">{approval.reason}</p>
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <StatusPill label={approval.status} />
                    <p className="text-sm font-medium text-[var(--ink)]">{approval.amount}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
