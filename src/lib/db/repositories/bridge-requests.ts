import { db } from "@/lib/db/client";
import type { BridgePreparedRequest } from "@/lib/bridge/types";
import type { BridgeQuote, RequestSource, TransactionRecord } from "@/lib/types";
import { formatAssetAmount } from "@/lib/utils/money";

function resolveBridgeRequestStatus(
  decision: "execute" | "escalate" | "reject",
  transaction?: TransactionRecord | null,
) {
  if (decision === "reject") {
    return "rejected";
  }

  if (decision === "escalate") {
    return "escalated";
  }

  if (!transaction) {
    return "received";
  }

  if (transaction.status === "confirmed") {
    return "executed";
  }

  if (transaction.status === "failed") {
    return "failed";
  }

  return "executing";
}

function resolveBridgeLifecycleStatus(
  decision: "execute" | "escalate" | "reject",
  transaction?: TransactionRecord | null,
) {
  if (decision === "reject") {
    return "unsupported";
  }

  if (decision === "escalate") {
    return "planned";
  }

  if (!transaction) {
    return "planned";
  }

  if (transaction.status === "confirmed") {
    return "confirmed";
  }

  if (transaction.status === "failed") {
    return "failed";
  }

  return "submitted";
}

function buildBridgeAuditEvents(input: {
  rawRequest: string;
  decision: "execute" | "escalate" | "reject";
  reason: string;
  quote?: BridgeQuote | null;
  transaction?: TransactionRecord | null;
  approvalHash?: string;
}) {
  const events = [
    {
      eventType: "request_received",
      payloadJson: JSON.stringify({
        summary: `Bridge request stored: ${input.rawRequest}`,
      }),
    },
    {
      eventType: "policy_evaluated",
      payloadJson: JSON.stringify({
        summary: `${input.decision.toUpperCase()}: ${input.reason}`,
      }),
    },
  ];

  if (input.quote) {
    events.push({
      eventType: "bridge_quoted",
      payloadJson: JSON.stringify({
        summary: `Bridge quote prepared. Total fee ${input.quote.totalFeeWei} wei.`,
      }),
    });
  }

  if (input.decision === "escalate") {
    events.push({
      eventType: "approval_requested",
      payloadJson: JSON.stringify({
        summary: "Bridge request escalated for treasury review.",
      }),
    });
  }

  if (input.approvalHash) {
    events.push({
      eventType: "bridge_allowance_submitted",
      payloadJson: JSON.stringify({
        summary: `Bridge allowance approval submitted with hash ${input.approvalHash}.`,
      }),
    });
  }

  if (input.transaction) {
    const isFailure = input.transaction.status === "failed";

    events.push({
      eventType: isFailure ? "execution_failed" : "execution_submitted",
      payloadJson: JSON.stringify({
        summary: isFailure
          ? `Bridge execution failed: ${input.transaction.error ?? "Unknown bridge error."}`
          : input.transaction.txHash
            ? `Bridge submitted with hash ${input.transaction.txHash}.`
            : "Bridge submitted.",
      }),
    });
  }

  return events;
}

