import { NextResponse } from "next/server";
import {
  createBridgeRequestId,
  createFailedBridgeTransactionRecord,
  executeBridgeIntent,
  getBridgeExecutionErrorStatus,
  getBridgeFeatureStatus,
  prepareBridgeRequest,
} from "@/lib/bridge/service";
import {
  createStoredBridgeRequest,
  listStoredBridgeRequests,
} from "@/lib/db/repositories/bridge-requests";
import { getEnv } from "@/lib/config/env";
import { isBridgeRequestPayload } from "@/lib/schemas/bridge";
import { refreshPendingTransactionStatuses } from "@/lib/wallet/refresh-transactions";

export const runtime = "nodejs";

export async function GET() {
  await refreshPendingTransactionStatuses().catch(() => null);

  return NextResponse.json({
    feature: getBridgeFeatureStatus(),
    requests: await listStoredBridgeRequests(),
  });
}

export async function POST(request: Request) {
  const body: unknown = await request.json();

  if (!isBridgeRequestPayload(body)) {
    return NextResponse.json({ error: "Invalid bridge request payload." }, { status: 400 });
  }

  const identifiers = createBridgeRequestId();
  const prepared = await prepareBridgeRequest({
    paymentRequestId: identifiers.paymentRequestId,
    rawRequest: body.rawRequest,
    requesterLabel: body.requesterLabel,
  });
  const feature = getBridgeFeatureStatus();
  const env = getEnv();
  let transaction = null;
  let approvalHash: string | undefined;
  let executionError: unknown = null;

  if (prepared.evaluation.decision === "execute") {
    try {
      const execution = await executeBridgeIntent({
        paymentRequestId: identifiers.paymentRequestId,
        sourceNetwork: prepared.intent.sourceNetwork,
        destinationNetwork: prepared.intent.destinationNetwork,
        recipientAddress: prepared.intent.recipientAddress,
        asset: prepared.intent.asset,
        amount: prepared.intent.amount,
      });

      transaction = execution.transaction;
      approvalHash = execution.approvalHash;
    } catch (error) {
      executionError = error;
      transaction = createFailedBridgeTransactionRecord(identifiers.paymentRequestId, error);
    }
  }

  const stored = await createStoredBridgeRequest({
    id: identifiers.paymentRequestId,
    rawRequest: body.rawRequest,
    requesterLabel: body.requesterLabel ?? "Treasury admin",
    requestSource: "human",
    bridgeRequestId: identifiers.bridgeRequestId,
    prepared,
    transaction,
    quote: prepared.quote,
    approvalHash,
    network: env.wdkBridgeSourceNetwork,
  });

  const response = {
    feature,
    paymentRequestId: stored.id,
    decision: prepared.evaluation.decision,
    reason: prepared.evaluation.reason,
    bridgeRequest: stored.bridgeRequestSummary,
    evaluation: stored.evaluation,
    quote: prepared.quote,
    transactions: stored.transactions,
    approvals: stored.approvals,
    auditEvents: stored.auditEvents,
    error: executionError instanceof Error ? executionError.message : undefined,
  };

  if (executionError) {
    return NextResponse.json(response, { status: getBridgeExecutionErrorStatus(executionError) });
  }

  return NextResponse.json(response);
}
