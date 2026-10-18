/**
 * Configuración de `npm run screenshots`: regenera las capturas del README (docs/assets/screenshots/).
 * No forma parte de `npm run test:e2e` (vive fuera de tests/e2e a propósito).
 */
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  outputDir: "../../test-results",
  workers: 1,
  retries: 0,
  timeout: 180_000,
  use: { baseURL: "http://localhost:1420", viewport: { width: 1600, height: 980 } },
  webServer: { command: "npm run dev", cwd: "../..", url: "http://localhost:1420", reuseExistingServer: true },
});
