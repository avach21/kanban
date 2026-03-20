import { defineConfig } from "@playwright/test";

const webUrl = "http://127.0.0.1:4173";
const apiUrl = "http://127.0.0.1:3101";
const dogApiUrl = "http://127.0.0.1:3102";
const e2eDatabaseUrl =
  process.env.E2E_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/kanban_test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: "list",
  use: {
    baseURL: webUrl,
    headless: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "MOCK_DOG_API_PORT=3102 bun e2e/mock-dog-api.ts",
      url: `${dogApiUrl}/health`,
      timeout: 30_000,
      reuseExistingServer: false,
    },
    {
      command:
        `cd apps/api && API_PORT=3101 CORS_ORIGIN=${webUrl} ` +
        `DATABASE_URL="${e2eDatabaseUrl}" ` +
        `BETTER_AUTH_URL=${apiUrl} ` +
        `BETTER_AUTH_SECRET="e2e-test-secret-that-is-long-enough" ` +
        `DOG_API_BASE_URL=${dogApiUrl} bun run start`,
      url: `${apiUrl}/health`,
      timeout: 60_000,
      reuseExistingServer: false,
    },
    {
      command:
        `cd apps/web && VITE_API_URL=${apiUrl} ` +
        "bun run dev -- --host 127.0.0.1 --port 4173 --strictPort",
      url: webUrl,
      timeout: 60_000,
      reuseExistingServer: false,
    },
  ],
});
