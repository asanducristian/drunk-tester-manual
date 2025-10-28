#!/usr/bin/env node

const { Command } = require('commander');
const { recordCommand } = require('./commands/record');
const { runCommand } = require('./commands/run');
const { showReportCommand } = require('./commands/show-report');

function runCLI() {
  const program = new Command();
  
  program
    .name('drunk-tester-manual')
    .description('A CLI tool for drunk-tester-manual')
    .version('1.0.0')
    .option('-v, --verbose', 'Enable verbose logging');
  
  program
    .command('record')
    .description('Record a test session')
    .requiredOption('--url <url>', 'URL to navigate to')
    .action(recordCommand);
  
  program
    .command('run')
    .description('Run saved tests')
    .option('--name <name>', 'Name of specific test to run (runs all tests if not specified)')
    .option('--headless <boolean>', 'Run tests in headless mode (default: true)', true)
    .option('--reporter <reporter>', 'Override Playwright reporter (uses config by default)')
    .action(runCommand);
  
  program
    .command('show-report')
    .description('Open the HTML test report in browser')
    .action(showReportCommand);
  
  program.parse(process.argv);
  
  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
}

module.exports = {
  runCLI
};

