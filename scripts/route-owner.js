#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appPath = path.join(__dirname, '../client/src/App.tsx');

function normalizeImportPath(importPath) {
  return importPath.replace(/^@\//, 'client/src/').replace(/^\.\//, 'client/src/');
}

function routePatternMatches(pattern, route) {
  if (pattern === route) return true;
  const patternParts = pattern.split('/').filter(Boolean);
  const routeParts = route.split('/').filter(Boolean);
  if (patternParts.length !== routeParts.length) return false;
  return patternParts.every((part, index) => part.startsWith(':') || part === routeParts[index]);
}

function findRouteOwner(route) {
  const content = fs.readFileSync(appPath, 'utf8');
  const lines = content.split('\n');

  const routeEntries = lines.map(line => {
    const normalized = line.replace(/\s+/g, ' ');
    const pathMatch = normalized.match(/path=\{?["']([^"']+)["']\}?/);
    const componentMatch = normalized.match(/component=\{(\w+)\}/);
    if (!pathMatch || !componentMatch) return null;
    return { path: pathMatch[1], componentName: componentMatch[1] };
  }).filter(Boolean);

  const routeEntry = routeEntries.find(entry => routePatternMatches(entry.path, route));
  if (!routeEntry) return null;

  const { componentName } = routeEntry;
  const defaultImportLine = lines.find(line => line.includes(`import ${componentName} from`));
  const namedImportLine = lines.find(line => line.includes(componentName) && line.includes('import {') && line.includes('} from'));
  const importLine = defaultImportLine || namedImportLine;
  if (!importLine) return null;

  const importMatch = importLine.match(/from ["'](.+)["']/);
  if (!importMatch) return null;

  return {
    route,
    matchedPath: routeEntry.path,
    component: componentName,
    file: normalizeImportPath(importMatch[1])
  };
}

// CLI usage
const route = process.argv[2];
if (!route) {
  console.log('Usage: node route-owner.js <route>');
  console.log('Example: node route-owner.js /');
  process.exit(1);
}

const result = findRouteOwner(route);
if (result) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Route "${route}" not found`);
}