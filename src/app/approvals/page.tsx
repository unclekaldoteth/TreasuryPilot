import { AppShell } from "@/components/layout/app-shell";
import { SetupNotice } from "@/components/layout/setup-notice";
import { ApprovalQueue } from "@/components/approvals/approval-queue";
import { getMissingEnvKeys } from "@/lib/config/env";
import { listApprovals } from "@/lib/approvals/service";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  try {
    const approvals = await listApprovals();

    return (
      <AppShell
        title="Approval Queue"
        description="Escalated requests land here for a single human sign-off step. Approvals and rejections are written back to the live treasury state."
      >
        <ApprovalQueue initialApprovals={approvals} />
      </AppShell>
    );
  } catch (error) {
    const missingEnvKeys = getMissingEnvKeys();
    const details =
      missingEnvKeys.length > 0
        ? `Missing environment variables: ${missingEnvKeys.join(", ")}.`
        : error instanceof Error
          ? error.message
          : "The deployment could not read approvals from Postgres.";

    return (
      <AppShell
        title="Approval Queue"
        description="Escalated requests land here for a single human sign-off step."
      >
        <SetupNotice
          title="Approvals unavailable"
          summary="This page needs a working Postgres connection before it can load escalated requests."
          details={details}
        />
      </AppShell>
    );
  }
}
