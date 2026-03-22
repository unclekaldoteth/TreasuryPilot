"use client";

import { startTransition, useEffect, useState } from "react";
import { SectionCard } from "@/components/layout/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import type { BridgeRequestRecord } from "@/lib/types";
import type { BridgeFeatureStatus } from "@/lib/bridge/types";

type BridgeRequestListResponse = {
  feature: BridgeFeatureStatus;
  requests: BridgeRequestRecord[];
};

type BridgeRequestResponse = {
  feature: BridgeFeatureStatus;
  paymentRequestId: string;
  decision: string;
  reason: string;
  bridgeRequest: BridgeRequestRecord;
  quote: {
    feeWei: string;
    bridgeFeeWei: string;
    totalFeeWei: string;
  } | null;
  transactions: Array<{
    id: string;
    txHash: string | null;
    txStatus: string;
  }>;
  approvals: Array<{
    id: string;
    status: string;
  }>;
  auditEvents: Array<{
    id: string;
    eventType: string;
    payloadJson?: string;
    summary?: string;
  }>;
  error?: string;
};

const defaultBridgeDraft = "Bridge 250 USDt0 from Arbitrum to Optimism for payroll liquidity";
const pollIntervalMs = 5000;

function hasPendingBridge(requests: BridgeRequestRecord[]) {
  return requests.some((request) => request.status === "submitted");
}

function hasLiveExecution(feature: BridgeFeatureStatus) {
  return feature.mode === "live" && feature.executionEnabled && feature.verifiedRoutes.length > 0;
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

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }

  return payload;
}

async function fetchBridgeRequests() {
  return requestJson<BridgeRequestListResponse>("/api/bridges/request");
}

