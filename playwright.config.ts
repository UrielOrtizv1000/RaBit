import { defineConfig } from "@playwright/test";

export default defineConfig({
  workers: 1,
  retries: 1,
  testDir: "tests/e2e",
  use: { baseURL: "http://localhost:1420", viewport: { width: 1440, height: 900 } },
  webServer: { command: "npm run dev", url: "http://localhost:1420", reuseExistingServer: true },
});
