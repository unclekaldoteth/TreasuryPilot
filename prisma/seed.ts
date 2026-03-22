import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import path from "node:path";

function resolveSqliteUrl(databaseUrl: string): string {
  if (!databaseUrl.startsWith("file:")) return databaseUrl;
  const filePath = databaseUrl.slice("file:".length);
  if (path.isAbsolute(filePath)) return databaseUrl;
  return `file:${path.resolve(process.cwd(), filePath)}`;
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: resolveSqliteUrl(process.env.DATABASE_URL ?? "file:./prisma/dev.db"),
    },
  },
});

function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function main() {
  await prisma.auditEvent.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.policyEvaluation.deleteMany();
  await prisma.paymentIntent.deleteMany();
  await prisma.bridgeRequest.deleteMany();
  await prisma.paymentRequest.deleteMany();
  await prisma.walletConfig.deleteMany();
  await prisma.treasuryPolicy.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.agentClient.deleteMany();

  await prisma.treasuryPolicy.create({
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

  await prisma.vendor.createMany({
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

  await prisma.agentClient.create({
    data: {
      id: "agent_ops_bot",
      name: "Ops Bot",
      authTokenHash: hashToken("ops-bot-demo-token"),
      callbackUrl: "https://example.com/agent-callback",
      status: "enabled",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
