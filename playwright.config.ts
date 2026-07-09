import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke E2E suite. Requires a running app (`npm run dev` or `npm start`)
 * and PLAYWRIGHT_BASE_URL (default http://localhost:3000).
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
