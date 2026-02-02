#!/usr/bin/env node

/**
 * Ensure frontend-services is built after npm install.
 * This is a safety net to ensure dist folder exists for Metro bundler.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const mobileAppRoot = path.resolve(__dirname, '..');
const frontendServicesPath = path.resolve(mobileAppRoot, '..', 'frontend-services');
const distPath = path.join(frontendServicesPath, 'dist');
const distIndexPath = path.join(distPath, 'index.js');

if (!fs.existsSync(distIndexPath)) {
  console.log('frontend-services dist/index.js not found, building...');
  try {
    execSync('npm run build', {
      stdio: 'inherit',
      cwd: frontendServicesPath,
    });
    console.log('frontend-services built successfully');
  } catch (error) {
    console.warn('Warning: Could not build frontend-services automatically.');
    console.warn('You may need to run "npm run build" in frontend-services manually.');
  }
} else {
  console.log('frontend-services dist folder exists, skipping build');
}
