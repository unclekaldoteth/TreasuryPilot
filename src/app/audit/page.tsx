import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/layout/section-card";
import { listAuditEvents } from "@/lib/audit/service";
import { refreshPendingTransactionStatuses } from "@/lib/wallet/refresh-transactions";

export const dynamic = "force-dynamic";

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

export default async function AuditPage() {
  await refreshPendingTransactionStatuses().catch(() => null);
  const auditEvents = await listAuditEvents();

  return (
    <AppShell
      title="Audit Trail"
      description="Every critical transition is persisted here. Pending transfers are refreshed on page load so the event stream reflects the latest known onchain state."
    >
      <SectionCard title="Event stream" eyebrow="Immutable app log">
        {auditEvents.length === 0 ? (
          <p className="text-sm leading-6 text-[var(--muted)]">
            No audit events recorded yet.
          </p>
        ) : (
          <div className="space-y-4">
            {auditEvents.map((event) => (
              <article
                key={event.id}
                className="grid gap-2 rounded-[1.2rem] border border-[var(--border)] bg-white/75 p-4 md:grid-cols-[180px_180px_1fr]"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--gold)]">
                  {event.eventType}
                </p>
                <p className="text-sm text-[var(--muted)]">{event.paymentRequestId}</p>
                <div className="space-y-1">
                  <p className="text-sm leading-6 text-[var(--ink)]">{event.summary}</p>
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
                    {formatTimestamp(event.createdAt)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </AppShell>
  );
}
