#!/usr/bin/env node

/**
 * Version bump script for mobile-app
 * Usage: node scripts/bump-version.js [patch|minor|major]
 */

const fs = require('fs');
const path = require('path');

const versionType = process.argv[2] || 'patch';
const validTypes = ['patch', 'minor', 'major'];

if (!validTypes.includes(versionType)) {
  console.error(`Invalid version type: ${versionType}`);
  console.error(`Usage: node scripts/bump-version.js [patch|minor|major]`);
  process.exit(1);
}

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const appJsonPath = path.join(__dirname, '..', 'app.json');

// Read current versions
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

const currentVersion = packageJson.version;
const versionParts = currentVersion.split('.').map(Number);

// Bump version
let newVersion;
if (versionType === 'patch') {
  versionParts[2] += 1;
} else if (versionType === 'minor') {
  versionParts[1] += 1;
  versionParts[2] = 0;
} else if (versionType === 'major') {
  versionParts[0] += 1;
  versionParts[1] = 0;
  versionParts[2] = 0;
}

newVersion = versionParts.join('.');

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

// Update app.json
appJson.expo.version = newVersion;
if (appJson.expo.android) {
  appJson.expo.android.versionCode = (appJson.expo.android.versionCode || 0) + 1;
}
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');

console.log(`✅ Version bumped from ${currentVersion} to ${newVersion} (${versionType})`);
console.log(`📱 Android versionCode: ${appJson.expo.android?.versionCode || 'N/A'}`);
