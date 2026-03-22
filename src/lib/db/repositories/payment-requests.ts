import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db/client";
import type {
  AuditEvent,
  PaymentIntent,
  PaymentRequestRecord,
  PolicyEvaluation,
  RequestSource,
  TransactionRecord,
} from "@/lib/types";
import { formatAssetAmount } from "@/lib/utils/money";

const paymentRequestInclude = {
  paymentIntent: true,
  evaluation: true,
  approvals: true,
  transactions: true,
  auditEvents: true,
  bridgeRequest: true,
  sourceAgent: true,
} satisfies Prisma.PaymentRequestInclude;

type StoredPaymentRequest = Prisma.PaymentRequestGetPayload<{
  include: typeof paymentRequestInclude;
}>;

export type RefreshableTransactionRecord = {
  id: string;
  paymentRequestId: string;
  txHash: string;
  txStatus: "submitted";
};

function toSummary(record: StoredPaymentRequest): PaymentRequestRecord {
  const amount = record.paymentIntent
    ? formatAssetAmount(record.paymentIntent.amount, record.paymentIntent.asset)
    : record.bridgeRequest
      ? formatAssetAmount(record.bridgeRequest.amount, record.bridgeRequest.asset)
      : "n/a";

  const recipient = record.paymentIntent?.vendorName
    ? record.paymentIntent.vendorName
    : record.bridgeRequest
      ? `${record.bridgeRequest.sourceNetwork} -> ${record.bridgeRequest.destinationNetwork}`
      : record.rawRequest;

  return {
    id: record.id,
    rawRequest: record.rawRequest,
    requestSource: record.requestSource as RequestSource,
    sourceAgentId: record.sourceAgentId ?? undefined,
    status: record.status as PaymentRequestRecord["status"],
    decision: (record.evaluation?.decision ?? "reject") as PaymentRequestRecord["decision"],
    rationale: record.evaluation?.decisionReason ?? "No policy evaluation stored.",
    amount,
    recipient,
    createdAt: record.createdAt.toISOString(),
  };
}

function toAuditEvent(record: StoredPaymentRequest["auditEvents"][number]): AuditEvent {
  let summary = record.eventType;

  try {
    const parsed = JSON.parse(record.payloadJson) as { summary?: string };
    summary = parsed.summary ?? summary;
  } catch {
    summary = record.payloadJson;
  }

  return {
    id: record.id,
    eventType: record.eventType,
    paymentRequestId: record.paymentRequestId,
    summary,
    createdAt: record.createdAt.toISOString(),
  };
}

function buildAuditEvents(input: {
  rawRequest: string;
  decision: string;
  decisionReason: string;
  transaction?: TransactionRecord | null;
}) {
  const events = [
    {
      eventType: "request_received",
      payloadJson: JSON.stringify({
        summary: `Request stored: ${input.rawRequest}`,
      }),
    },
    {
      eventType: "policy_evaluated",
      payloadJson: JSON.stringify({
        summary: `${input.decision.toUpperCase()}: ${input.decisionReason}`,
      }),
    },
  ];

  if (input.decision === "escalate") {
    events.push({
      eventType: "approval_requested",
      payloadJson: JSON.stringify({
        summary: "Request escalated for treasury review.",
      }),
    });
  }

  if (input.transaction) {
    const hasHash = Boolean(input.transaction.txHash);
    const isFailure = input.transaction.status === "failed";

    events.push({
      eventType: isFailure ? "execution_failed" : "execution_submitted",
      payloadJson: JSON.stringify({
        summary: isFailure
          ? `Execution failed: ${input.transaction.error ?? "Unknown transfer error."}`
          : hasHash
            ? `Transaction submitted with hash ${input.transaction.txHash}.`
            : "Transaction submitted.",
      }),
    });
  }

  return events;
}

