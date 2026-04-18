#!/usr/bin/env node
/**
 * ROUTER GUARDIAN v1.0
 * Audits all router imports in routers.ts and reports missing files.
 * Usage: node router-guardian.mjs [audit|fix|report]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROUTERS_TS = path.join(__dirname, 'server/routers.ts');
const ROUTERS_DIR = path.join(__dirname, 'server/routers');
const LOG_FILE = path.join(__dirname, 'guardian_audit.log');

function parseImports(content) {
  const imports = [];
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.includes('from') && line.includes('./routers/')) {
      const start = line.indexOf('./routers/') + './routers/'.length;
      let end = line.length;
      for (const ec of ['"', "'", ';', ' ']) {
        const pos = line.indexOf(ec, start);
        if (pos > 0 && pos < end) end = pos;
      }
      const name = line.slice(start, end).trim().replace(/\.js$/, '').replace(/\.ts$/, '');
      if (name) imports.push(name);
    }
  }
  return imports;
}

function checkExists(name) {
  const base = path.join(ROUTERS_DIR, name);
  return fs.existsSync(base + '.ts') || fs.existsSync(base + '.js');
}

function audit() {
  const content = fs.readFileSync(ROUTERS_TS, 'utf8');
  const imports = parseImports(content);
  const missing = imports.filter(i => !checkExists(i));
  const present = imports.filter(i => checkExists(i));
  
  const result = {
    timestamp: new Date().toISOString(),
    total: imports.length,
    present: present.length,
    missing: missing.length,
    missingList: missing,
    health: missing.length === 0 ? 'HEALTHY' : missing.length < 10 ? 'WARNING' : 'CRITICAL'
  };
  
  fs.writeFileSync(LOG_FILE, JSON.stringify(result, null, 2));
  return result;
}

function report() {
  const result = audit();
  console.log('\n=== ROUTER GUARDIAN AUDIT ===');
  console.log(`Timestamp: ${result.timestamp}`);
  console.log(`Status: ${result.health}`);
  console.log(`Total imports: ${result.total}`);
  console.log(`Present: ${result.present}`);
  console.log(`Missing: ${result.missing}`);
  if (result.missingList.length > 0) {
    console.log('\nMissing routers:');
    result.missingList.forEach(r => console.log(`  ❌ ${r}`));
  } else {
    console.log('\n✅ All routers present!');
  }
  console.log('\n=============================\n');
  return result;
}

const mode = process.argv[2] || 'report';
if (mode === 'audit' || mode === 'report') {
  const result = report();
  process.exit(result.missing > 0 ? 1 : 0);
} else if (mode === 'json') {
  const result = audit();
  console.log(JSON.stringify(result));
  process.exit(result.missing > 0 ? 1 : 0);
} else {
  console.log('Usage: node router-guardian.mjs [audit|report|json]');
  process.exit(1);
}
