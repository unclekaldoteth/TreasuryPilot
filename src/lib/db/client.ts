import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl } from "@/lib/db/resolve-database-url";

const globalForPrisma = globalThis as {
  prisma?: PrismaClient;
  prismaDatabaseUrl?: string;
};
const databaseUrl = resolveDatabaseUrl(process.env.DATABASE_URL ?? "file:./prisma/dev.db");

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
}

let prismaClient: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prismaClient = createPrismaClient();
} else {
  const hasMatchingClient =
    globalForPrisma.prisma && globalForPrisma.prismaDatabaseUrl === databaseUrl;

  if (hasMatchingClient) {
    prismaClient = globalForPrisma.prisma as PrismaClient;
  } else {
    if (globalForPrisma.prisma) {
      void globalForPrisma.prisma.$disconnect().catch(() => null);
    }

    prismaClient = createPrismaClient();
    globalForPrisma.prisma = prismaClient;
    globalForPrisma.prismaDatabaseUrl = databaseUrl;
  }
}

export const db = prismaClient;

export async function disconnectDatabase() {
  await db.$disconnect();
}