export async function createStoredBridgeRequest(input: {
  id: string;
  rawRequest: string;
  requesterLabel?: string;
  requestSource: RequestSource;
  sourceAgentId?: string;
  bridgeRequestId: string;
  prepared: BridgePreparedRequest;
  transaction?: TransactionRecord | null;
  quote?: BridgeQuote | null;
  approvalHash?: string;
  network: string;
}) {
  const paymentStatus = resolveBridgeRequestStatus(input.prepared.evaluation.decision, input.transaction);
  const bridgeStatus = resolveBridgeLifecycleStatus(input.prepared.evaluation.decision, input.transaction);

  const created = await db.paymentRequest.create({
    data: {
      id: input.id,
      rawRequest: input.rawRequest,
      requester: input.requesterLabel,
      requestSource: input.requestSource,
      sourceAgentId: input.sourceAgentId,
      status: paymentStatus,
      evaluation: {
        create: {
          decision: input.prepared.evaluation.decision,
          decisionReason: input.prepared.evaluation.reason,
          ruleResultsJson: JSON.stringify(input.prepared.evaluation.results),
        },
      },
      approvals:
        input.prepared.evaluation.decision === "escalate"
          ? {
              create: {
                status: "pending",
              },
            }
          : undefined,
      transactions: input.transaction
        ? {
            create: {
              network: input.network,
              asset: input.prepared.intent.asset,
              amount: input.prepared.intent.amount,
              txHash: input.transaction.txHash,
              txStatus: input.transaction.status,
              submittedAt: input.transaction.txHash ? new Date() : null,
            },
          }
        : undefined,
      bridgeRequest: {
        create: {
          id: input.bridgeRequestId,
          sourceNetwork: input.prepared.intent.sourceNetwork,
          destinationNetwork: input.prepared.intent.destinationNetwork,
          recipientAddress: input.prepared.intent.recipientAddress,
          asset: input.prepared.intent.asset,
          amount: input.prepared.intent.amount,
          purpose: input.prepared.intent.purpose,
          bridgeStatus,
        },
      },
      auditEvents: {
        create: buildBridgeAuditEvents({
          rawRequest: input.rawRequest,
          decision: input.prepared.evaluation.decision,
          reason: input.prepared.evaluation.reason,
          quote: input.quote,
          transaction: input.transaction,
          approvalHash: input.approvalHash,
        }),
      },
    },
    include: {
      evaluation: true,
      bridgeRequest: true,
      approvals: true,
      transactions: true,
      auditEvents: true,
    },
  });

  return {
    ...created,
    approvals: created.approvals,
    transactions: created.transactions,
    auditEvents: created.auditEvents,
    bridgeRequestSummary: {
      id: created.bridgeRequest?.id ?? input.bridgeRequestId,
      paymentRequestId: created.id,
      sourceNetwork: input.prepared.intent.sourceNetwork,
      destinationNetwork: input.prepared.intent.destinationNetwork,
      recipientAddress: input.prepared.intent.recipientAddress,
      asset: input.prepared.intent.asset,
      amount: formatAssetAmount(input.prepared.intent.amount, input.prepared.intent.asset),
      purpose: input.prepared.intent.purpose,
      status: bridgeStatus,
    },
  };
}

export async function listStoredBridgeRequests() {
  const requests = await db.bridgeRequest.findMany({
    include: {
      paymentRequest: {
        include: {
          evaluation: true,
          transactions: true,
          approvals: true,
          auditEvents: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return requests.map((record) => ({
    id: record.id,
    paymentRequestId: record.paymentRequestId,
    sourceNetwork: record.sourceNetwork,
    destinationNetwork: record.destinationNetwork,
    recipientAddress: record.recipientAddress,
    asset: record.asset,
    amount: formatAssetAmount(record.amount, record.asset),
    purpose: record.purpose,
    status: record.bridgeStatus as
      | "disabled"
      | "planned"
      | "unsupported"
      | "submitted"
      | "confirmed"
      | "failed",
  }));
}

export async function getStoredBridgeRequestById(id: string) {
  const paymentRequest = await db.paymentRequest.findFirst({
    where: {
      bridgeRequest: {
        id,
      },
    },
    include: {
      evaluation: true,
      sourceAgent: true,
      bridgeRequest: true,
      approvals: true,
      transactions: true,
      auditEvents: true,
    },
  });

  if (!paymentRequest?.bridgeRequest) {
    return null;
  }

  return {
    ...paymentRequest.bridgeRequest,
    paymentRequest: {
      id: paymentRequest.id,
      rawRequest: paymentRequest.rawRequest,
      requester: paymentRequest.requester,
      requestSource: paymentRequest.requestSource,
      sourceAgentId: paymentRequest.sourceAgentId,
      status: paymentRequest.status,
      createdAt: paymentRequest.createdAt,
      evaluation: paymentRequest.evaluation,
      sourceAgent: paymentRequest.sourceAgent,
    },
    approvals: paymentRequest.approvals,
    transactions: paymentRequest.transactions,
    auditEvents: paymentRequest.auditEvents,
  };
}
