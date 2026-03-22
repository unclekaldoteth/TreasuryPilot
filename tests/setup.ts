import { existsSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { config as loadDotEnv } from "dotenv";
import { afterAll } from "vitest";

for (const envFile of [".env.test.local", ".env.test", ".env.local"]) {
  const envPath = path.join(process.cwd(), envFile);

  if (existsSync(envPath)) {
    loadDotEnv({ path: envPath, override: false });
  }
}

loadEnvConfig(process.cwd());

afterAll(async () => {
  const { disconnectDatabase } = await import("@/lib/db/client");
  await disconnectDatabase();
});
