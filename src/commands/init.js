const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

async function initCommand(options, command) {
  const verbose = command.parent.opts().verbose;
  logger.setVerbose(verbose);

  const configPath = path.join(process.cwd(), 'playwright.config.js');
  
  if (fs.existsSync(configPath)) {
    logger.info('playwright.config.js already exists');
    logger.verbose(`Config file found at: ${configPath}`);
    return;
  }

  const configContent = `const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.cjs',
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
`;

  try {
    fs.writeFileSync(configPath, configContent, 'utf8');
    logger.success('Created playwright.config.js');
    logger.verbose(`Config file created at: ${configPath}`);
  } catch (error) {
    logger.error(`Failed to create playwright.config.js: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  initCommand
};
