import Link from "next/link";
import { ReactNode } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { KeyboardShortcuts } from "@/components/ui/keyboard-shortcuts";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/policy", label: "Policy" },
  { href: "/payments", label: "Payments" },
  { href: "/bridges", label: "Bridges" },
  { href: "/approvals", label: "Approvals" },
  { href: "/audit", label: "Audit" },
];

export function AppShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen px-6 py-8 md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-[2rem] border border-[var(--border)] bg-[var(--panel-strong)] px-6 py-5 shadow-[0_22px_60px_-44px_var(--shadow)] backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <Link
                href="/"
                className="inline-flex items-center rounded-full border border-[var(--border)] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]"
              >
                TreasuryPilot
              </Link>
              <div>
                <h1 className="text-3xl font-semibold tracking-[-0.04em] md:text-4xl">{title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] md:text-base">{description}</p>
              </div>
            </div>
            <nav className="flex flex-wrap items-center gap-2">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--panel-strong)]"
                >
                  {item.label}
                </Link>
              ))}
              <ThemeToggle />
            </nav>
          </div>
        </header>

        {children}
        <KeyboardShortcuts />
      </div>
    </main>
  );
}
