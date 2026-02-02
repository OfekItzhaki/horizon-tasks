#!/usr/bin/env node

/**
 * Quick script to test if Metro can resolve @tasks-management/frontend-services
 * Run this before triggering an EAS build to save time
 */

const path = require('path');
const fs = require('fs');

const mobileAppRoot = path.resolve(__dirname, '..');
const nodeModulesPath = path.resolve(mobileAppRoot, 'node_modules/@tasks-management/frontend-services');
const packageJsonPath = path.join(nodeModulesPath, 'package.json');
const distIndexPath = path.join(nodeModulesPath, 'dist/index.js');

console.log('Testing Metro package resolution...\n');

console.log('1. Checking node_modules location...');
if (fs.existsSync(nodeModulesPath)) {
  console.log('   ✅ Package found in node_modules');
  const stats = fs.lstatSync(nodeModulesPath);
  if (stats.isSymbolicLink()) {
    const realPath = fs.realpathSync(nodeModulesPath);
    console.log(`   📦 Symlink points to: ${realPath}`);
  }
} else {
  console.log('   ❌ Package NOT found in node_modules');
  console.log('   Run: npm install');
  process.exit(1);
}

console.log('\n2. Checking package.json...');
if (fs.existsSync(packageJsonPath)) {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  console.log('   ✅ package.json exists');
  console.log(`   📝 main: ${pkg.main}`);
  console.log(`   📝 react-native: ${pkg['react-native']}`);
} else {
  console.log('   ❌ package.json NOT found');
  process.exit(1);
}

console.log('\n3. Checking dist/index.js...');
if (fs.existsSync(distIndexPath)) {
  console.log('   ✅ dist/index.js exists');
} else {
  console.log('   ❌ dist/index.js NOT found');
  console.log('   Run: cd ../frontend-services && npm run build');
  process.exit(1);
}

console.log('\n4. Testing require resolution...');
try {
  const resolved = require.resolve('@tasks-management/frontend-services');
  console.log(`   ✅ Package resolves to: ${resolved}`);
} catch (e) {
  console.log(`   ❌ Failed to resolve package: ${e.message}`);
  process.exit(1);
}

console.log('\n✅ All checks passed! Metro should be able to resolve the package.');
console.log('💡 You can now test with: npx expo start --no-dev --minify');
