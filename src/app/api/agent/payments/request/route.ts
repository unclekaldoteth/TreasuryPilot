import { NextResponse } from "next/server";
import { preparePaymentRequest } from "@/lib/agent/runtime";
import {
  authenticateAgentClient,
  getAgentGatewayStatus,
  normalizeAgentPaymentRequest,
} from "@/lib/agent-gateway/service";
import { getEnv } from "@/lib/config/env";
import { createStoredPaymentRequest } from "@/lib/db/repositories/payment-requests";
import { isAgentPaymentRequestPayload } from "@/lib/schemas/agent";
import {
  createFailedTransactionRecord,
  getWalletTransferErrorStatus,
  transferAsset,
} from "@/lib/wallet/transfer-asset";
import { createId } from "@/lib/utils/ids";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getAgentGatewayStatus());
}

export async function POST(request: Request) {
  const body: unknown = await request.json();

  if (!isAgentPaymentRequestPayload(body)) {
    return NextResponse.json({ error: "Invalid agent payment request payload." }, { status: 400 });
  }

  const authResult = await authenticateAgentClient(body.authToken);

  if (!authResult.ok || !authResult.agentClient) {
    return NextResponse.json(
      {
        error: authResult.reason,
        ...getAgentGatewayStatus(),
      },
      { status: authResult.status },
    );
  }

  const normalized = normalizeAgentPaymentRequest(body, authResult.agentClient);
  const prepared = await preparePaymentRequest(normalized.rawRequest);
  const paymentRequestId = createId("req");
  const env = getEnv();
  let transaction = null;
  let executionError: unknown = null;

  if (prepared.evaluation.decision === "execute") {
    try {
      transaction = await transferAsset({
        paymentRequestId,
        recipientAddress: prepared.intent.recipientAddress,
        asset: prepared.intent.asset,
        amount: prepared.intent.amount,
      });
    } catch (error) {
      executionError = error;
      transaction = createFailedTransactionRecord(paymentRequestId, error);
    }
  }

  const stored = await createStoredPaymentRequest({
    id: paymentRequestId,
    rawRequest: normalized.rawRequest,
    requesterLabel: normalized.requesterLabel,
    requestSource: normalized.requestSource,
    sourceAgentId: normalized.sourceAgentId,
    prepared,
    transaction,
    network: env.wdkNetwork,
  });

  const response = {
    paymentRequest: stored?.paymentRequest ?? null,
    intent: stored?.intent ?? prepared.intent,
    evaluation: stored?.evaluation ?? prepared.evaluation,
    sourceAgent: stored?.sourceAgent ?? authResult.agentClient,
    approvals: stored?.approvals ?? [],
    transactions: stored?.transactions ?? [],
    auditEvents: stored?.auditEvents ?? [],
    error: executionError instanceof Error ? executionError.message : undefined,
  };

  if (executionError) {
    return NextResponse.json(response, { status: getWalletTransferErrorStatus(executionError) });
  }

  return NextResponse.json(response);
}
