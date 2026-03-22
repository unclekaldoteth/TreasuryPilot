import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db/client";
import type { ApprovalRecord, TransactionRecord } from "@/lib/types";
import { formatAssetAmount } from "@/lib/utils/money";

const approvalInclude = {
  paymentRequest: {
    include: {
      paymentIntent: true,
      bridgeRequest: true,
      evaluation: true,
      transactions: true,
      sourceAgent: true,
    },
  },
} satisfies Prisma.ApprovalInclude;

type StoredApproval = Prisma.ApprovalGetPayload<{
  include: typeof approvalInclude;
}>;

function toApprovalRecord(record: StoredApproval): ApprovalRecord {
  const intent = record.paymentRequest.paymentIntent;
  const bridgeRequest = record.paymentRequest.bridgeRequest;
  const evaluation = record.paymentRequest.evaluation;
  const vendor = intent
    ? intent.vendorName
    : bridgeRequest
      ? `${bridgeRequest.sourceNetwork} -> ${bridgeRequest.destinationNetwork}`
      : "Unresolved recipient";
  const amount = intent
    ? formatAssetAmount(intent.amount, intent.asset)
    : bridgeRequest
      ? formatAssetAmount(bridgeRequest.amount, bridgeRequest.asset)
      : "n/a";

  return {
    id: record.id,
    paymentRequestId: record.paymentRequestId,
    vendor,
    amount,
    reason: evaluation?.decisionReason ?? "Pending human review.",
    requestedAt: record.createdAt.toISOString(),
    status: record.status as ApprovalRecord["status"],
  };
}

export async function listStoredApprovals() {
  const approvals = await db.approval.findMany({
    include: approvalInclude,
    orderBy: {
      createdAt: "desc",
    },
  });

  return approvals.map(toApprovalRecord);
}

export async function getStoredApprovalById(id: string) {
  const approval = await db.approval.findUnique({
    where: {
      id,
    },
    include: approvalInclude,
  });

  if (!approval) {
    return null;
  }

  return {
    approval: toApprovalRecord(approval),
    paymentRequest: approval.paymentRequest,
  };
}

export async function approveStoredApproval(input: {
  approvalId: string;
  reviewerLabel?: string;
  reviewNotes?: string;
  network: string;
  transaction: TransactionRecord;
}) {
  return db.$transaction(async (transactionDb) => {
    const approval = await transactionDb.approval.findUnique({
      where: {
        id: input.approvalId,
      },
      include: approvalInclude,
    });

    if (!approval) {
      return null;
    }

    const paymentIntent = approval.paymentRequest.paymentIntent;
    const bridgeRequest = approval.paymentRequest.bridgeRequest;

    if (!paymentIntent && !bridgeRequest) {
      throw new Error("Approval cannot be executed without a stored intent.");
    }

    const asset = paymentIntent?.asset ?? bridgeRequest?.asset ?? "USDt";
    const amount = paymentIntent?.amount ?? bridgeRequest?.amount ?? 0;
    const bridgeStatus =
      bridgeRequest && input.transaction.status === "confirmed"
        ? "confirmed"
        : bridgeRequest && input.transaction.status === "failed"
          ? "failed"
          : bridgeRequest
            ? "submitted"
            : undefined;

    const nextStatus =
      input.transaction.status === "confirmed"
        ? "executed"
        : input.transaction.status === "failed"
          ? "failed"
          : "executing";

    const updatedApproval = await transactionDb.approval.update({
      where: {
        id: input.approvalId,
      },
      data: {
        status: "approved",
        reviewerLabel: input.reviewerLabel,
        reviewNotes: input.reviewNotes,
      },
    });

    await transactionDb.paymentRequest.update({
      where: {
        id: approval.paymentRequestId,
      },
      data: {
        status: nextStatus,
        transactions: {
          create: {
            network: input.network,
            asset,
            amount,
            txHash: input.transaction.txHash,
            txStatus: input.transaction.status,
            submittedAt: input.transaction.txHash ? new Date() : null,
            confirmedAt: input.transaction.status === "confirmed" ? new Date() : null,
          },
        },
        bridgeRequest: bridgeStatus
          ? {
              update: {
                bridgeStatus,
              },
            }
          : undefined,
        auditEvents: {
          create: [
            {
              eventType: "approval_resolved",
              payloadJson: JSON.stringify({
                summary: `Approval granted by ${input.reviewerLabel ?? "treasury reviewer"}.`,
              }),
            },
            {
              eventType:
                input.transaction.status === "failed" ? "execution_failed" : "execution_submitted",
              payloadJson: JSON.stringify({
                summary:
                  input.transaction.status === "failed"
                    ? `Execution failed: ${input.transaction.error ?? "Unknown transfer error."}`
                    : input.transaction.txHash
                      ? `Transaction submitted with hash ${input.transaction.txHash}.`
                      : "Transaction submitted.",
              }),
            },
          ],
        },
      },
    });

    return {
      approval: {
        ...toApprovalRecord({
          ...approval,
          ...updatedApproval,
        }),
        status: "approved" as const,
      },
      paymentRequestId: approval.paymentRequestId,
      transaction: input.transaction,
    };
  });
}

export async function rejectStoredApproval(input: {
  approvalId: string;
  reviewerLabel?: string;
  reviewNotes?: string;
}) {
  return db.$transaction(async (transactionDb) => {
    const approval = await transactionDb.approval.findUnique({
      where: {
        id: input.approvalId,
      },
      include: approvalInclude,
    });

    if (!approval) {
      return null;
    }

    const updatedApproval = await transactionDb.approval.update({
      where: {
        id: input.approvalId,
      },
      data: {
        status: "rejected",
        reviewerLabel: input.reviewerLabel,
        reviewNotes: input.reviewNotes,
      },
    });

    await transactionDb.paymentRequest.update({
      where: {
        id: approval.paymentRequestId,
      },
      data: {
        status: "rejected",
        bridgeRequest: approval.paymentRequest.bridgeRequest
          ? {
              update: {
                bridgeStatus: "failed",
              },
            }
          : undefined,
        auditEvents: {
          create: {
            eventType: "approval_resolved",
            payloadJson: JSON.stringify({
              summary: `Approval rejected by ${input.reviewerLabel ?? "treasury reviewer"}.`,
            }),
          },
        },
      },
    });

    return {
      approval: {
        ...toApprovalRecord({
          ...approval,
          ...updatedApproval,
        }),
        status: "rejected" as const,
      },
      paymentRequestId: approval.paymentRequestId,
    };
  });
}
