const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

async function runCommand(options, command) {
  const verbose = command.parent.opts().verbose;
  logger.setVerbose(verbose);
  
  // Check for playwright.config.js
  const configPath = path.join(process.cwd(), 'playwright.config.js');
  if (!fs.existsSync(configPath)) {
    logger.warn('⚠️  playwright.config.js not found!');
    logger.warn('');
    logger.warn('    Run: drunk-tester init');
    logger.warn('    This will create a proper config file for better test execution');
    logger.warn('    Playwright will use default settings if you continue');
    logger.warn('');
  }
  
  const { name, headless, reporter } = options;
  const isHeadless = headless === 'false' ? false : headless !== false;
  
  const testsDir = path.join(process.cwd(), 'tests');
  if (!fs.existsSync(testsDir)) {
    logger.error('Tests directory not found. Please record a test first.');
    process.exit(1);
  }
  
  let testPath = '';
  if (name) {
    const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, '-');
    const fullPath = path.join(testsDir, `${sanitizedName}.spec.cjs`);
    
    if (!fs.existsSync(fullPath)) {
      logger.error(`Test file not found: tests/${sanitizedName}.spec.cjs`);
      process.exit(1);
    }
    
    logger.info(`Running test: ${sanitizedName}`);
    testPath = `tests/${sanitizedName}.spec.cjs`;
  } else {
    const testFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.spec.cjs'));
    
    if (testFiles.length === 0) {
      logger.error('No test files found in tests directory.');
      process.exit(1);
    }
    
    logger.info(`Running all tests (${testFiles.length} file(s))`);
    testPath = 'tests';
  }
  
  logger.verbose(`Test path: ${testPath}`);
  logger.verbose(`Headless mode: ${isHeadless}`);
  logger.info('');
  
  const args = ['playwright', 'test', testPath];
  if (reporter) {
    args.push(`--reporter=${reporter}`);
  }
  
  if (!isHeadless) {
    args.push('--headed');
    logger.verbose('Running in headed mode (visible browser)');
  }
  
  logger.verbose(`Executing: npx ${args.join(' ')}`);
  
  const testProcess = spawn('npx', args, {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd()
  });
  
  testProcess.on('close', (code) => {
    if (code === 0) {
      logger.success('\nTests completed successfully!');
    } else {
      logger.error(`\nTests failed with exit code ${code}`);
    }
    process.exit(code);
  });
  
  testProcess.on('error', (error) => {
    logger.error(`Failed to run tests: ${error.message}`);
    logger.verbose('Make sure @playwright/test is installed: npm install -D @playwright/test');
    process.exit(1);
  });
}

module.exports = {
  runCommand
};