function resolvePaymentRequestStatus(
  decision: PolicyEvaluation["decision"],
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

export async function createStoredPaymentRequest(input: {
  id: string;
  rawRequest: string;
  requesterLabel?: string;
  requestSource: RequestSource;
  sourceAgentId?: string;
  prepared: {
    intent: PaymentIntent;
    evaluation: PolicyEvaluation;
    summary: {
      headline: string;
      explanation: string;
    };
  };
  transaction?: TransactionRecord | null;
  network: string;
}) {
  const status = resolvePaymentRequestStatus(input.prepared.evaluation.decision, input.transaction);

  await db.paymentRequest.create({
    data: {
      id: input.id,
      rawRequest: input.rawRequest,
      requester: input.requesterLabel,
      requestSource: input.requestSource,
      sourceAgentId: input.sourceAgentId,
      status,
      paymentIntent: {
        create: {
          recipientAddress: input.prepared.intent.recipientAddress,
          vendorName: input.prepared.intent.recipientName,
          asset: input.prepared.intent.asset,
          amount: input.prepared.intent.amount,
          category: input.prepared.intent.category,
          reasonSummary: input.prepared.summary.explanation,
          llmConfidence: input.prepared.intent.confidence,
        },
      },
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
      auditEvents: {
        create: buildAuditEvents({
          rawRequest: input.rawRequest,
          decision: input.prepared.evaluation.decision,
          decisionReason: input.prepared.evaluation.reason,
          transaction: input.transaction,
        }),
      },
    },
  });

  return getStoredPaymentRequestById(input.id);
}

export async function listStoredPaymentRequests() {
  const records = await db.paymentRequest.findMany({
    include: paymentRequestInclude,
    orderBy: {
      createdAt: "desc",
    },
  });

  return records.map(toSummary);
}

export async function getStoredPaymentRequestById(id: string) {
  const record = await db.paymentRequest.findUnique({
    where: {
      id,
    },
    include: paymentRequestInclude,
  });

  if (!record) {
    return null;
  }

  return {
    paymentRequest: toSummary(record),
    intent: record.paymentIntent,
    evaluation: record.evaluation
      ? {
          decision: record.evaluation.decision,
          reason: record.evaluation.decisionReason,
          results: JSON.parse(record.evaluation.ruleResultsJson) as PolicyEvaluation["results"],
        }
      : null,
    sourceAgent: record.sourceAgent,
    bridgeRequest: record.bridgeRequest,
    approvals: record.approvals,
    transactions: record.transactions,
    auditEvents: record.auditEvents.map(toAuditEvent),
  };
}

export async function listRefreshableTransactions(
  paymentRequestId?: string,
): Promise<RefreshableTransactionRecord[]> {
  const transactions = await db.transaction.findMany({
    where: {
      txStatus: "submitted",
      txHash: {
        not: null,
      },
      ...(paymentRequestId
        ? {
            paymentRequestId,
          }
        : {}),
    },
    select: {
      id: true,
      paymentRequestId: true,
      txHash: true,
      txStatus: true,
    },
    orderBy: {
      submittedAt: "desc",
    },
  });

  return transactions
    .filter((transaction): transaction is RefreshableTransactionRecord => Boolean(transaction.txHash))
    .map((transaction) => ({
      id: transaction.id,
      paymentRequestId: transaction.paymentRequestId,
      txHash: transaction.txHash,
      txStatus: "submitted" as const,
    }));
}

export async function updateStoredTransactionLifecycle(input: {
  transactionId: string;
  paymentRequestId: string;
  nextStatus: "confirmed" | "failed";
  summary?: string;
}) {
  return db.$transaction(async (transactionDb) => {
    const currentTransaction = await transactionDb.transaction.findUnique({
      where: {
        id: input.transactionId,
      },
    });

    if (!currentTransaction || currentTransaction.txStatus !== "submitted") {
      return null;
    }

    const paymentRequest = await transactionDb.paymentRequest.findUnique({
      where: {
        id: input.paymentRequestId,
      },
      include: {
        bridgeRequest: true,
      },
    });

    const paymentRequestStatus = input.nextStatus === "confirmed" ? "executed" : "failed";
    const eventType = input.nextStatus === "confirmed" ? "execution_confirmed" : "execution_failed";
    const summary =
      input.summary ??
      (input.nextStatus === "confirmed"
        ? "Transaction confirmed onchain."
        : "Transaction failed during onchain execution.");

    const updatedTransaction = await transactionDb.transaction.update({
      where: {
        id: input.transactionId,
      },
      data: {
        txStatus: input.nextStatus,
        confirmedAt: input.nextStatus === "confirmed" ? new Date() : null,
      },
    });

    await transactionDb.paymentRequest.update({
      where: {
        id: input.paymentRequestId,
      },
      data: {
        status: paymentRequestStatus,
        auditEvents: {
          create: {
            eventType,
            payloadJson: JSON.stringify({
              summary,
            }),
          },
        },
      },
    });

    if (paymentRequest?.bridgeRequest) {
      await transactionDb.bridgeRequest.update({
        where: {
          id: paymentRequest.bridgeRequest.id,
        },
        data: {
          bridgeStatus: input.nextStatus === "confirmed" ? "confirmed" : "failed",
        },
      });
    }

    return updatedTransaction;
  });
}

export async function listStoredAuditEvents() {
  const records = await db.auditEvent.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return records.map((record) => {
    let summary = record.eventType;

    try {
      const parsed = JSON.parse(record.payloadJson) as { summary?: string };
      summary = parsed.summary ?? summary;
    } catch {
      summary = record.payloadJson;
    }

    return {
      id: record.id,
      eventType: record.eventType,
      paymentRequestId: record.paymentRequestId,
      summary,
      createdAt: record.createdAt.toISOString(),
    } satisfies AuditEvent;
  });
}
