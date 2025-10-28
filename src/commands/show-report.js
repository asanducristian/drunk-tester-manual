const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

async function showReportCommand(options, command) {
  const verbose = command.parent.opts().verbose;
  logger.setVerbose(verbose);

  logger.info('Opening Playwright HTML report...');

  const testProcess = spawn('npx', ['playwright', 'show-report'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd()
  });

  testProcess.on('close', (code) => {
    if (code === 0) {
      logger.success('Report opened successfully!');
    } else {
      logger.error(`Failed to open report with exit code ${code}`);
      logger.verbose('Make sure you have run tests first to generate a report');
    }
    process.exit(code);
  });

  testProcess.on('error', (error) => {
    logger.error(`Failed to open report: ${error.message}`);
    logger.verbose('Make sure @playwright/test is installed: npm install -D @playwright/test');
    process.exit(1);
  });
}

module.exports = {
  showReportCommand
};
