#!/usr/bin/env node

import { execSync } from 'child_process';

// Task allowlists
const ALLOWLISTS = {
  homepage: [
    'client/src/pages/Home.tsx',
    'client/src/index.css',
    'client/index.html',
    'package.json',
    'pnpm-lock.yaml'
  ],
  vaultx: [
    'client/src/pages/VaultX.tsx',
    'client/src/pages/VaultXFanLibrary.tsx',
    'client/src/pages/VaultXEditor.tsx',
    'client/src/pages/VaultXStudio.tsx',
    'server/routers/vaultxRouter.ts',
    'server/routers/videoUploadRouter.ts',
    'server/_core/stripeWebhook.ts',
    'server/_core/index.ts',
    'server/routers/standaloneAuth.ts',
    'scripts/route-owner.js',
    'scripts/scope-guard.js',
    'client/src/index.css',
    'client/index.html'
  ],
  navigation: [
    'client/src/App.tsx',
    'client/src/components/AppHeader.tsx'
  ]
};

function getChangedFiles() {
  try {
    const output = execSync('git diff --name-only HEAD', { encoding: 'utf8' });
    return output.trim().split('\n').filter(Boolean);
  } catch (e) {
    console.log('No previous commit found, checking staged files...');
    const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return output.trim().split('\n').filter(Boolean);
  }
}

function checkScope(task, changedFiles) {
  const allowlist = ALLOWLISTS[task];
  if (!allowlist) {
    console.log(`Unknown task: ${task}`);
    return false;
  }

  const violations = changedFiles.filter(file => !allowlist.includes(file));

  if (violations.length > 0) {
    console.log(`❌ SCOPE VIOLATION: Task "${task}" can only modify:`);
    allowlist.forEach(file => console.log(`  ✅ ${file}`));
    console.log(`\n🚫 But you changed:`);
    violations.forEach(file => console.log(`  ❌ ${file}`));
    return false;
  }

  console.log(`✅ SCOPE CHECK PASSED: Task "${task}" only modified allowed files`);
  return true;
}

// CLI usage
const task = process.argv[2];
if (!task) {
  console.log('Usage: node scope-guard.js <task>');
  console.log('Available tasks:', Object.keys(ALLOWLISTS).join(', '));
  process.exit(1);
}

const changedFiles = getChangedFiles();
console.log('Changed files:', changedFiles);

const passed = checkScope(task, changedFiles);
process.exit(passed ? 0 : 1);