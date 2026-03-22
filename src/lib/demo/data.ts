import type {
  AgentClientRecord,
  ApprovalRecord,
  AuditEvent,
  BridgeRequestRecord,
  PaymentRequestRecord,
  TransactionRecord,
  TreasuryPolicy,
  Vendor,
  WalletSummary,
} from "@/lib/types";

export const walletSummary: WalletSummary = {
  network: "Ethereum Sepolia",
  address: "0x9c2f...8B31",
  asset: "USDt",
  balance: "12,480.00",
  status: "connected",
};

export const treasuryPolicy: TreasuryPolicy = {
  perTxLimit: 2500,
  dailyLimit: 5000,
  weeklyLimit: 15000,
  autoApprovalLimit: 500,
  allowedAssets: ["USDt"],
  allowedCategories: ["contractor", "software", "operations", "revenue-share"],
  requireAllowlist: true,
  paused: false,
};

export const vendors: Vendor[] = [
  {
    id: "vendor_design",
    name: "Northstar Design",
    walletAddress: "0x11a0...44ed",
    asset: "USDt",
    category: "contractor",
    isAllowlisted: true,
    isBlocked: false,
  },
  {
    id: "vendor_vps",
    name: "Atlas VPS",
    walletAddress: "0x73bc...1a20",
    asset: "USDt",
    category: "operations",
    isAllowlisted: true,
    isBlocked: false,
  },
  {
    id: "vendor_unknown",
    name: "Unknown Counterparty",
    walletAddress: "0xff00...ee77",
    asset: "USDt",
    category: "unknown",
    isAllowlisted: false,
    isBlocked: true,
  },
];

export const paymentRequests: PaymentRequestRecord[] = [
  {
    id: "req_approved_demo",
    rawRequest: "Pay Northstar Design 250 USDT for February design work",
    requestSource: "human",
    status: "executed",
    decision: "execute",
    rationale: "Allowlisted vendor, supported asset, and amount below the auto-approval threshold.",
    amount: "250 USDt",
    recipient: "Northstar Design",
    createdAt: "2026-03-22T15:20:00+07:00",
  },
  {
    id: "req_rejected_demo",
    rawRequest: "Send 3,500 USDT to Unknown Counterparty immediately",
    requestSource: "human",
    status: "rejected",
    decision: "reject",
    rationale: "Recipient is blocked and the request exceeds the configured per-transaction policy.",
    amount: "3,500 USDt",
    recipient: "Unknown Counterparty",
    createdAt: "2026-03-22T15:22:00+07:00",
  },
  {
    id: "req_escalated_demo",
    rawRequest: "Pay Atlas VPS 900 USDT for quarterly infrastructure renewal",
    requestSource: "human",
    status: "escalated",
    decision: "escalate",
    rationale: "Vendor is allowlisted, but the amount exceeds the auto-approval threshold.",
    amount: "900 USDt",
    recipient: "Atlas VPS",
    createdAt: "2026-03-22T15:25:00+07:00",
  },
];

export const agentClients: AgentClientRecord[] = [
  {
    id: "agent_ops_bot",
    name: "Ops Bot",
    callbackUrl: "https://example.com/agent-callback",
    status: "enabled",
  },
];

export const bridgeRequests: BridgeRequestRecord[] = [
  {
    id: "bridge_stub_01",
    paymentRequestId: "req_bridge_demo",
    sourceNetwork: "ethereum-sepolia",
    destinationNetwork: "arbitrum-sepolia",
    recipientAddress: "0x1234000000000000000000000000000000005678",
    asset: "USDt",
    amount: "1,000 USDt",
    purpose: "Payroll liquidity",
    status: "planned",
  },
];

export const approvals: ApprovalRecord[] = [
  {
    id: "approval_01",
    paymentRequestId: "req_escalated_demo",
    vendor: "Atlas VPS",
    amount: "900 USDt",
    reason: "Threshold crossed; human sign-off required before execution.",
    requestedAt: "2026-03-22T15:25:30+07:00",
    status: "pending",
  },
];

export const auditEvents: AuditEvent[] = [
  {
    id: "audit_01",
    eventType: "request_received",
    paymentRequestId: "req_approved_demo",
    summary: "Inbound request parsed for Northstar Design.",
    createdAt: "2026-03-22T15:20:02+07:00",
  },
  {
    id: "audit_02",
    eventType: "policy_evaluated",
    paymentRequestId: "req_approved_demo",
    summary: "Policy returned execute with no threshold violations.",
    createdAt: "2026-03-22T15:20:04+07:00",
  },
  {
    id: "audit_03",
    eventType: "execution_submitted",
    paymentRequestId: "req_approved_demo",
    summary: "Mock transfer created with a placeholder tx hash.",
    createdAt: "2026-03-22T15:20:07+07:00",
  },
  {
    id: "audit_04",
    eventType: "policy_evaluated",
    paymentRequestId: "req_rejected_demo",
    summary: "Reject due to blocked vendor and per-transaction limit breach.",
    createdAt: "2026-03-22T15:22:08+07:00",
  },
  {
    id: "audit_05",
    eventType: "approval_requested",
    paymentRequestId: "req_escalated_demo",
    summary: "Escalated payment queued for treasury admin review.",
    createdAt: "2026-03-22T15:25:38+07:00",
  },
];

export const transactions: TransactionRecord[] = [
  {
    paymentRequestId: "req_approved_demo",
    txHash: "0x7f2cdbf72520de3cd0b2fe9f35678dbe3a0adfe11a31714d4b65ea52e6b8304a",
    status: "confirmed",
  },
];
