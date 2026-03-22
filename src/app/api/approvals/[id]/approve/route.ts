import { NextResponse } from "next/server";
import { approveApproval, getApprovalById } from "@/lib/approvals/service";
import {
  executeBridgeIntent,
  getBridgeExecutionErrorStatus,
} from "@/lib/bridge/service";
import { getEnv } from "@/lib/config/env";
import { getWalletTransferErrorStatus, transferAsset } from "@/lib/wallet/transfer-asset";

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

  const paymentIntent = approval.paymentRequest.paymentIntent;
  const bridgeRequest = approval.paymentRequest.bridgeRequest;

  if (!paymentIntent && !bridgeRequest) {
    return NextResponse.json(
      { error: "Approval cannot be executed without a stored intent." },
      { status: 400 },
    );
  }

  const review = await readReviewPayload(request);
  let transaction;

  try {
    transaction = paymentIntent
      ? await transferAsset({
          paymentRequestId: approval.paymentRequest.id,
          recipientAddress: paymentIntent.recipientAddress,
          asset: paymentIntent.asset,
          amount: paymentIntent.amount,
        })
      : (
          await executeBridgeIntent({
            paymentRequestId: approval.paymentRequest.id,
            sourceNetwork: bridgeRequest!.sourceNetwork,
            destinationNetwork: bridgeRequest!.destinationNetwork,
            recipientAddress: bridgeRequest!.recipientAddress,
            asset: bridgeRequest!.asset,
            amount: bridgeRequest!.amount,
          })
        ).transaction;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Wallet execution failed.",
      },
      {
        status: paymentIntent
          ? getWalletTransferErrorStatus(error)
          : getBridgeExecutionErrorStatus(error),
      },
    );
  }

  const env = getEnv();
  const resolvedApproval = await approveApproval({
    approvalId: id,
    reviewerLabel: review.reviewerLabel ?? "Treasury admin",
    reviewNotes: review.reviewNotes,
    network: paymentIntent ? env.wdkNetwork : env.wdkBridgeSourceNetwork,
    transaction,
  });

  if (!resolvedApproval) {
    return NextResponse.json({ error: "Approval not found." }, { status: 404 });
  }

  return NextResponse.json({
    approval: resolvedApproval.approval,
    paymentRequestId: resolvedApproval.paymentRequestId,
    transaction: resolvedApproval.transaction,
  });
}
