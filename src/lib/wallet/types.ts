export type WalletSetupInput = {
  seedPhrase?: string;
  network?: string;
};

export type TransferInstruction = {
  paymentRequestId: string;
  recipientAddress: string;
  asset: string;
  amount: number;
};

export type WalletBalanceSnapshot = {
  network: string;
  address: string;
  asset: string;
  balance: string;
  rawTokenBalance?: string;
  rawNativeBalance?: string;
  status: "connected" | "missing" | "error";
  walletType: "erc-4337";
  tokenAddress: string;
  error?: string;
};
