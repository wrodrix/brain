import { defineConfig } from "@playwright/test"

try {
  process.loadEnvFile?.()
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
}

const E2E_API = "http://127.0.0.1:3100"
const E2E_WEB = "http://127.0.0.1:5174"
const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL
if (!databaseUrl) throw new Error("TEST_DATABASE_URL/DATABASE_URL é obrigatório para o E2E")

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: E2E_WEB,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "npx tsx server/src/index.ts",
      url: `${E2E_API}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        NODE_ENV: "test",
        BRAIN_TEST_MODE: "1",
        PORT: "3100",
        HOST: "127.0.0.1",
        DATABASE_URL: databaseUrl,
        BETTER_AUTH_URL: E2E_WEB,
        BRAIN_PUBLIC_ORIGIN: E2E_WEB,
        BRAIN_SECURE_COOKIES: "false",
        BRAIN_TRUST_PROXY: "false",
      },
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5174",
      url: E2E_WEB,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_API_TARGET: E2E_API,
      },
    },
  ],
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: {
        browserName: "chromium",
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "desktop",
      testMatch: ["desktop.spec.ts", "scenarios.spec.ts", "auth.spec.ts"],
      dependencies: ["setup"],
      use: {
        browserName: "chromium",
        viewport: { width: 1440, height: 900 },
        permissions: ["clipboard-read", "clipboard-write"],
        storageState: "e2e/.auth/state.json",
      },
    },
    {
      name: "mobile",
      testMatch: ["mobile.spec.ts"],
      dependencies: ["setup"],
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
        storageState: "e2e/.auth/state.json",
      },
    },
  ],
})
