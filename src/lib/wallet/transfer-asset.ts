import { getEnv } from "@/lib/config/env";
import type { TransactionRecord } from "@/lib/types";
import { toBaseUnitAmount } from "@/lib/utils/money";
import { loadStoredWallet } from "@/lib/wallet/client";
import type { TransferInstruction } from "@/lib/wallet/types";

type WalletTransferErrorCode =
  | "execution_disabled"
  | "wallet_missing"
  | "invalid_recipient"
  | "unsupported_asset"
  | "transfer_failed";

export class WalletTransferError extends Error {
  code: WalletTransferErrorCode;

  constructor(code: WalletTransferErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "WalletTransferError";
  }
}

export function getWalletTransferErrorStatus(error: unknown) {
  if (!(error instanceof WalletTransferError)) {
    return 500;
  }

  switch (error.code) {
    case "execution_disabled":
    case "wallet_missing":
      return 503;
    case "invalid_recipient":
    case "unsupported_asset":
      return 400;
    case "transfer_failed":
      return 502;
    default:
      return 500;
  }
}

function isEvmAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function createFailedTransactionRecord(
  paymentRequestId: string,
  error: unknown,
): TransactionRecord {
  const message = error instanceof Error ? error.message : "Unexpected wallet transfer error.";

  return {
    paymentRequestId,
    status: "failed",
    error: message,
  };
}

export async function transferAsset(instruction: TransferInstruction): Promise<TransactionRecord> {
  const env = getEnv();

  if (!env.wdkExecutionEnabled) {
    throw new WalletTransferError(
      "execution_disabled",
      "Live WDK execution is disabled. Set WDK_EXECUTION_ENABLED=true to submit real transfers.",
    );
  }

  if (instruction.asset !== env.wdkAssetSymbol) {
    throw new WalletTransferError(
      "unsupported_asset",
      `Transfer asset ${instruction.asset} is not configured for live execution.`,
    );
  }

  if (!isEvmAddress(instruction.recipientAddress)) {
    throw new WalletTransferError(
      "invalid_recipient",
      "Recipient address must be a full 20-byte EVM address.",
    );
  }

  const wallet = await loadStoredWallet();

  if (!wallet) {
    throw new WalletTransferError(
      "wallet_missing",
      "No persisted treasury wallet is available for live execution.",
    );
  }

  try {
    const amount = toBaseUnitAmount(instruction.amount, env.wdkAssetDecimals);
    const result = await wallet.account.transfer({
      token: env.wdkPaymasterTokenAddress,
      recipient: instruction.recipientAddress,
      amount,
    });

    return {
      paymentRequestId: instruction.paymentRequestId,
      txHash: result.hash,
      status: "submitted",
    };
  } catch (error) {
    throw new WalletTransferError(
      "transfer_failed",
      error instanceof Error ? error.message : "WDK transfer submission failed.",
    );
  } finally {
    wallet.walletManager.dispose();
  }
}
