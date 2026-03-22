import { ReactNode } from "react";

export function SectionCard({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.6rem] border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_18px_44px_-36px_var(--shadow)] backdrop-blur">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gold)]">{eyebrow}</p>
      ) : null}
      <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
