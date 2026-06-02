import { defineConfig, devices } from "@playwright/test";

// FE end-to-end suite. Drives the real app in a headless browser against the
// running dev server. Tests create throwaway accounts on the live Supabase and
// the global teardown deletes them (see tests/e2e/global-teardown.ts).
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  // Account signup against the live Supabase is ~10s; keep generous timeouts.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL: BASE_URL,
    viewport: { width: 430, height: 920 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
});
