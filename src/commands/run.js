const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

async function runCommand(options, command) {
  const verbose = command.parent.opts().verbose;
  logger.setVerbose(verbose);
  
  const { name, headless } = options;
  const isHeadless = headless === 'false' ? false : headless !== false;
  
  const testsDir = path.join(process.cwd(), 'tests');
  if (!fs.existsSync(testsDir)) {
    logger.error('Tests directory not found. Please record a test first.');
    process.exit(1);
  }
  
  let testPath = '';
  if (name) {
    const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, '-');
    const fullPath = path.join(testsDir, `${sanitizedName}.spec.js`);
    
    if (!fs.existsSync(fullPath)) {
      logger.error(`Test file not found: tests/${sanitizedName}.spec.js`);
      process.exit(1);
    }
    
    logger.info(`Running test: ${sanitizedName}`);
    testPath = `tests/${sanitizedName}.spec.js`;
  } else {
    const testFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.spec.js'));
    
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
  
  if (!isHeadless) {
    args.push('--headed');
    logger.verbose('Running in headed mode (visible browser)');
  }
  
  if (verbose) {
    args.push('--reporter=list');
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

