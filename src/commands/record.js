const logger = require('../utils/logger');
const { launchBrowser } = require('../utils/browser');
const { Recorder } = require('../utils/recorder');
const { saveTestFile } = require('../utils/testGenerator');

async function recordCommand(options, command) {
  const verbose = command.parent.opts().verbose;
  logger.setVerbose(verbose);
  
  const { url } = options;
  
  logger.info('drunk-tester-manual - Record Mode');
  logger.info(`URL: ${url}`);
  logger.info('');
  
  const { browser, context, page } = await launchBrowser(url);
  
  const testSuiteName = await page.evaluate(() => {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000000; display: flex; align-items: center; justify-content: center;';
      
      const dialogContent = document.createElement('div');
      dialogContent.style.cssText = 'background: white; padding: 20px; border-radius: 8px; min-width: 400px; max-width: 600px;';
      dialogContent.innerHTML = `
        <h3 style="margin: 0 0 15px 0; color: #333; font-family: Arial, sans-serif; font-weight: bold;">Enter Test Suite Name</h3>
        <p style="margin: 0 0 10px 0; color: #666; font-size: 14px; font-family: Arial, sans-serif;">What would you like to name this test suite?</p>
        <input type="text" id="suite-name-input" placeholder="e.g., login-flow, checkout-process" style="width: 100%; padding: 8px; border: 2px solid #ccc; border-radius: 4px; margin-bottom: 15px; font-size: 14px; font-family: Arial, sans-serif; color: #333; background: white;">
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button id="suite-cancel" style="padding: 8px 16px; border: 2px solid #ccc; background: white; color: #333; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold;">Cancel</button>
          <button id="suite-ok" style="padding: 8px 16px; background: #007acc; color: white; border: 2px solid #007acc; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold;">Start Recording</button>
        </div>
      `;
      
      dialog.appendChild(dialogContent);
      document.body.appendChild(dialog);
      
      const nameInput = dialog.querySelector('#suite-name-input');
      nameInput.focus();
      
      const cleanup = () => {
        if (document.body.contains(dialog)) {
          document.body.removeChild(dialog);
        }
      };
      
      dialog.querySelector('#suite-cancel').addEventListener('click', () => {
        cleanup();
        resolve(null);
      });
      
      dialog.querySelector('#suite-ok').addEventListener('click', () => {
        const suiteName = nameInput.value.trim();
        cleanup();
        resolve(suiteName || 'untitled-test');
      });
      
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const suiteName = nameInput.value.trim();
          cleanup();
          resolve(suiteName || 'untitled-test');
        } else if (e.key === 'Escape') {
          cleanup();
          resolve(null);
        }
      });
    });
  });
  
  if (!testSuiteName) {
    logger.info('Recording cancelled by user');
    await browser.close();
    process.exit(0);
  }
  
  logger.info(`Recording: ${testSuiteName}`);
  
  const recorder = new Recorder(page, url);
  await recorder.start();
  
  logger.info('Recording started');
  logger.verbose('Interact with the browser. Press Ctrl+C to stop recording.');
  logger.info('');
  
  process.on('SIGINT', async () => {
    logger.info('\nStopping recording...');
    
    recorder.stop();
    const actions = recorder.getActions();
    
    logger.verbose(`Recorded ${actions.length} action(s)`);
    
    if (actions.length > 0) {
      saveTestFile(testSuiteName, url, actions);
    } else {
      logger.info('No actions recorded');
    }
    
    logger.verbose('Closing browser...');
    await browser.close();
    logger.success('Recording completed!');
    process.exit(0);
  });
  
  process.on('RESTART_RECORDING', async () => {
    logger.info('\nSaving current test suite...');
    
    recorder.stop();
    const actions = recorder.getActions();
    
    logger.verbose(`Recorded ${actions.length} action(s)`);
    
    if (actions.length > 0) {
      saveTestFile(testSuiteName, url, actions);
    } else {
      logger.info('No actions recorded');
    }
    
    logger.info('Closing browser and starting new test suite...');
    await browser.close();
    
    // Restart the entire recording process
    logger.info('Starting fresh recording session...');
    
    // Import the record command function and call it recursively
    const { recordCommand } = require('./record');
    await recordCommand({ url }, { parent: { opts: () => ({ verbose: command.parent.opts().verbose }) } });
  });
}

module.exports = {
  recordCommand
};

