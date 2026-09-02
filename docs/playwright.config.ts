import { defineConfig, devices } from '@playwright/test';

// Browser smoke tests for the deployed docs site. They run against a production build
// (`pnpm build && pnpm e2e`) and cover what typecheck and unit tests cannot: that every
// page renders on a phone and a desktop, in light and dark, without throwing, without
// horizontal overflow, and with search and the playground actually working.
const PORT = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
      : {}),
  },
  projects: [
    { name: 'mobile-dark', use: { ...devices['iPhone 14'], browserName: 'chromium', colorScheme: 'dark' } },
    { name: 'mobile-light', use: { ...devices['iPhone 14'], browserName: 'chromium', colorScheme: 'light' } },
    { name: 'desktop-dark', use: { ...devices['Desktop Chrome'], colorScheme: 'dark' } },
    { name: 'desktop-light', use: { ...devices['Desktop Chrome'], colorScheme: 'light' } },
  ],
  webServer: {
    command: `pnpm start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
