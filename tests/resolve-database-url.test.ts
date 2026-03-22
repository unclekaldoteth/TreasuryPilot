import { describe, expect, it } from "vitest";
import { resolveDatabaseUrl } from "@/lib/db/resolve-database-url";

describe("resolveDatabaseUrl", () => {
  it("resolves relative sqlite urls against the project cwd", () => {
    expect(resolveDatabaseUrl("file:./prisma/test.db", "/workspace/project")).toBe(
      "file:/workspace/project/prisma/test.db",
    );
  });

  it("keeps absolute sqlite urls unchanged", () => {
    expect(resolveDatabaseUrl("file:/workspace/project/prisma/test.db", "/other")).toBe(
      "file:/workspace/project/prisma/test.db",
    );
  });

  it("preserves sqlite query parameters", () => {
    expect(resolveDatabaseUrl("file:./prisma/test.db?connection_limit=1", "/workspace/project")).toBe(
      "file:/workspace/project/prisma/test.db?connection_limit=1",
    );
  });
});
