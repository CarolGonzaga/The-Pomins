import { defineConfig, devices } from '@playwright/test';
const port = process.env.POMINS_TEST_PORT ?? '3000';
const baseURL = `http://localhost:${port}`;
const production = process.env.POMINS_TEST_SERVER_MODE === 'production';
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  timeout: 40000,
  use: { baseURL, trace: 'retain-on-failure' },
  webServer: {
    command: `npm run ${production ? 'start' : 'dev'} -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'iphone', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
});
