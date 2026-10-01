import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    // Tests must never reach the real provider, whatever backend/.env says.
    env: { NOIZ_MODE: "mock", NOIZ_API_KEY: "" },
    testTimeout: 20000,
    hookTimeout: 20000,
    pool: "forks",
    // Integration tests share one Postgres database and truncate it in
    // beforeEach; running files concurrently would let one test's truncate
    // race another's in-flight request. Force fully sequential execution.
    fileParallelism: false,
  },
});
