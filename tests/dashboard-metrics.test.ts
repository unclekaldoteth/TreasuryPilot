import { describe, expect, it } from "vitest";
import { calculateDashboardMetrics } from "@/lib/dashboard/metrics";
import type { PaymentRequestRecord } from "@/lib/types";

describe("calculateDashboardMetrics", () => {
  it("uses final lifecycle status instead of raw decision when summarizing dashboard totals", () => {
    const paymentRequests: PaymentRequestRecord[] = [
      {
        id: "req_1",
        rawRequest: "Pay Northstar Design 250 USDT for February design work",
        requestSource: "human",
        status: "executed",
        decision: "execute",
        rationale: "Executed successfully.",
        amount: "250 USDt",
        recipient: "Northstar Design",
        createdAt: new Date().toISOString(),
      },
      {
        id: "req_2",
        rawRequest: "Pay Northstar Design 1500 USDT for milestone two delivery",
        requestSource: "human",
        status: "executed",
        decision: "escalate",
        rationale: "Escalated then approved.",
        amount: "1500 USDt",
        recipient: "Northstar Design",
        createdAt: new Date().toISOString(),
      },
      {
        id: "req_3",
        rawRequest: "Send 5000 USDT to 0x1234567890123456789012345678901234567890 immediately",
        requestSource: "human",
        status: "rejected",
        decision: "reject",
        rationale: "Rejected by policy.",
        amount: "5000 USDt",
        recipient: "Unresolved recipient",
        createdAt: new Date().toISOString(),
      },
      {
        id: "req_4",
        rawRequest: "Pay Atlas VPS 900 USDT for quarterly infrastructure renewal",
        requestSource: "agent",
        sourceAgentId: "agent_ops_bot",
        status: "escalated",
        decision: "escalate",
        rationale: "Awaiting human review.",
        amount: "900 USDt",
        recipient: "Atlas VPS",
        createdAt: new Date().toISOString(),
      },
      {
        id: "req_5",
        rawRequest: "Pay Northstar Design 250 USDT for replacement transfer",
        requestSource: "human",
        status: "failed",
        decision: "execute",
        rationale: "Execution failed.",
        amount: "250 USDt",
        recipient: "Northstar Design",
        createdAt: new Date().toISOString(),
      },
    ];

    expect(calculateDashboardMetrics(paymentRequests)).toEqual({
      totalProcessed: 5,
      executedCount: 2,
      rejectedCount: 1,
      escalatedCount: 1,
      executionRate: 40,
      totalMoved: 1750,
    });
  });
});
