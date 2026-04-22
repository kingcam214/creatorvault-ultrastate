#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../client/src/App.tsx');

function findRouteOwner(route) {
  const content = fs.readFileSync(appPath, 'utf8');
  const lines = content.split('\n');

  // Find the Route line
  const routeLine = lines.find(line => line.includes(`path={"${route}"}`));
  if (!routeLine) return null;

  // Extract component name
  const componentMatch = routeLine.match(/component=\{(\w+)\}/);
  if (!componentMatch) return null;

  const componentName = componentMatch[1];

  // Find import line
  const importLine = lines.find(line => line.includes(`import ${componentName} from`));
  if (!importLine) return null;

  const importMatch = importLine.match(/from ["'](.+)["']/);
  if (!importMatch) return null;

  return {
    route,
    component: componentName,
    file: importMatch[1].replace('./', 'client/src/')
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