const fs = require('fs');
const path = require('path');
const logger = require('./logger');

function generateClickAction(selector) {
  if (selector.startsWith('table-row:')) {
    const parts = selector.split(':');
    const rowIndex = parseInt(parts[1]);
    const role = parts[2];
    
    const lastPart = parts[parts.length - 1];
    const isIndexed = !isNaN(parseInt(lastPart));
    
    if (isIndexed) {
      const elementIndex = parseInt(lastPart);
      const name = parts.slice(3, -1).join(':');
      return `page.locator('tbody tr').nth(${rowIndex - 1}).getByRole('${role}', { name: '${name}' }).nth(${elementIndex}).click()`;
    } else {
      const name = parts.slice(3).join(':');
      return `page.locator('tbody tr').nth(${rowIndex - 1}).getByRole('${role}', { name: '${name}' }).click()`;
    }
  } else if (selector.startsWith('menu:')) {
    const parts = selector.split(':');
    const role = parts[1];
    
    const lastPart = parts[parts.length - 1];
    const isIndexed = !isNaN(parseInt(lastPart));
    
    if (isIndexed) {
      const elementIndex = parseInt(lastPart);
      const name = parts.slice(2, -1).join(':');
      return `page.getByRole('${role}', { name: '${name}', exact: true }).nth(${elementIndex}).click()`;
    } else {
      const name = parts.slice(2).join(':');
      return `page.getByRole('${role}', { name: '${name}', exact: true }).click()`;
    }
  } else if (selector.startsWith('role:')) {
    const parts = selector.split(':');
    const role = parts[1];
    const name = parts.slice(2).join(':');
    return `page.getByRole('${role}', { name: '${name}' }).click()`;
  } else if (selector.startsWith('text:')) {
    const parts = selector.split(':');
    const tagName = parts[1];
    const text = parts.slice(2).join(':');
    
    if (tagName === 'li') {
      return `page.getByText('${text}').click()`;
    } else {
      return `page.getByText('${text}').click()`;
    }
  } else {
    return `page.click('${selector}')`;
  }
}

