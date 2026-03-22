import { NextResponse } from "next/server";
import { getApprovalById, rejectApproval } from "@/lib/approvals/service";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export const runtime = "nodejs";

async function readReviewPayload(request: Request) {
  try {
    const payload = (await request.json()) as {
      reviewerLabel?: string;
      reviewNotes?: string;
    };

    return payload;
  } catch {
    return {};
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await Promise.resolve(context.params);
  const approval = await getApprovalById(id);

  if (!approval) {
    return NextResponse.json({ error: "Approval not found." }, { status: 404 });
  }

  const review = await readReviewPayload(request);
  const resolvedApproval = await rejectApproval({
    approvalId: id,
    reviewerLabel: review.reviewerLabel ?? "Treasury admin",
    reviewNotes: review.reviewNotes,
  });

  if (!resolvedApproval) {
    return NextResponse.json({ error: "Approval not found." }, { status: 404 });
  }

  return NextResponse.json({
    approval: resolvedApproval.approval,
    paymentRequestId: resolvedApproval.paymentRequestId,
  });
}
