"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen px-6 py-8 md:px-10">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-[var(--rose)] bg-[rgba(136,63,63,0.08)] p-8 shadow-[0_24px_80px_-48px_var(--shadow)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--rose)]">Runtime error</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
          This page is temporarily unavailable.
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--ink)]">
          The route hit an uncaught server error. In deployed environments, this usually means the database
          connection, migration state, or seed data is incomplete.
        </p>
        {error.digest ? (
          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            Error digest: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full bg-[var(--navy)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#10273c]"
          >
            Retry
          </button>
          <Link
            href="/"
            className="rounded-full border border-[var(--border)] bg-white/80 px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-white"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