function generateFillAction(selector, value) {
  const escapedValue = value.replace(/'/g, "\\'");
  
  if (selector.startsWith('table-row:')) {
    const parts = selector.split(':');
    const rowIndex = parseInt(parts[1]);
    const role = parts[2];
    
    const lastPart = parts[parts.length - 1];
    const isIndexed = !isNaN(parseInt(lastPart));
    
    if (isIndexed) {
      const elementIndex = parseInt(lastPart);
      const name = parts.slice(3, -1).join(':');
      return `page.locator('tbody tr').nth(${rowIndex - 1}).getByRole('${role}', { name: '${name}' }).nth(${elementIndex}).fill('${escapedValue}')`;
    } else {
      const name = parts.slice(3).join(':');
      return `page.locator('tbody tr').nth(${rowIndex - 1}).getByRole('${role}', { name: '${name}' }).fill('${escapedValue}')`;
    }
  } else if (selector.startsWith('role:')) {
    const parts = selector.split(':');
    const role = parts[1];
    const name = parts.slice(2).join(':');
    return `page.getByRole('${role}', { name: '${name}' }).fill('${escapedValue}')`;
  } else if (selector.startsWith('text:')) {
    const parts = selector.split(':');
    const text = parts.slice(2).join(':');
    return `page.getByText('${text}').fill('${escapedValue}')`;
  } else {
    return `page.fill('${selector}', '${escapedValue}')`;
  }
}

function generateAssertText(selector, expectedText) {
  const escapedText = expectedText.replace(/'/g, "\\'");
  
  if (selector.startsWith('table-row:')) {
    const parts = selector.split(':');
    const rowIndex = parseInt(parts[1]);
    const role = parts[2];
    const name = parts.slice(3).join(':');
    return `await expect(page.locator('tbody tr').nth(${rowIndex - 1}).getByRole('${role}', { name: '${name}' })).toHaveText('${escapedText}')`;
  } else if (selector.startsWith('menu:')) {
    const parts = selector.split(':');
    const role = parts[1];
    const name = parts.slice(2).join(':');
    return `await expect(page.getByRole('${role}', { name: '${name}', exact: true })).toHaveText('${escapedText}')`;
  } else if (selector.startsWith('role:')) {
    const parts = selector.split(':');
    const role = parts[1];
    const name = parts.slice(2).join(':');
    return `await expect(page.getByRole('${role}', { name: '${name}' })).toHaveText('${escapedText}')`;
  } else if (selector.startsWith('text:')) {
    const parts = selector.split(':');
    if (parts.length === 2) {
      const text = parts[1];
      return `await expect(page.getByText('${text}').first()).toBeVisible();\n    await expect(page.getByText('${text}').first()).toHaveText('${escapedText}')`;
    } else {
      const text = parts.slice(2).join(':');
      return `await expect(page.getByText('${text}').first()).toBeVisible();\n    await expect(page.getByText('${text}').first()).toHaveText('${escapedText}')`;
    }
  } else {
    return `await expect(page.locator('${selector}')).toHaveText('${escapedText}')`;
  }
}

function generateAssertCount(selector, expectedCount) {
  if (selector.startsWith('table-row:')) {
    const parts = selector.split(':');
    const rowIndex = parseInt(parts[1]);
    const role = parts[2];
    const name = parts.slice(3).join(':');
    return `await expect(page.locator('tbody tr').nth(${rowIndex - 1}).getByRole('${role}', { name: '${name}' })).toHaveCount(${expectedCount})`;
  } else if (selector.startsWith('menu:')) {
    const parts = selector.split(':');
    const role = parts[1];
    const name = parts.slice(2).join(':');
    return `await expect(page.getByRole('${role}', { name: '${name}', exact: true })).toHaveCount(${expectedCount})`;
  } else if (selector.startsWith('role:')) {
    const parts = selector.split(':');
    const role = parts[1];
    const name = parts.slice(2).join(':');
    return `await expect(page.getByRole('${role}', { name: '${name}' })).toHaveCount(${expectedCount})`;
  } else if (selector.startsWith('text:')) {
    const parts = selector.split(':');
    const text = parts.slice(2).join(':');
    return `await expect(page.getByText('${text}')).toHaveCount(${expectedCount})`;
  } else {
    return `await expect(page.locator('${selector}')).toHaveCount(${expectedCount})`;
  }
}

function generateAssertURL(expectedURL) {
  const escapedURL = expectedURL.replace(/'/g, "\\'");
  return `await expect(page).toHaveURL('${escapedURL}')`;
}

function generateTestFile(name, url, actions) {
  const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, '-');
  
  const testGroups = [];
  let currentGroup = [];
  let beforeEachFinished = false;
  let testNames = [];
  
  actions.forEach((action) => {
    if (action.type === 'finish-before-each') {
      if (currentGroup.length > 0) {
        testGroups.push([...currentGroup]);
        currentGroup = [];
      }
      beforeEachFinished = true;
    } else if (action.type === 'test-break') {
      if (currentGroup.length > 0) {
        testGroups.push([...currentGroup]);
        currentGroup = [];
      }
      if (action.testName) {
        testNames.push(action.testName);
      }
    } else {
      currentGroup.push(action);
    }
  });
  
  if (currentGroup.length > 0) {
    testGroups.push(currentGroup);
  }
  
  if (testGroups.length === 0) {
    return { code: '', filename: `${sanitizedName}.spec.js` };
  }
  
  const setupActions = beforeEachFinished ? testGroups[0] : [];
  const actualTestGroups = beforeEachFinished ? testGroups.slice(1) : testGroups;

  let testCode = `const { test, expect } = require('@playwright/test');

test.describe('${name}', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('${url}');
`;

  setupActions.forEach((action, index) => {
    if (action.type === 'click') {
      const actionText = action.text ? ` "${action.text.substring(0, 30)}"` : '';
      testCode += `\n    // Setup Action ${index + 1}: Click${actionText}\n`;
      testCode += `    await ${generateClickAction(action.selector)};\n`;
    } else if (action.type === 'fill') {
      const displayValue = action.value.length > 30 ? action.value.substring(0, 27) + '...' : action.value;
      testCode += `\n    // Setup Action ${index + 1}: Fill "${displayValue}"\n`;
      testCode += `    await ${generateFillAction(action.selector, action.value)};\n`;
    } else if (action.type === 'navigation') {
      testCode += `\n    // Setup Action ${index + 1}: Navigation to ${action.url}\n`;
      testCode += `    await page.waitForURL('${action.url}');\n`;
    }
  });

  testCode += `  });

`;

  actualTestGroups.forEach((group, groupIndex) => {
    let testName;
    
    if (testNames[groupIndex]) {
      testName = testNames[groupIndex];
    } else {
      testName = actualTestGroups.length === 1 && !beforeEachFinished ? name : `${name} - Part ${groupIndex + 1}`;
    }
    
    testCode += `  test('${testName}', async ({ page }) => {
`;

    group.forEach((action, index) => {
      if (action.type === 'click') {
        const actionText = action.text ? ` "${action.text.substring(0, 30)}"` : '';
        testCode += `\n    // Action ${index + 1}: Click${actionText}\n`;
        testCode += `    await ${generateClickAction(action.selector)};\n`;
      } else if (action.type === 'fill') {
        const displayValue = action.value.length > 30 ? action.value.substring(0, 27) + '...' : action.value;
        testCode += `\n    // Action ${index + 1}: Fill "${displayValue}"\n`;
        testCode += `    await ${generateFillAction(action.selector, action.value)};\n`;
      } else if (action.type === 'navigation') {
        testCode += `\n    // Action ${index + 1}: Navigation to ${action.url}\n`;
        testCode += `    await page.waitForURL('${action.url}');\n`;
          } else if (action.type === 'assert-text') {
            const actionText = action.text ? ` "${action.text.substring(0, 30)}"` : '';
            testCode += `\n    // Action ${index + 1}: Assert Text${actionText} = "${action.expectedText}"\n`;
            testCode += `    ${generateAssertText(action.selector, action.expectedText)};\n`;
          } else if (action.type === 'assert-count') {
        const actionText = action.text ? ` "${action.text.substring(0, 30)}"` : '';
        testCode += `\n    // Action ${index + 1}: Assert Count${actionText} = ${action.expectedCount}\n`;
        testCode += `    ${generateAssertCount(action.selector, action.expectedCount)};\n`;
      } else if (action.type === 'assert-url') {
        testCode += `\n    // Action ${index + 1}: Assert URL = "${action.expectedURL}"\n`;
        testCode += `    await page.waitForTimeout(1000);\n    ${generateAssertURL(action.expectedURL)};\n`;
      }
    });

    testCode += `  });
`;
  });

  testCode += `});
`;

  return { code: testCode, filename: `${sanitizedName}.spec.js` };
}

function saveTestFile(name, url, actions) {
  const { code, filename } = generateTestFile(name, url, actions);
  
  const testsDir = path.join(process.cwd(), 'tests');
  if (!fs.existsSync(testsDir)) {
    fs.mkdirSync(testsDir, { recursive: true });
    logger.verbose('Created tests directory');
  }
  
  const filePath = path.join(testsDir, filename);
  fs.writeFileSync(filePath, code, 'utf8');
  
  logger.info(`Test saved: tests/${filename}`);
  logger.verbose(`Total actions recorded: ${actions.length}`);
  
  return filePath;
}

module.exports = {
  generateTestFile,
  saveTestFile
};

