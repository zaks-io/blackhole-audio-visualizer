import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  workers: 1,
  use: { actionTimeout: 10_000, trace: "retain-on-failure" },
  reporter: "list",
  outputDir: "test-results",
});
