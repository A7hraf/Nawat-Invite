import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src"), "server-only": path.resolve(import.meta.dirname, "tests/stubs/server-only.ts") } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: { APP_SECRET: "test-secret-test-secret-test-secret-0123456789", DATABASE_URL: "pglite:memory" },
  },
});
