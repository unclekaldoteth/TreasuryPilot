import { AppShell } from "@/components/layout/app-shell";
import { ApprovalQueue } from "@/components/approvals/approval-queue";
import { listApprovals } from "@/lib/approvals/service";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const approvals = await listApprovals();

  return (
    <AppShell
      title="Approval Queue"
      description="Escalated requests land here for a single human sign-off step. Approvals and rejections are written back to the live treasury state."
    >
      <ApprovalQueue initialApprovals={approvals} />
    </AppShell>
  );
}
