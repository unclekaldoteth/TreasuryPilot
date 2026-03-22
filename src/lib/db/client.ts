import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as {
  prisma?: PrismaClient;
  prismaDatabaseUrl?: string;
};
const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    ...(databaseUrl
      ? {
          datasources: {
            db: {
              url: databaseUrl,
            },
          },
        }
      : {}),
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
