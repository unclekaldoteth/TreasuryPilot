import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import { getLatestTreasuryPolicy } from "@/lib/db/repositories/treasury-policy";
import { listStoredVendors } from "@/lib/db/repositories/vendors";

export const dynamic = "force-dynamic";

export default async function PolicyPage() {
  const [treasuryPolicy, vendors] = await Promise.all([
    getLatestTreasuryPolicy(),
    listStoredVendors(),
  ]);

  return (
    <AppShell
      title="Policy Control Surface"
      description="This page mirrors the deterministic constraints sitting between the agent and wallet execution. Values shown here are read from the persisted treasury policy and vendor records."
    >
      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <SectionCard title="Thresholds" eyebrow="Current defaults">
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["Per transaction", `${treasuryPolicy.perTxLimit} USDt`],
              ["Daily limit", `${treasuryPolicy.dailyLimit} USDt`],
              ["Weekly limit", `${treasuryPolicy.weeklyLimit} USDt`],
              ["Auto-approval", `${treasuryPolicy.autoApprovalLimit} USDt`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[1.2rem] border border-[var(--border)] bg-white/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{value}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Allowed dimensions" eyebrow="Hard gate configuration">
          <ul className="space-y-3 text-sm leading-6 text-[var(--muted)]">
            <li>Allowed assets: {treasuryPolicy.allowedAssets.join(", ") || "None configured"}</li>
            <li>Allowed categories: {treasuryPolicy.allowedCategories.join(", ") || "None configured"}</li>
            <li>Require allowlist: {treasuryPolicy.requireAllowlist ? "enabled" : "disabled"}</li>
            <li className="flex items-center gap-3">
              Pause switch
              <StatusPill label={treasuryPolicy.paused ? "blocked" : "connected"} />
            </li>
          </ul>
        </SectionCard>
      </section>

      <SectionCard title="Vendor allowlist" eyebrow="Payment recipients">
        {vendors.length === 0 ? (
          <p className="text-sm leading-6 text-[var(--muted)]">
            No vendors have been configured yet.
          </p>
        ) : (
          <div className="grid gap-3">
            {vendors.map((vendor) => (
              <article
                key={vendor.id}
                className="grid gap-2 rounded-[1.2rem] border border-[var(--border)] bg-white/70 p-4 md:grid-cols-[1fr_auto_auto]"
              >
                <div>
                  <h3 className="text-base font-semibold tracking-[-0.02em]">{vendor.name}</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {vendor.walletAddress} · {vendor.category}
                  </p>
                </div>
                <StatusPill label={vendor.isBlocked ? "blocked" : vendor.isAllowlisted ? "approved" : "pending"} />
                <p className="text-sm font-medium text-[var(--muted)]">{vendor.asset}</p>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </AppShell>
  );
}
