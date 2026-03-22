import { ArchitectureFlow } from "@/components/landing/architecture-flow";

export default function Home() {
  const highlights = [
    ["Decision pipeline", "Parse request -> enforce policy -> execute, escalate, or reject"],
    ["Current status", "Live WDK wallet flow, persisted treasury state, approvals, and audit history"],
    ["Roadmap", "Add one verified bridge route and extend into policy-aware treasury allocation"],
  ] as const;

  const pillars = [
    {
      title: "Agent layer",
      icon: "🤖",
      body: "Interprets treasury requests, normalizes intent, and explains the recommended action.",
    },
    {
      title: "Policy layer",
      icon: "🛡️",
      body: "Applies deterministic treasury rules before any money movement is allowed.",
    },
    {
      title: "Wallet layer",
      icon: "💳",
      body: "Runs server-side WDK wallet execution and tracks transaction status through confirmation.",
    },
  ] as const;

  return (
    <main className="min-h-screen px-6 py-8 md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="hero-shimmer relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--panel-strong)] shadow-[0_24px_80px_-48px_var(--shadow)] backdrop-blur">
          <div className="grid gap-8 px-6 py-8 md:grid-cols-[1.4fr_1fr] md:px-10 md:py-12">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full border border-[var(--border)] bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                Tether WDK Agent Wallets Track
              </div>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-[var(--ink)] md:text-6xl">
                  TreasuryPilot turns payment requests into policy-checked wallet actions.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-[var(--muted)] md:text-lg">
                  A self-custodial treasury agent for stablecoin operations. TreasuryPilot reads plain-language
                  requests, enforces deterministic treasury rules, and then executes, escalates, or rejects the
                  action through Tether WDK with a full audit trail.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  className="rounded-full bg-[var(--navy)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#10273c]"
                  href="/dashboard"
                >
                  Open Dashboard
                </a>
                <a
                  className="rounded-full border border-[var(--border)] bg-white/70 px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-white"
                  href="/payments"
                >
                  Review Payment Flow
                </a>
              </div>
            </div>
            <div className="grid gap-4">
              {highlights.map(([title, body]) => (
                <article
                  key={title}
                  className="rounded-[1.6rem] border border-[var(--border)] bg-white/70 p-5 shadow-[0_18px_44px_-36px_var(--shadow)]"
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--gold)]">{title}</p>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--panel)] px-6 py-6 shadow-[0_16px_38px_-30px_var(--shadow)] backdrop-blur md:px-10">
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            How TreasuryPilot works
          </p>
          <ArchitectureFlow />
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {pillars.map((item) => (
            <article
              key={item.title}
              className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_16px_38px_-30px_var(--shadow)] backdrop-blur"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{item.icon}</span>
                <h2 className="text-lg font-semibold tracking-[-0.02em]">{item.title}</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.body}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
