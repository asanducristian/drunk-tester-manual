const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],
  use: {
    headless: true,          // ensure recording works
    video: 'on',             // record all tests
    screenshot: 'only-on-failure',
    trace: 'on-first-retry'
  },
  outputDir: 'test-results',
});