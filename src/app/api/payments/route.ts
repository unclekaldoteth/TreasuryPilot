import { NextResponse } from "next/server";
import { preparePaymentRequest } from "@/lib/agent/runtime";
import {
  createStoredPaymentRequest,
  listStoredPaymentRequests,
} from "@/lib/db/repositories/payment-requests";
import { getEnv } from "@/lib/config/env";
import { isPaymentRequestPayload } from "@/lib/schemas/payment";
import {
  createFailedTransactionRecord,
  getWalletTransferErrorStatus,
  transferAsset,
} from "@/lib/wallet/transfer-asset";
import { refreshPendingTransactionStatuses } from "@/lib/wallet/refresh-transactions";
import { createId } from "@/lib/utils/ids";

export const runtime = "nodejs";

function shouldRefresh(request: Request) {
  const { searchParams } = new URL(request.url);
  return searchParams.get("refresh") === "true";
}

export async function GET(request: Request) {
  if (shouldRefresh(request)) {
    await refreshPendingTransactionStatuses().catch(() => null);
  }

  const payments = await listStoredPaymentRequests();
  return NextResponse.json({ payments });
}

export async function POST(request: Request) {
  const body: unknown = await request.json();

  if (!isPaymentRequestPayload(body)) {
    return NextResponse.json({ error: "Invalid payment request payload." }, { status: 400 });
  }

  const prepared = await preparePaymentRequest(body.rawRequest);
  const paymentRequestId = createId("req");
  const requestSource = "human";
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
    rawRequest: body.rawRequest,
    requesterLabel: body.requesterLabel ?? "Treasury admin",
    requestSource,
    prepared,
    transaction,
    network: env.wdkNetwork,
  });

  const response = {
    paymentRequest: stored?.paymentRequest ?? null,
    intent: stored?.intent ?? prepared.intent,
    evaluation: stored?.evaluation ?? prepared.evaluation,
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
