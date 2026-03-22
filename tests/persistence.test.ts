import { beforeEach, describe, expect, it } from "vitest";
import { authenticateAgentClient } from "@/lib/agent-gateway/service";
import type { BridgePreparedRequest } from "@/lib/bridge/types";
import { preparePaymentRequest } from "@/lib/agent/runtime";
import {
  createStoredBridgeRequest,
  getStoredBridgeRequestById,
} from "@/lib/db/repositories/bridge-requests";
import { createStoredPaymentRequest } from "@/lib/db/repositories/payment-requests";
import { resetTestDatabase, seedTreasuryFixtures } from "./helpers/database";
import { hasConfiguredTestDatabase } from "./helpers/test-database";

const describeDatabase = hasConfiguredTestDatabase ? describe : describe.skip;

describeDatabase("persistence flows", () => {
  beforeEach(async () => {
    process.env.FEATURE_AGENT_GATEWAY = "true";
    await resetTestDatabase();
    await seedTreasuryFixtures();
  });

  it("authenticates a seeded agent client from the database", async () => {
    const authResult = await authenticateAgentClient("ops-bot-demo-token");

    expect(authResult.ok).toBe(true);
    expect(authResult.agentClient?.id).toBe("agent_ops_bot");
    expect(authResult.agentClient?.name).toBe("Ops Bot");
  });

  it("persists request source and approval state for agent-submitted payments", async () => {
    const prepared = await preparePaymentRequest(
      "Pay Atlas VPS 900 USDT for quarterly infrastructure renewal",
    );

    const stored = await createStoredPaymentRequest({
      id: "req_agent_escalated",
      rawRequest: "Pay Atlas VPS 900 USDT for quarterly infrastructure renewal",
      requesterLabel: "Ops Bot",
      requestSource: "agent",
      sourceAgentId: "agent_ops_bot",
      prepared,
      transaction: null,
      network: "ethereum-sepolia",
    });

    expect(stored?.paymentRequest.requestSource).toBe("agent");
    expect(stored?.paymentRequest.sourceAgentId).toBe("agent_ops_bot");
    expect(stored?.paymentRequest.status).toBe("escalated");
    expect(stored?.approvals).toHaveLength(1);
  });

  it("persists bridge requests with linked payment request metadata", async () => {
    const prepared: BridgePreparedRequest = {
      intent: {
        sourceNetwork: "arbitrum",
        destinationNetwork: "optimism",
        recipientAddress: "0x1234000000000000000000000000000000005678",
        asset: "USDt0",
        amount: 1000,
        purpose: "Payroll liquidity",
        memo: "Bridge 1000 USDt0 from Arbitrum to Optimism for payroll liquidity",
        confidence: 0.92,
        ambiguous: false,
      },
      evaluation: {
        decision: "escalate",
        reason: "Route has not been verified for live execution.",
        results: [],
      },
      summary: {
        headline: "Bridge treasury liquidity to optimism",
        explanation: "TreasuryPilot will escalate the bridge for review.",
      },
      quote: null,
    };

    await createStoredBridgeRequest({
      id: "req_bridge_demo",
      rawRequest: "Bridge 1000 USDt0 from Arbitrum to Optimism for payroll liquidity",
      requesterLabel: "Treasury admin",
      requestSource: "human",
      bridgeRequestId: "bridge_demo_01",
      prepared,
      transaction: null,
      quote: null,
      network: "arbitrum",
    });

    const stored = await getStoredBridgeRequestById("bridge_demo_01");

    expect(stored?.bridgeStatus).toBe("planned");
    expect(stored?.paymentRequest.requestSource).toBe("human");
    expect(stored?.paymentRequest.evaluation?.decision).toBe("escalate");
  });

  it("stores a failed status when execution fails after policy approval", async () => {
    const prepared = await preparePaymentRequest("Pay Northstar Design 250 USDT for February design work");

    const stored = await createStoredPaymentRequest({
      id: "req_failed_execution",
      rawRequest: "Pay Northstar Design 250 USDT for February design work",
      requesterLabel: "Treasury admin",
      requestSource: "human",
      prepared,
      transaction: {
        paymentRequestId: "req_failed_execution",
        status: "failed",
        error: "Live WDK execution is disabled.",
      },
      network: "ethereum-sepolia",
    });

    expect(stored?.paymentRequest.status).toBe("failed");
    expect(stored?.transactions[0]?.txStatus).toBe("failed");
    expect(stored?.auditEvents.some((event) => event.eventType === "execution_failed")).toBe(true);
  });
});
