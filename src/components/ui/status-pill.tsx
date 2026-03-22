const toneMap = {
  execute: "bg-[rgba(31,143,98,0.12)] text-[var(--mint)]",
  executed: "bg-[rgba(31,143,98,0.12)] text-[var(--mint)]",
  approved: "bg-[rgba(31,143,98,0.12)] text-[var(--mint)]",
  confirmed: "bg-[rgba(31,143,98,0.12)] text-[var(--mint)]",
  connected: "bg-[rgba(31,143,98,0.12)] text-[var(--mint)]",
  enabled: "bg-[rgba(31,143,98,0.12)] text-[var(--mint)]",
  live: "bg-[rgba(31,143,98,0.12)] text-[var(--mint)]",
  escalate: "bg-[rgba(183,133,18,0.14)] text-[var(--gold)]",
  escalated: "bg-[rgba(183,133,18,0.14)] text-[var(--gold)]",
  pending: "bg-[rgba(183,133,18,0.14)] text-[var(--gold)]",
  executing: "bg-[rgba(183,133,18,0.14)] text-[var(--gold)]",
  submitted: "bg-[rgba(183,133,18,0.14)] text-[var(--gold)]",
  planned: "bg-[rgba(183,133,18,0.14)] text-[var(--gold)]",
  reject: "bg-[rgba(182,74,74,0.12)] text-[var(--rose)]",
  rejected: "bg-[rgba(182,74,74,0.12)] text-[var(--rose)]",
  failed: "bg-[rgba(182,74,74,0.12)] text-[var(--rose)]",
  blocked: "bg-[rgba(182,74,74,0.12)] text-[var(--rose)]",
  disabled: "bg-[rgba(182,74,74,0.12)] text-[var(--rose)]",
  unsupported: "bg-[rgba(182,74,74,0.12)] text-[var(--rose)]",
  stub: "bg-black/5 text-[var(--muted)]",
  "demo-safe": "bg-black/5 text-[var(--muted)]",
  received: "bg-black/5 text-[var(--muted)]",
} as const;

type KnownTone = keyof typeof toneMap;

export function StatusPill({ label }: { label: string }) {
  const tone = toneMap[(label.toLowerCase() as KnownTone) ?? "pending"] ?? "bg-black/5 text-[var(--muted)]";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${tone}`}>
      {label}
    </span>
  );
}
