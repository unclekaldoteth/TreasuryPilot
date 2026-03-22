import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { SetupNotice } from "@/components/layout/setup-notice";
import { WalletPosturePanel } from "@/components/dashboard/wallet-posture-panel";
import { StatusPill } from "@/components/ui/status-pill";
import { getMissingEnvKeys } from "@/lib/config/env";
import { calculateDashboardMetrics } from "@/lib/dashboard/metrics";
import { listStoredPaymentRequests } from "@/lib/db/repositories/payment-requests";
import { getLatestTreasuryPolicy } from "@/lib/db/repositories/treasury-policy";
import { getWalletBalance } from "@/lib/wallet/get-balance";
import { refreshPendingTransactionStatuses } from "@/lib/wallet/refresh-transactions";

export const dynamic = "force-dynamic";

function formatWalletMetric(input: { balance: string; asset: string; status: string }) {
  if (input.status === "missing") {
    return `0 ${input.asset}`;
  }

  if (input.status === "error") {
    return "Unavailable";
  }

  return `${input.balance} ${input.asset}`;
}

export default async function DashboardPage() {
  await refreshPendingTransactionStatuses().catch(() => null);

  let wallet;
  let treasuryPolicy;
  let paymentRequests;

  try {
    [wallet, treasuryPolicy, paymentRequests] = await Promise.all([
      getWalletBalance(),
      getLatestTreasuryPolicy(),
      listStoredPaymentRequests(),
    ]);
  } catch (error) {
    const missingEnvKeys = getMissingEnvKeys();
    const details =
      missingEnvKeys.length > 0
        ? `Missing environment variables: ${missingEnvKeys.join(", ")}.`
        : error instanceof Error
          ? error.message
          : "The deployment could not reach the Postgres database.";

    return (
      <AppShell
        title="Treasury Dashboard"
        description="Live treasury posture from the persisted wallet, current policy, and recent payment decisions."
      >
        <SetupNotice
          title="Dashboard unavailable"
          summary="This page needs a working Postgres connection before it can render live treasury data."
          details={details}
        />
      </AppShell>
    );
  }

  const recentDecisions = paymentRequests.slice(0, 6);
  const {
    totalProcessed,
    rejectedCount,
    escalatedCount,
    executionRate,
    totalMoved,
  } = calculateDashboardMetrics(paymentRequests);

  const metrics = [
    {
      label: "Wallet balance",
      value: formatWalletMetric({
        balance: wallet.balance,
        asset: wallet.asset,
        status: wallet.status,
      }),
    },
    { label: "Auto-approval ceiling", value: `${treasuryPolicy.autoApprovalLimit} USDt` },
    { label: "Weekly policy budget", value: `${treasuryPolicy.weeklyLimit} USDt` },
  ];

  const operationalStats = [
    { label: "Payments processed", value: `${totalProcessed}`, color: "text-[var(--ink)]" },
    { label: "Execution rate", value: `${executionRate}%`, color: "text-[var(--mint)]" },
    { label: "Total USDt moved", value: `${totalMoved.toLocaleString()} USDt`, color: "text-[var(--gold)]" },
    { label: "Rejected", value: `${rejectedCount}`, color: "text-[var(--rose)]" },
    { label: "Escalated", value: `${escalatedCount}`, color: "text-[var(--gold)]" },
  ];

  return (
    <AppShell
      title="Treasury Dashboard"
      description="Live treasury posture from the persisted wallet, current policy, and recent payment decisions. Pending transaction receipts are refreshed when this page loads."
    >
      <section className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-[1.5rem] border border-[var(--border)] bg-white/70 p-5 shadow-[0_16px_38px_-30px_var(--shadow)]"
          >
            <p className="text-sm uppercase tracking-[0.16em] text-[var(--muted)]">{metric.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{metric.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        {operationalStats.map((stat) => (
          <article
            key={stat.label}
            className="flex flex-col items-center rounded-[1.3rem] border border-[var(--border)] bg-white/60 px-4 py-4 shadow-[0_10px_24px_-20px_var(--shadow)]"
          >
            <p className={`text-2xl font-bold tracking-[-0.04em] ${stat.color}`}>{stat.value}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{stat.label}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <SectionCard title="Wallet posture" eyebrow="Runtime snapshot">
          <WalletPosturePanel wallet={wallet} />
        </SectionCard>

        <SectionCard title="Policy stance" eyebrow="Hard controls">
          <ul className="space-y-3 text-sm leading-6 text-[var(--muted)]">
            <li>Allowlist required: {treasuryPolicy.requireAllowlist ? "yes" : "no"}</li>
            <li>Supported asset set: {treasuryPolicy.allowedAssets.join(", ") || "None configured"}</li>
            <li>Daily spend cap: {treasuryPolicy.dailyLimit} USDt</li>
            <li>Paused state: {treasuryPolicy.paused ? "active" : "inactive"}</li>
          </ul>
        </SectionCard>
      </section>

      <SectionCard title="Recent decisions" eyebrow="Live queue">
        {recentDecisions.length === 0 ? (
          <p className="text-sm leading-6 text-[var(--muted)]">
            No payment requests have been recorded yet. Submit one from the payment console to populate this feed.
          </p>
        ) : (
          <div className="space-y-4">
            {recentDecisions.map((request) => (
              <article
                key={request.id}
                className="rounded-[1.3rem] border border-[var(--border)] bg-white/65 p-4 shadow-[0_10px_28px_-24px_var(--shadow)]"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold tracking-[-0.02em] text-[var(--ink)]">
                      {request.rawRequest}
                    </p>
                    <p className="text-sm leading-6 text-[var(--muted)]">{request.rationale}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      {request.requestSource} request
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <div className="flex flex-wrap gap-2">
                      <StatusPill label={request.decision} />
                      <StatusPill label={request.status} />
                    </div>
                    <p className="text-sm font-medium text-[var(--ink)]">{request.amount}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </AppShell>
  );
}
