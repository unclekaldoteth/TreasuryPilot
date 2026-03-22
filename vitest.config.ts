import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
    globals: true,
    fileParallelism: false,
    setupFiles: ["./tests/setup.ts"],
  },
});
