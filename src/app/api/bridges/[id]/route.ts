import { NextResponse } from "next/server";
import { getStoredBridgeRequestById } from "@/lib/db/repositories/bridge-requests";
import { getBridgeFeatureStatus } from "@/lib/bridge/service";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await Promise.resolve(context.params);
  const bridgeRequest = await getStoredBridgeRequestById(id);

  if (!bridgeRequest) {
    return NextResponse.json({ error: "Bridge request not found." }, { status: 404 });
  }

  return NextResponse.json({
    feature: getBridgeFeatureStatus(),
    bridgeRequest: {
      id: bridgeRequest.id,
      paymentRequestId: bridgeRequest.paymentRequestId,
      sourceNetwork: bridgeRequest.sourceNetwork,
      destinationNetwork: bridgeRequest.destinationNetwork,
      recipientAddress: bridgeRequest.recipientAddress,
      asset: bridgeRequest.asset,
      amount: bridgeRequest.amount,
      purpose: bridgeRequest.purpose,
      status: bridgeRequest.bridgeStatus,
    },
    paymentRequest: bridgeRequest.paymentRequest,
    approvals: bridgeRequest.approvals,
    transactions: bridgeRequest.transactions,
    auditEvents: bridgeRequest.auditEvents,
  });
}
