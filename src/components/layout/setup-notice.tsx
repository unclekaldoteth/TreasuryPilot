type SetupNoticeProps = {
  title?: string;
  summary: string;
  details?: string;
};

export function SetupNotice({
  title = "App setup required",
  summary,
  details,
}: SetupNoticeProps) {
  return (
    <section className="rounded-[1.6rem] border border-[var(--rose)] bg-[rgba(136,63,63,0.08)] p-5 shadow-[0_18px_44px_-36px_var(--shadow)] backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rose)]">Runtime status</p>
      <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">{title}</h2>
      <p className="mt-4 text-sm leading-6 text-[var(--ink)]">{summary}</p>
      {details ? <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{details}</p> : null}
      <div className="mt-4 rounded-[1.2rem] border border-[var(--border)] bg-white/70 p-4 text-sm leading-6 text-[var(--muted)]">
        <p>Required fixes:</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Set `DATABASE_URL` and `APP_ENCRYPTION_KEY` in the deployment environment.</li>
          <li>Run `npm run db:migrate` against the deployed Postgres database.</li>
          <li>Run `npm run db:seed` if you want the default treasury policy and demo vendors preloaded.</li>
        </ol>
      </div>
    </section>
  );
}
