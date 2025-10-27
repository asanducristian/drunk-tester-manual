const { chromium } = require('playwright');
const logger = require('./logger');

async function launchBrowser(url) {
  logger.verbose('Launching Chromium browser...');
  
  try {
    const browser = await chromium.launch({
      headless: false
    });
    
    logger.verbose('Browser launched successfully!');
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    logger.verbose('New page created');
    
    if (url) {
      logger.verbose(`Navigating to: ${url}`);
      await page.goto(url);
      logger.debug(`Successfully navigated to ${url}`);
    }
    
    return { browser, context, page };
  } catch (error) {
    logger.error(`Error launching browser: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  launchBrowser
};

