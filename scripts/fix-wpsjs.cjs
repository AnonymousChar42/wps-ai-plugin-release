#!/usr/bin/env node

/**
 * Fix for wpsjs@2.2.3 UnhandledPromiseRejection bug
 *
 * The debug() function in node_modules/wpsjs/src/lib/debug.js doesn't return
 * the Promise and doesn't have a .catch() handler, causing UnhandledPromiseRejection.
 *
 * This script applies the fix automatically after npm install.
 */

const fs = require('fs');
const path = require('path');

const workspaceRoot = path.join(__dirname, '..');
const subprojects = [
  'wps-plugin-excel',
  'wps-plugin-ppt',
  'wps-plugin-word'
];

const fixedCode = `async function debug(...options) {
	const xmlDebug = require('./debug_xmlplugin')
	const publishDebug = require('./debug_publish')
	return needPublishDebug().then(b=>{
		return b ? publishDebug.debug(...options) : xmlDebug(...options)
	}).catch(err => {
		console.error('Debug error:', err.message)
		throw err
	})
}`;

try {
  let fixedCount = 0;

  // Determine possible wpsjs paths
  const possiblePaths = [];

  // Path 1: In workspace root node_modules/.pnpm (pnpm workspace)
  possiblePaths.push(path.join(
    workspaceRoot,
    'node_modules/.pnpm/wpsjs@2.2.3/node_modules/wpsjs/src/lib/debug.js'
  ));

  // Path 2: In each subproject's node_modules (npm/yarn style)
  for (const project of subprojects) {
    possiblePaths.push(path.join(
      workspaceRoot,
      project,
      'node_modules/wpsjs/src/lib/debug.js'
    ));
  }

  for (const debugFilePath of possiblePaths) {
    if (!fs.existsSync(debugFilePath)) {
      continue;
    }

    let content = fs.readFileSync(debugFilePath, 'utf-8');

    // Check if already fixed
    if (content.includes('return needPublishDebug()') && content.includes('.catch(err')) {
      continue;
    }

    // Apply the fix - match the broken debug function
    const brokenPattern = /async function debug\([^)]*\)\s*\{\s*const xmlDebug = require\('\.\/debug_xmlplugin'\)\s*const publishDebug = require\('\.\/debug_publish'\)\s*needPublishDebug\(\)\.then\([^}]*\{[^}]*return[^}]*\}[^}]*\)\s*\}/;
    if (brokenPattern.test(content)) {
      content = content.replace(brokenPattern, fixedCode);
      fs.writeFileSync(debugFilePath, content, 'utf-8');
      console.log(`✓ Fixed wpsjs at ${debugFilePath}`);
      fixedCount++;
    }
  }

  if (fixedCount === 0) {
    console.log('ℹ wpsjs not found or already fixed.');
  } else {
    console.log(`✓ Successfully applied fix to ${fixedCount} file(s)`);
  }
} catch (error) {
  console.error('Failed to apply wpsjs fix:', error.message);
  process.exit(1);
}
