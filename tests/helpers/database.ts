import { createHash } from "node:crypto";
import { db } from "@/lib/db/client";
import { assertSafeTestDatabaseUrl } from "./test-database";

export async function resetTestDatabase() {
  assertSafeTestDatabaseUrl();

  await db.auditEvent.deleteMany();
  await db.transaction.deleteMany();
  await db.approval.deleteMany();
  await db.policyEvaluation.deleteMany();
  await db.paymentIntent.deleteMany();
  await db.bridgeRequest.deleteMany();
  await db.paymentRequest.deleteMany();
  await db.walletConfig.deleteMany();
  await db.vendor.deleteMany();
  await db.treasuryPolicy.deleteMany();
  await db.agentClient.deleteMany();
}

export async function seedTreasuryFixtures() {
  assertSafeTestDatabaseUrl();

  await db.treasuryPolicy.create({
    data: {
      name: "Default Treasury Policy",
      perTxLimit: 2500,
      dailyLimit: 5000,
      weeklyLimit: 15000,
      autoApprovalLimit: 500,
      allowedAssets: JSON.stringify(["USDt"]),
      allowedCategories: JSON.stringify(["contractor", "software", "operations", "revenue-share"]),
      requireAllowlist: true,
      paused: false,
    },
  });

  await db.vendor.createMany({
    data: [
      {
        name: "Northstar Design",
        walletAddress: "0x11a00000000000000000000000000000000044ed",
        asset: "USDt",
        category: "contractor",
        isAllowlisted: true,
        isBlocked: false,
      },
      {
        name: "Atlas VPS",
        walletAddress: "0x73bc000000000000000000000000000000001a20",
        asset: "USDt",
        category: "operations",
        isAllowlisted: true,
        isBlocked: false,
      },
      {
        name: "Unknown Counterparty",
        walletAddress: "0xff0000000000000000000000000000000000ee77",
        asset: "USDt",
        category: "unknown",
        isAllowlisted: false,
        isBlocked: true,
      },
    ],
  });

  await db.agentClient.create({
    data: {
      id: "agent_ops_bot",
      name: "Ops Bot",
      authTokenHash: hashToken("ops-bot-demo-token"),
      callbackUrl: "https://example.com/agent-callback",
      status: "enabled",
    },
  });
}

export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