export function BridgeConsole() {
  const [feature, setFeature] = useState<BridgeFeatureStatus | null>(null);
  const [requests, setRequests] = useState<BridgeRequestRecord[]>([]);
  const [draftRequest, setDraftRequest] = useState(defaultBridgeDraft);
  const [requesterLabel, setRequesterLabel] = useState("Treasury admin");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const payload = await fetchBridgeRequests();

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setFeature(payload.feature);
          setRequests(payload.requests ?? []);
          setError(null);
        });
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setError(loadError instanceof Error ? loadError.message : "Unable to load bridge requests.");
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasPendingBridge(requests)) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const payload = await fetchBridgeRequests();

          startTransition(() => {
            setFeature(payload.feature);
            setRequests(payload.requests ?? []);
            setError(null);
          });
        } catch (loadError) {
          startTransition(() => {
            setError(loadError instanceof Error ? loadError.message : "Unable to load bridge requests.");
          });
        }
      })();
    }, pollIntervalMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [requests]);

  const isRefreshing = hasPendingBridge(requests);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const payload = await requestJson<BridgeRequestResponse>("/api/bridges/request", {
        method: "POST",
        body: JSON.stringify({
          rawRequest: draftRequest,
          requesterLabel,
        }),
      });

      const latestRequests = await fetchBridgeRequests();

      startTransition(() => {
        setFeature(latestRequests.feature);
        setRequests(latestRequests.requests ?? []);
        setError(null);
      });

      setMessage(
        payload.error
          ? payload.error
          : payload.decision === "execute"
            ? "Bridge request submitted."
            : payload.decision === "escalate"
              ? "Bridge request escalated for review."
              : "Bridge request rejected by policy.",
      );
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit bridge request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Bridge composer" eyebrow="Natural language input">
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
                Bridge request
              </span>
              <textarea
                className="min-h-40 w-full rounded-[1.3rem] border border-[var(--border)] bg-white/80 p-4 text-sm leading-6 text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
                value={draftRequest}
                onChange={(event) => setDraftRequest(event.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                "Bridge 250 USDt0 from Arbitrum to Optimism for payroll liquidity",
                "Bridge 1200 USDt0 from Arbitrum to Polygon for settlement capacity",
                "Bridge 5000 USDt0 from Arbitrum to Ethereum for treasury consolidation",
                "Bridge 250 USDt0 from Arbitrum to Solana recipient HyXJcgYpURfDhgzuyRL7zxP4FhLg7LZQMeDrR4MXZcMN for settlement liquidity",
              ].map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setDraftRequest(example)}
                  className="rounded-full border border-[var(--border)] bg-white/70 px-3 py-1 text-xs font-medium text-[var(--muted)] transition hover:bg-white"
                >
                  Use example
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-[var(--navy)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#10273c] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Submitting..." : "Submit bridge request"}
            </button>
          </form>

          {message ? <p className="mt-4 text-sm text-[var(--mint)]">{message}</p> : null}
          {error ? <p className="mt-4 text-sm text-[var(--rose)]">{error}</p> : null}
        </SectionCard>

        <SectionCard title="Bridge runtime" eyebrow="Feature status">
          {!feature ? (
            <p className="text-sm leading-6 text-[var(--muted)]">Loading bridge configuration...</p>
          ) : (
            <div className="space-y-4 text-sm leading-6 text-[var(--muted)]">
              <div className="flex flex-wrap gap-2">
                <StatusPill label={feature.mode} />
                <StatusPill label={feature.enabled ? "enabled" : "disabled"} />
                <StatusPill label={hasLiveExecution(feature) ? "execute" : "demo-safe"} />
              </div>
              <p>Source runtime: {feature.sourceNetwork}</p>
              <p>Bridge asset: {feature.asset}</p>
              <p>{feature.message}</p>
              <p>
                TreasuryPilot payments run on Sepolia testnet in this demo. Cross-chain bridge requests are currently
                demo-safe only and do not execute live on testnet or mainnet from this runtime.
              </p>
              <p>
                Supported routes can be requested and reviewed here. Live execution currently requires an Arbitrum
                bridge wallet/runtime, configured bridge token and spender addresses, and
                {" "}
                <code>WDK_BRIDGE_EXECUTION_ENABLED=true</code>.
              </p>
              <p>Non-EVM routes such as Solana require an explicit recipient in the request text.</p>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Supported routes
                </p>
                <ul className="mt-2 space-y-2">
                  {feature.supportedRoutes.length === 0 ? (
                    <li>No bridge routes are enabled in this environment.</li>
                  ) : (
                    feature.supportedRoutes.map((route) => (
                      <li key={route.id}>
                        {route.sourceNetwork} to {route.destinationNetwork} • {route.asset}
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Live execution routes
                </p>
                <ul className="mt-2 space-y-2">
                  {feature.verifiedRoutes.length === 0 ? (
                    <li>No live routes configured in the current demo runtime.</li>
                  ) : (
                    feature.verifiedRoutes.map((route) => (
                      <li key={route.id}>
                        {route.sourceNetwork} to {route.destinationNetwork} • {route.asset}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          )}
        </SectionCard>
      </section>

      <SectionCard title="Recent bridge requests" eyebrow="Live bridge queue">
        {requests.length === 0 ? (
          <p className="text-sm leading-6 text-[var(--muted)]">
            No bridge requests have been recorded yet.
          </p>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <article
                key={request.id}
                className="rounded-[1.3rem] border border-[var(--border)] bg-white/65 p-4 shadow-[0_10px_28px_-24px_var(--shadow)]"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold tracking-[-0.02em] text-[var(--ink)]">
                      {request.sourceNetwork} to {request.destinationNetwork}
                    </p>
                    <p className="text-sm leading-6 text-[var(--muted)]">{request.purpose}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      Recipient {request.recipientAddress}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <div className="flex flex-wrap gap-2">
                      <StatusPill label={request.status} />
                    </div>
                    <p className="text-sm font-medium text-[var(--ink)]">{request.amount}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        {isRefreshing ? (
          <p className="mt-4 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            Refreshing bridge status...
          </p>
        ) : null}
      </SectionCard>
    </div>
  );
}
