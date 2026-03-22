const configuredTestDatabaseUrl = process.env.TEST_DATABASE_URL?.trim() ?? "";

export const hasConfiguredTestDatabase = configuredTestDatabaseUrl.length > 0;

export function assertSafeTestDatabaseUrl() {
  if (!configuredTestDatabaseUrl) {
    throw new Error("TEST_DATABASE_URL is required for Postgres integration tests.");
  }

  const parsedUrl = new URL(configuredTestDatabaseUrl);
  const databaseName = parsedUrl.pathname.replace(/^\//, "").toLowerCase();

  if (!databaseName.includes("test")) {
    throw new Error("TEST_DATABASE_URL must point to a dedicated test database.");
  }

  return configuredTestDatabaseUrl;
}
