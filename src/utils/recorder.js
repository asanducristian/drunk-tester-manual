const logger = require('./logger');

class Recorder {
  constructor(page, originalUrl) {
    this.page = page;
    this.originalUrl = originalUrl;
    this.actions = [];
    this.isRecording = false;
    this.isFinishing = false;
    this.waitingForAssertion = null;
  }

  async start() {
    this.isRecording = true;
    logger.verbose('Starting action recorder...');

    await this.page.exposeFunction('recordClick', (selector, text) => {
      if (this.isRecording) {
        this.actions.push({
          type: 'click',
          selector: selector,
          text: text,
          timestamp: Date.now()
        });
        logger.verbose(`Recorded click: ${selector} ${text ? `(text: "${text}")` : ''}`);
      }
    });

    await this.page.exposeFunction('recordInput', (selector, value, inputType) => {
      if (this.isRecording) {
        this.actions.push({
          type: 'fill',
          selector: selector,
          value: value,
          inputType: inputType,
          timestamp: Date.now()
        });
        const displayValue = inputType === 'password' ? '••••••••' : value;
        logger.verbose(`Recorded input: ${selector} = "${displayValue}"`);
      }
    });

    await this.page.exposeFunction('recordTestBreak', async () => {
      if (this.isRecording) {
        await this.page.evaluate(() => {
          return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000000; display: flex; align-items: center; justify-content: center;';
            
            const dialogContent = document.createElement('div');
            dialogContent.style.cssText = 'background: white; padding: 20px; border-radius: 8px; min-width: 400px; max-width: 600px;';
            dialogContent.innerHTML = `
              <h3 style="margin: 0 0 15px 0; color: #333;">Enter Test Name</h3>
              <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">What would you like to name this test?</p>
              <input type="text" id="test-name-input" placeholder="e.g., login-success, add-to-cart" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 15px; font-size: 14px;">
              <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="test-cancel" style="padding: 8px 16px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button id="test-ok" style="padding: 8px 16px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer;">Split Test</button>
              </div>
            `;
            
            dialog.appendChild(dialogContent);
            document.body.appendChild(dialog);
            
            const nameInput = dialog.querySelector('#test-name-input');
            nameInput.focus();
            
            const cleanup = () => {
              if (document.body.contains(dialog)) {
                document.body.removeChild(dialog);
              }
            };
            
            dialog.querySelector('#test-cancel').addEventListener('click', () => {
              cleanup();
              resolve(null);
            });
            
            dialog.querySelector('#test-ok').addEventListener('click', () => {
              const testName = nameInput.value.trim();
              cleanup();
              resolve(testName || 'untitled-test');
            });
            
            nameInput.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') {
                const testName = nameInput.value.trim();
                cleanup();
                resolve(testName || 'untitled-test');
              } else if (e.key === 'Escape') {
                cleanup();
                resolve(null);
              }
            });
          });
        }).then((testName) => {
          if (testName) {
            this.actions.push({
              type: 'test-break',
              testName: testName,
              timestamp: Date.now()
            });
            logger.info(`Test break added - new test "${testName}" will start here`);
            
            if (this.originalUrl) {
              this.page.goto(this.originalUrl);
              logger.verbose(`Navigated back to: ${this.originalUrl}`);
            }
          }
        });
      }
    });

    await this.page.exposeFunction('finishBeforeEach', () => {
      if (this.isRecording) {
        this.actions.push({
          type: 'finish-before-each',
          timestamp: Date.now()
        });
        logger.info('BeforeEach finished - next actions will be in first test');
      }
    });

    await this.page.exposeFunction('startAssertText', () => {
      if (this.isRecording) {
        this.waitingForAssertion = 'text';
        logger.info('Click on an element to assert its text content');
      }
    });

    await this.page.exposeFunction('getWaitingForAssertion', () => {
      return this.waitingForAssertion;
    });


    await this.page.exposeFunction('assertText', (selector, text, expectedText) => {
      if (this.isRecording) {
        this.actions.push({
          type: 'assert-text',
          selector: selector,
          text: text,
          expectedText: expectedText,
          timestamp: Date.now()
        });
        logger.info(`Assert text added: ${selector} = "${expectedText}"`);
        this.waitingForAssertion = null;
        
        this.page.evaluate(() => {
          const notification = document.createElement('div');
          notification.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #28a745; color: white; padding: 12px 20px; border-radius: 6px; font-family: Arial, sans-serif; font-size: 14px; z-index: 1000001; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
          notification.textContent = '✅ Text assertion added!';
          document.body.appendChild(notification);
          
          setTimeout(() => {
            if (document.body.contains(notification)) {
              document.body.removeChild(notification);
            }
          }, 2000);
        });
      }
    });

    await this.page.exposeFunction('assertCount', (selector, text, expectedCount) => {
      if (this.isRecording) {
        this.actions.push({
          type: 'assert-count',
          selector: selector,
          text: text,
          expectedCount: expectedCount,
          timestamp: Date.now()
        });
        logger.info(`Assert count added: ${selector} = ${expectedCount}`);
        this.actions.push({
          type: 'test-break',
          timestamp: Date.now()
        });
        logger.info('Test break added after assertion');
        
        if (this.originalUrl) {
          this.page.goto(this.originalUrl);
          logger.verbose(`Navigated back to: ${this.originalUrl}`);
        }
      }
    });

    await this.page.exposeFunction('assertURL', (expectedURL) => {
      if (this.isRecording) {
        this.actions.push({
          type: 'assert-url',
          expectedURL: expectedURL,
          timestamp: Date.now()
        });
        logger.info(`Assert URL added: ${expectedURL}`);
        
        this.page.evaluate(() => {
          const notification = document.createElement('div');
          notification.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #28a745; color: white; padding: 12px 20px; border-radius: 6px; font-family: Arial, sans-serif; font-size: 14px; z-index: 1000001; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
          notification.textContent = '✅ URL assertion added!';
          document.body.appendChild(notification);
          
          setTimeout(() => {
            if (document.body.contains(notification)) {
              document.body.removeChild(notification);
            }
          }, 2000);
        });
      }
    });

    await this.page.exposeFunction('startNewTestSuite', () => {
      if (this.isRecording && !this.isFinishing) {
        logger.info('Starting new test suite...');
        this.isFinishing = true;
        this.isRecording = false;
        // Close browser and restart fresh
        process.emit('RESTART_RECORDING');
      }
    });

    await this.page.exposeFunction('finishRecording', () => {
      if (this.isRecording && !this.isFinishing) {
        logger.info('Finishing recording...');
        this.isFinishing = true;
        this.isRecording = false;
        process.emit('SIGINT');
      }
    });

    this.page.on('framenavigated', (frame) => {
      if (frame === this.page.mainFrame() && this.isRecording) {
        const url = frame.url();
        if (url && url !== 'about:blank') {
          const lastAction = this.actions[this.actions.length - 1];
          const now = Date.now();
          
          if (lastAction && lastAction.type === 'click' && (now - lastAction.timestamp) < 2000) {
            logger.verbose(`Skipping automatic navigation after click: ${url}`);
            return;
          }
          
          if (lastAction && lastAction.type === 'test-break' && (now - lastAction.timestamp) < 2000) {
            logger.verbose(`Skipping automatic navigation after test break: ${url}`);
            return;
          }
          
          this.actions.push({
            type: 'navigation',
            url: url,
            timestamp: now
          });
          logger.verbose(`Recorded navigation: ${url}`);
        }
      }
    });

    await this.page.addInitScript(() => {
      console.log('Init script running...');
      
      let waitingForAssertion = null;
      
      function isAutoGeneratedId(id) {
        return !id || 
               id.includes(':') || 
               /^[a-z0-9]{8,}$/i.test(id) || 
               /^(mui|radix|headless)-/.test(id);
      }
      
      function getImplicitRole(element) {
        const tagName = element.tagName.toLowerCase();
        const roleMap = {
          'button': 'button',
          'a': element.hasAttribute('href') ? 'link' : null,
          'input': element.getAttribute('type') === 'button' || element.getAttribute('type') === 'submit' ? 'button' : 'textbox',
          'textarea': 'textbox',
          'select': 'combobox',
          'h1': 'heading',
          'h2': 'heading',
          'h3': 'heading',
          'h4': 'heading',
          'h5': 'heading',
          'h6': 'heading',
          'img': 'img',
          'nav': 'navigation',
          'main': 'main',
          'aside': 'complementary',
          'header': 'banner',
          'footer': 'contentinfo'
        };
        return roleMap[tagName] || null;
      }
      
      function findTableRow(element) {
        let current = element;
        while (current && current.tagName.toLowerCase() !== 'body') {
          if (current.tagName.toLowerCase() === 'tr') {
            const parent = current.parentElement;
            if (parent && parent.tagName.toLowerCase() === 'tbody') {
              return current;
            }
          }
          current = current.parentElement;
        }
        return null;
      }
      
      function getRowPosition(row) {
        const tbody = row.parentElement;
        if (!tbody || tbody.tagName.toLowerCase() !== 'tbody') return null;
        
        const rows = Array.from(tbody.children).filter(el => el.tagName.toLowerCase() === 'tr');
        const index = rows.indexOf(row);
        return index >= 0 ? index + 1 : null;
      }
      
      function getSelector(element) {
        const tagName = element.tagName.toLowerCase();
        
        if (element.hasAttribute('data-testid')) {
          return `[data-testid="${element.getAttribute('data-testid')}"]`;
        }
        
        if (element.hasAttribute('data-test')) {
          return `[data-test="${element.getAttribute('data-test')}"]`;
        }
        
        if (element.hasAttribute('placeholder')) {
          return `[placeholder="${element.getAttribute('placeholder')}"]`;
        }
        
        if (element.hasAttribute('aria-label')) {
          return `[aria-label="${element.getAttribute('aria-label')}"]`;
        }
        
        if (element.hasAttribute('name') && (tagName === 'input' || tagName === 'select' || tagName === 'textarea')) {
          return `[name="${element.getAttribute('name')}"]`;
        }
        
        if (tagName === 'input' && element.hasAttribute('type')) {
          const type = element.getAttribute('type');
          if (type !== 'button' && type !== 'submit') {
            return `input[type="${type}"]`;
          }
        }
        
        const explicitRole = element.hasAttribute('role') ? element.getAttribute('role') : null;
        const implicitRole = getImplicitRole(element);
        const role = explicitRole || implicitRole;
        
            if (role && element.textContent?.trim() && (tagName === 'button' || tagName === 'a' || role === 'button' || role === 'link' || role === 'menuitem')) {
              let text = '';
              for (let node of element.childNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                  text += node.textContent;
                }
              }
              text = text.trim();
              
              if (!text) {
                text = element.textContent.trim().substring(0, 30);
              }
              
              if (text && text.length > 1 && text.length < 100) {
                const tableRow = findTableRow(element);
                if (tableRow) {
                  const rowIndex = getRowPosition(tableRow);
                  if (rowIndex !== null) {
                    const siblings = Array.from(tableRow.querySelectorAll(`[role="${role}"], ${tagName}`))
                      .filter(el => {
                        const elRole = el.hasAttribute('role') ? el.getAttribute('role') : getImplicitRole(el);
                        if (elRole !== role) return false;
                        
                        let elText = '';
                        for (let node of el.childNodes) {
                          if (node.nodeType === Node.TEXT_NODE) {
                            elText += node.textContent;
                          }
                        }
                        elText = elText.trim();
                        if (!elText) {
                          elText = el.textContent.trim().substring(0, 30);
                        }
                        return elText === text;
                      });
                    
                    if (siblings.length > 1) {
                      const elementIndex = siblings.indexOf(element);
                      if (elementIndex >= 0) {
                        return `table-row:${rowIndex}:${role}:${text}:${elementIndex}`;
                      }
                    }
                    return `table-row:${rowIndex}:${role}:${text}`;
                  }
                }
                
                if (role === 'menuitem') {
                  const menu = element.closest('[role="menu"], [role="listbox"]');
                  if (menu) {
                    const menuItems = Array.from(menu.querySelectorAll('[role="menuitem"]'))
                      .filter(el => {
                        let elText = '';
                        for (let node of el.childNodes) {
                          if (node.nodeType === Node.TEXT_NODE) {
                            elText += node.textContent;
                          }
                        }
                        elText = elText.trim();
                        if (!elText) {
                          elText = el.textContent.trim().substring(0, 30);
                        }
                        return elText === text;
                      });
                    
                    if (menuItems.length > 1) {
                      const elementIndex = menuItems.indexOf(element);
                      if (elementIndex >= 0) {
                        return `menu:${role}:${text}:${elementIndex}`;
                      }
                    }
                    return `menu:${role}:${text}`;
                  }
                }
                
                return `role:${role}:${text}`;
              }
            }
        
        
        if (tagName === 'label' && element.textContent?.trim()) {
          const text = element.textContent.trim().substring(0, 30);
          if (text.length > 3 && text.length < 50) {
            return `text:${tagName}:${text}`;
          }
        }
        
        if (element.id && !isAutoGeneratedId(element.id)) {
          return `#${element.id}`;
        }
        
        if (element.textContent?.trim() && !role) {
          const text = element.textContent.trim();
          if (text.length > 3 && text.length < 100) {
            return `text:${text}`;
          }
        }
        
        
        if (tagName === 'li' && element.textContent?.trim()) {
          const text = element.textContent.trim().substring(0, 30);
          if (text.length > 2 && text.length < 50) {
            return `text:li:${text}`;
          }
        }
        
        if (element.className && typeof element.className === 'string') {
          const classes = element.className.split(' ')
            .filter(c => c && 
                        !c.includes('Mui') && 
                        !c.includes('css-') && 
                        !c.startsWith('_') &&
                        c !== 'font-bold' &&
                        c !== 'text-black' &&
                        c !== 'text-white' &&
                        c !== 'bg-gray' &&
                        c !== 'bg-white' &&
                        c !== 'border' &&
                        c !== 'rounded' &&
                        c !== 'p-2' &&
                        c !== 'p-4' &&
                        c !== 'm-2' &&
                        c !== 'm-4' &&
                        c !== 'mb-4' &&
                        c !== 'mt-4' &&
                        c !== 'mb-2' &&
                        c !== 'mt-2' &&
                        c !== 'px-4' &&
                        c !== 'py-2' &&
                        c !== 'flex' &&
                        c !== 'items-center' &&
                        c !== 'justify-center' &&
                        c !== 'w-full' &&
                        c !== 'h-full' &&
                        c.length < 30)
            .slice(0, 2);
          if (classes.length > 0) {
            return `.${classes.join('.')}`;
          }
        }
        
        const parent = element.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(el => el.tagName === element.tagName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(element) + 1;
            const parentTag = parent.tagName.toLowerCase();
            if (parentTag !== 'body' && parentTag !== 'html') {
              return `${parentTag} > ${tagName}:nth-of-type(${index})`;
            }
            return `${tagName}:nth-of-type(${index})`;
          }
        }
        
        return tagName;
      }
      
      function findClosestInteractiveElement(element) {
        const interactiveElements = ['button', 'a', 'input', 'select', 'textarea', 'label'];
        
        let current = element;
        let depth = 0;
        const maxDepth = 5;
        
        while (current && depth < maxDepth) {
          const tagName = current.tagName.toLowerCase();
          
          if (interactiveElements.includes(tagName)) {
            return current;
          }
          
          if (current.hasAttribute('role')) {
            const role = current.getAttribute('role');
            if (['button', 'link', 'checkbox', 'radio', 'menuitem', 'tab'].includes(role)) {
              return current;
            }
          }
          
          if (current.hasAttribute('onclick') || current.style.cursor === 'pointer') {
            return current;
          }
          
          current = current.parentElement;
          depth++;
        }
        
        return element;
      }
      
          document.addEventListener('click', (event) => {
            const target = event.target;
            
            if (target.closest('#drunk-tester-overlay')) {
              return;
            }
            
            if (target.closest('.drunk-tester-dialog')) {
              return;
            }
            
            if (target.closest('[style*="z-index: 1000000"]')) {
              return;
            }
            
            // Check for dialog elements by placeholder text
            if (target.hasAttribute('placeholder') && 
                (target.getAttribute('placeholder').includes('login-success') || 
                 target.getAttribute('placeholder').includes('complete-flow') ||
                 target.getAttribute('placeholder').includes('e.g.'))) {
              return;
            }
            
            const interactiveElement = findClosestInteractiveElement(target);
            const selector = getSelector(interactiveElement);
            const text = interactiveElement.textContent?.trim().substring(0, 50) || '';
            
            if (waitingForAssertion === 'text') {
              console.log('Assert Text mode detected - text content:', interactiveElement.textContent?.trim());
              waitingForAssertion = null;
              if (window.assertText) {
                let textContent = interactiveElement.textContent?.trim() || '';
                
                // For input fields, use the value instead of text content
                if (interactiveElement.tagName.toLowerCase() === 'input' && interactiveElement.value) {
                  textContent = interactiveElement.value;
                }
                
                if (textContent) {
                  console.log('Creating assertion with text:', textContent);
                  window.assertText('text:' + textContent, textContent, textContent);
                } else {
                  console.log('No text content found, skipping assertion');
                }
              }
            } else if (window.recordClick) {
              console.log('Recording regular click - waitingForAssertion:', waitingForAssertion);
              window.recordClick(selector, text);
            }
          }, true);
      
      const inputTracking = new Map();
      
          document.addEventListener('input', (event) => {
            const target = event.target;
            
            if (target.closest('#drunk-tester-overlay')) {
              return;
            }
            
            if (target.closest('.drunk-tester-dialog')) {
              return;
            }
            
            if (target.hasAttribute('placeholder') && 
                (target.getAttribute('placeholder').includes('login-success') || 
                 target.getAttribute('placeholder').includes('complete-flow') ||
                 target.getAttribute('placeholder').includes('e.g.'))) {
              return;
            }
            
            const tagName = target.tagName.toLowerCase();
            
            if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable) {
          const selector = getSelector(target);
          const value = target.value || target.textContent || '';
          const inputType = target.getAttribute('type') || 'text';
          
          if (inputTracking.has(selector)) {
            clearTimeout(inputTracking.get(selector).timeout);
          }
          
          const timeout = setTimeout(() => {
            if (window.recordInput && value) {
              window.recordInput(selector, value, inputType);
            }
            inputTracking.delete(selector);
          }, 1000);
          
          inputTracking.set(selector, { value, timeout });
        }
      }, true);
      
          document.addEventListener('blur', (event) => {
            const target = event.target;
            
            if (target.closest('#drunk-tester-overlay')) {
              return;
            }
            
            if (target.closest('.drunk-tester-dialog')) {
              return;
            }
            
            if (target.hasAttribute('placeholder') && 
                (target.getAttribute('placeholder').includes('login-success') || 
                 target.getAttribute('placeholder').includes('complete-flow') ||
                 target.getAttribute('placeholder').includes('e.g.'))) {
              return;
            }
            
            const tagName = target.tagName.toLowerCase();
            
            if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable) {
          const selector = getSelector(target);
          const value = target.value || target.textContent || '';
          const inputType = target.getAttribute('type') || 'text';
          
          if (inputTracking.has(selector)) {
            clearTimeout(inputTracking.get(selector).timeout);
            inputTracking.delete(selector);
          }
          
          if (window.recordInput && value) {
            window.recordInput(selector, value, inputType);
          }
        }
      }, true);
      
      document.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'T') {
          event.preventDefault();
          if (window.recordTestBreak) {
            window.recordTestBreak();
          }
        }
      }, true);
      
      const overlay = document.createElement('div');
      overlay.id = 'drunk-tester-overlay';
      overlay.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 999999; background: rgba(0,0,0,0.8); color: white; padding: 15px; border-radius: 12px; font-family: Arial, sans-serif; font-size: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); user-select: none; backdrop-filter: blur(10px);';
      overlay.innerHTML = '<div style="display: flex; flex-direction: column; gap: 6px;"><div style="text-align: center; margin-bottom: 5px; font-weight: bold; color: #ff6b6b;">🔴 RECORDING</div><button id="finish-before-each" style="background: #28a745; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 10px; transition: all 0.2s;">Finish BeforeEach</button><button id="split-test" style="background: #007acc; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 10px; transition: all 0.2s;">Split Test</button><div style="border-top: 1px solid #555; margin: 4px 0;"></div><button id="assert-text" style="background: #ffc107; color: black; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 10px; transition: all 0.2s;">Assert Text</button><button id="assert-url" style="background: #ffc107; color: black; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 10px; transition: all 0.2s;">Assert URL</button><div style="border-top: 1px solid #555; margin: 4px 0;"></div><button id="new-test-suite" style="background: #6f42c1; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 10px; transition: all 0.2s;">New Test Suite</button><button id="finish-recording" style="background: #dc3545; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 10px; transition: all 0.2s;">Finish & Save</button></div>';
      
      console.log('Creating drunk-tester overlay...');
      console.log('Available functions:', {
        recordClick: !!window.recordClick,
        startAssertText: !!window.startAssertText,
        getWaitingForAssertion: !!window.getWaitingForAssertion,
        assertText: !!window.assertText
      });
      
      if (document.body) {
        document.body.appendChild(overlay);
        console.log('Overlay added to body');
        
        document.getElementById('finish-before-each').addEventListener('click', () => {
          if (window.finishBeforeEach) {
            window.finishBeforeEach();
          }
        });
        
        document.getElementById('split-test').addEventListener('click', () => {
          if (window.recordTestBreak) {
            window.recordTestBreak();
          }
        });
        
        document.getElementById('new-test-suite').addEventListener('click', () => {
          if (window.startNewTestSuite) {
            window.startNewTestSuite();
          }
        });
        
        document.getElementById('finish-recording').addEventListener('click', () => {
          if (window.finishRecording) {
            window.finishRecording();
          }
        });
        
        
        document.getElementById('assert-text').addEventListener('click', () => {
          if (window.startAssertText) {
            waitingForAssertion = 'text';
            window.startAssertText();
          }
        });
        
        
        document.getElementById('assert-url').addEventListener('click', () => {
          const currentURL = window.location.href;
          
          const dialog = document.createElement('div');
          dialog.className = 'drunk-tester-dialog';
          dialog.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000000; display: flex; align-items: center; justify-content: center;';
          
          const dialogContent = document.createElement('div');
          dialogContent.style.cssText = 'background: white; padding: 20px; border-radius: 8px; min-width: 400px; max-width: 600px;';
          dialogContent.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #333;">Assert URL</h3>
            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Enter the expected URL:</p>
            <input type="text" id="url-input" value="${currentURL}" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 15px; font-size: 14px;">
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
              <button id="url-cancel" style="padding: 8px 16px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
              <button id="url-ok" style="padding: 8px 16px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer;">OK</button>
            </div>
          `;
          
          dialog.appendChild(dialogContent);
          document.body.appendChild(dialog);
          
          const urlInput = dialog.querySelector('#url-input');
          urlInput.focus();
          urlInput.select();
          
          dialog.querySelector('#url-cancel').addEventListener('click', () => {
            document.body.removeChild(dialog);
          });
          
          dialog.querySelector('#url-ok').addEventListener('click', () => {
            const expectedURL = urlInput.value.trim();
            if (expectedURL && window.assertURL) {
              window.assertURL(expectedURL);
            }
            document.body.removeChild(dialog);
          });
          
          urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              const expectedURL = urlInput.value.trim();
              if (expectedURL && window.assertURL) {
                window.assertURL(expectedURL);
              }
              document.body.removeChild(dialog);
            } else if (e.key === 'Escape') {
              document.body.removeChild(dialog);
            }
          });
        });
        
        const buttons = overlay.querySelectorAll('button');
        buttons.forEach(button => {
          button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.05)';
            button.style.opacity = '0.9';
          });
          
          button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.opacity = '1';
          });
        });
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          document.body.appendChild(overlay);
          console.log('Overlay added to body after DOMContentLoaded');
          
          document.getElementById('finish-before-each').addEventListener('click', () => {
            if (window.finishBeforeEach) {
              window.finishBeforeEach();
            }
          });
          
          document.getElementById('split-test').addEventListener('click', () => {
            if (window.recordTestBreak) {
              window.recordTestBreak();
            }
          });
          
          document.getElementById('finish-recording').addEventListener('click', () => {
            if (window.finishRecording) {
              window.finishRecording();
            }
          });
          
          document.getElementById('new-test-suite').addEventListener('click', () => {
            if (window.startNewTestSuite) {
              window.startNewTestSuite();
            }
          });
          
          document.getElementById('assert-text').addEventListener('click', () => {
            if (window.startAssertText) {
              waitingForAssertion = 'text';
              window.startAssertText();
            }
          });
          
          
          document.getElementById('assert-url').addEventListener('click', () => {
            const currentURL = window.location.href;
            
            const dialog = document.createElement('div');
            dialog.className = 'drunk-tester-dialog';
            dialog.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000000; display: flex; align-items: center; justify-content: center;';
            
            const dialogContent = document.createElement('div');
            dialogContent.style.cssText = 'background: white; padding: 20px; border-radius: 8px; min-width: 400px; max-width: 600px;';
            dialogContent.innerHTML = `
              <h3 style="margin: 0 0 15px 0; color: #333;">Assert URL</h3>
              <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Enter the expected URL:</p>
              <input type="text" id="url-input" value="${currentURL}" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 15px; font-size: 14px;">
              <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="url-cancel" style="padding: 8px 16px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button id="url-ok" style="padding: 8px 16px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer;">OK</button>
              </div>
            `;
            
            dialog.appendChild(dialogContent);
            document.body.appendChild(dialog);
            
            const urlInput = dialog.querySelector('#url-input');
            urlInput.focus();
            urlInput.select();
            
            dialog.querySelector('#url-cancel').addEventListener('click', () => {
              document.body.removeChild(dialog);
            });
            
            dialog.querySelector('#url-ok').addEventListener('click', () => {
              const expectedURL = urlInput.value.trim();
              if (expectedURL && window.assertURL) {
                window.assertURL(expectedURL);
              }
              document.body.removeChild(dialog);
            });
            
            urlInput.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') {
                const expectedURL = urlInput.value.trim();
                if (expectedURL && window.assertURL) {
                  window.assertURL(expectedURL);
                }
                document.body.removeChild(dialog);
              } else if (e.key === 'Escape') {
                document.body.removeChild(dialog);
              }
            });
          });
          
          const buttons = overlay.querySelectorAll('button');
          buttons.forEach(button => {
            button.addEventListener('mouseenter', () => {
              button.style.transform = 'scale(1.05)';
              button.style.opacity = '0.9';
            });
            
            button.addEventListener('mouseleave', () => {
              button.style.transform = 'scale(1)';
              button.style.opacity = '1';
            });
          });
        });
      }
    });

    if (this.page.url() !== 'about:blank') {
      await this.page.reload();
    }
  }

  stop() {
    if (this.isFinishing) {
      logger.verbose('Already finishing, skipping stop()');
      return;
    }
    
    this.isRecording = false;
    logger.verbose('Stopped action recorder');
    
    try {
      this.page.evaluate(() => {
        const overlay = document.getElementById('drunk-tester-overlay');
        if (overlay) {
          overlay.remove();
        }
      });
    } catch (error) {
      logger.verbose('Could not remove overlay (page may be closed)');
    }
  }

  getActions() {
    return this.actions;
  }

  getActionCount() {
    return this.actions.length;
  }
}

module.exports = { Recorder };

