import { existsSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { config as loadDotEnv } from "dotenv";
import { afterAll } from "vitest";

const DEFAULT_TEST_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:5432/treasurypilot_test?schema=public";

for (const envFile of [".env.test.local", ".env.test", ".env.local"]) {
  const envPath = path.join(process.cwd(), envFile);

  if (existsSync(envPath)) {
    loadDotEnv({ path: envPath, override: false });
  }
}

loadEnvConfig(process.cwd());

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim() ?? "";

process.env.TEST_DATABASE_URL = testDatabaseUrl;
process.env.DATABASE_URL = testDatabaseUrl || DEFAULT_TEST_DATABASE_URL;

afterAll(async () => {
  const { disconnectDatabase } = await import("@/lib/db/client");
  await disconnectDatabase();
});
