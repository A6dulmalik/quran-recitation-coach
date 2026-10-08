import { defineConfig, devices } from "@playwright/test";

// End-to-end tests against the static export (npm run build first).
// Uses the system Chrome (no browser download) with a fake microphone; the
// evaluation API is mocked per test with page.route.
const PORT = 3200;
const chrome = {
  channel: "chrome",
  launchOptions: {
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
  },
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: 2,
  // Full practice flows record several times through a fake microphone.
  timeout: 90_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    permissions: ["microphone"],
    // A controlling service worker hides requests from page.route mocks;
    // e2e/pwa.spec.ts opts back in.
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], ...chrome } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], ...chrome } },
  ],
  webServer: {
    command: `node scripts/serve-static.mjs ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
