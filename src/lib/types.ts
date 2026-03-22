export type Decision = "execute" | "escalate" | "reject";
export type RequestSource = "human" | "agent";

export type WalletSummary = {
  network: string;
  address: string;
  asset: string;
  balance: string;
  status: "connected" | "mock" | "missing" | "error";
  walletType?: string;
  error?: string;
};

export type Vendor = {
  id: string;
  name: string;
  walletAddress: string;
  asset: string;
  category: string;
  isAllowlisted: boolean;
  isBlocked: boolean;
};

export type TreasuryPolicy = {
  perTxLimit: number;
  dailyLimit: number;
  weeklyLimit: number;
  autoApprovalLimit: number;
  allowedAssets: string[];
  allowedCategories: string[];
  requireAllowlist: boolean;
  paused: boolean;
};

export type PaymentIntent = {
  recipientName: string;
  recipientAddress: string;
  asset: string;
  amount: number;
  category: string;
  memo: string;
  confidence: number;
  ambiguous: boolean;
};

export type BridgeIntent = {
  sourceNetwork: string;
  destinationNetwork: string;
  recipientAddress: string;
  asset: string;
  amount: number;
  purpose: string;
  memo: string;
  confidence: number;
  ambiguous: boolean;
};

export type BridgeQuote = {
  feeWei: string;
  bridgeFeeWei: string;
  totalFeeWei: string;
};

export type PaymentRequestRecord = {
  id: string;
  rawRequest: string;
  requestSource: RequestSource;
  sourceAgentId?: string;
  status: "received" | "executed" | "escalated" | "rejected" | "executing" | "failed";
  decision: Decision;
  rationale: string;
  amount: string;
  recipient: string;
  createdAt: string;
};

export type AgentClientRecord = {
  id: string;
  name: string;
  callbackUrl?: string;
  status: "enabled" | "disabled";
};

export type BridgeRequestRecord = {
  id: string;
  paymentRequestId: string;
  sourceNetwork: string;
  destinationNetwork: string;
  recipientAddress: string;
  asset: string;
  amount: string;
  purpose: string;
  status: "disabled" | "planned" | "unsupported" | "submitted" | "confirmed" | "failed";
};

export type ApprovalRecord = {
  id: string;
  paymentRequestId: string;
  vendor: string;
  amount: string;
  reason: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
};

export type AuditEvent = {
  id: string;
  eventType: string;
  paymentRequestId: string;
  summary: string;
  createdAt: string;
};

export type PolicyRuleResult = {
  rule: string;
  passed: boolean;
  detail: string;
};

export type PolicyEvaluation = {
  decision: Decision;
  reason: string;
  results: PolicyRuleResult[];
};

export type TransactionRecord = {
  paymentRequestId: string;
  txHash?: string;
  status: "submitted" | "confirmed" | "failed";
  error?: string;
};
