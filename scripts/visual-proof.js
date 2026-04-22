#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Simple screenshot script using a headless browser command
// Assumes playwright or similar is available

const TASKS = {
  homepage: {
    url: 'http://localhost:5000/',
    viewport: { width: 375, height: 667 } // Mobile
  },
  vaultx: {
    url: 'http://localhost:5000/vaultx',
    viewport: { width: 375, height: 667 }
  }
};

function takeScreenshot(task, phase) {
  const config = TASKS[task];
  if (!config) {
    console.log(`Unknown task: ${task}`);
    return;
  }

  const outputDir = path.join(__dirname, '../e2e-results', task);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `${phase}-${Date.now()}.png`;
  const filepath = path.join(outputDir, filename);

  // Using npx playwright screenshot (if available)
  const command = `npx playwright screenshot --viewport-size=${config.viewport.width},${config.viewport.height} ${config.url} ${filepath}`;

  console.log(`Taking ${phase} screenshot for ${task}...`);
  console.log(`Command: ${command}`);

  try {
    require('child_process').execSync(command, { stdio: 'inherit' });
    console.log(`✅ Screenshot saved: ${filepath}`);
  } catch (e) {
    console.log(`❌ Screenshot failed. Make sure playwright is installed: npm install -D @playwright/test`);
    console.log(`Manual command: ${command}`);
  }
}

// CLI usage
const [,, task, phase] = process.argv;
if (!task || !phase) {
  console.log('Usage: npm run visual-proof <task> <before|after>');
  console.log('Tasks:', Object.keys(TASKS).join(', '));
  process.exit(1);
}

takeScreenshot(task, phase);