import {
  listRefreshableTransactions,
  updateStoredTransactionLifecycle,
  type RefreshableTransactionRecord,
} from "@/lib/db/repositories/payment-requests";
import { loadStoredWallet } from "@/lib/wallet/client";

type RefreshResult = {
  transactionId: string;
  paymentRequestId: string;
  status: "submitted" | "confirmed" | "failed";
};

function coerceReceiptStatus(value: unknown) {
  if (value === 1 || value === "1" || value === BigInt(1)) {
    return "confirmed" as const;
  }

  if (value === 0 || value === "0" || value === BigInt(0)) {
    return "failed" as const;
  }

  return null;
}

function summarizeRefreshOutcome(input: {
  nextStatus: "confirmed" | "failed";
  txHash: string;
  blockNumber?: string | number | bigint | null;
}) {
  if (input.nextStatus === "confirmed") {
    return input.blockNumber
      ? `Transaction ${input.txHash} confirmed in block ${input.blockNumber.toString()}.`
      : `Transaction ${input.txHash} confirmed onchain.`;
  }

  return `Transaction ${input.txHash} failed during onchain execution.`;
}

async function resolveTransactionOutcome(
  account: {
    getUserOperationReceipt(hash: string): Promise<
      | {
          success: boolean;
          receipt?: {
            blockNumber?: string | number | bigint | null;
            status?: unknown;
          } | null;
        }
      | null
    >;
    getTransactionReceipt(hash: string): Promise<
      | {
          blockNumber?: string | number | bigint | null;
          status?: unknown;
        }
      | null
    >;
  },
  transaction: RefreshableTransactionRecord,
): Promise<
  | {
      nextStatus: "confirmed" | "failed";
      summary: string;
    }
  | null
> {
  const userOperationReceipt = await account.getUserOperationReceipt(transaction.txHash);

  if (userOperationReceipt) {
    const nextStatus = userOperationReceipt.success ? "confirmed" : "failed";

    return {
      nextStatus,
      summary: summarizeRefreshOutcome({
        nextStatus,
        txHash: transaction.txHash,
        blockNumber: userOperationReceipt.receipt?.blockNumber ?? null,
      }),
    };
  }

  const transactionReceipt = await account.getTransactionReceipt(transaction.txHash);

  if (!transactionReceipt) {
    return null;
  }

  const nextStatus = coerceReceiptStatus(transactionReceipt.status);

  if (!nextStatus) {
    return null;
  }

  return {
    nextStatus,
    summary: summarizeRefreshOutcome({
      nextStatus,
      txHash: transaction.txHash,
      blockNumber: transactionReceipt.blockNumber ?? null,
    }),
  };
}

export async function refreshPendingTransactionStatuses(options?: { paymentRequestId?: string }) {
  const refreshableTransactions = await listRefreshableTransactions(options?.paymentRequestId);

  if (refreshableTransactions.length === 0) {
    return [] satisfies RefreshResult[];
  }

  const wallet = await loadStoredWallet();

  if (!wallet) {
    return refreshableTransactions.map((transaction) => ({
      transactionId: transaction.id,
      paymentRequestId: transaction.paymentRequestId,
      status: "submitted",
    }));
  }

  try {
    const outcomes = await Promise.all(
      refreshableTransactions.map(async (transaction) => {
        const outcome = await resolveTransactionOutcome(wallet.account, transaction);

        if (!outcome) {
          return {
            transactionId: transaction.id,
            paymentRequestId: transaction.paymentRequestId,
            status: "submitted" as const,
          };
        }

        await updateStoredTransactionLifecycle({
          transactionId: transaction.id,
          paymentRequestId: transaction.paymentRequestId,
          nextStatus: outcome.nextStatus,
          summary: outcome.summary,
        });

        return {
          transactionId: transaction.id,
          paymentRequestId: transaction.paymentRequestId,
          status: outcome.nextStatus,
        } satisfies RefreshResult;
      }),
    );

    return outcomes;
  } finally {
    wallet.walletManager.dispose();
  }
}
