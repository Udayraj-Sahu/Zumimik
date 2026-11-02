import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3211";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "fight-1-clock-animation.spec.ts",
  fullyParallel: false,
  reporter: "list",
  use: { baseURL, screenshot: "only-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3211",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
