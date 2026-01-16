// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add parent directory to nodeModulesPaths so Metro can find frontend-services
config.resolver.nodeModulesPaths = [
  ...(config.resolver.nodeModulesPaths || []),
  path.resolve(__dirname, '..'),
];

// Find the frontend-services package location
const nodeModulesPath = path.resolve(__dirname, 'node_modules/@tasks-management/frontend-services');
const relativePath = path.resolve(__dirname, '../frontend-services');

// Determine which path exists
let frontendServicesPath = null;
if (fs.existsSync(nodeModulesPath)) {
  try {
    const stats = fs.lstatSync(nodeModulesPath);
    frontendServicesPath = stats.isSymbolicLink() ? fs.realpathSync(nodeModulesPath) : nodeModulesPath;
  } catch (e) {
    // Fall through
  }
}
if (!frontendServicesPath && fs.existsSync(relativePath)) {
  frontendServicesPath = relativePath;
}

// Map the package in extraNodeModules
// When Metro resolves @tasks-management/frontend-services, it will:
// 1. Look in extraNodeModules (mapped here)
// 2. Read package.json "main" field (dist/index.js)
// 3. Resolve to that file
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@tasks-management/frontend-services': frontendServicesPath || nodeModulesPath || relativePath,
};

// Custom resolver to handle the package
// This MUST intercept before Metro's default resolution
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle @tasks-management/frontend-services (main package) - intercept FIRST
  if (moduleName === '@tasks-management/frontend-services') {
    // Build all possible paths to check
    const pathsToCheck = [];
    
    // Add paths based on what we found
    if (frontendServicesPath) {
      pathsToCheck.push(path.resolve(frontendServicesPath, 'dist/index.js'));
    }
    
    // Always check node_modules (EAS build)
    pathsToCheck.push(path.resolve(nodeModulesPath, 'dist/index.js'));
    
    // Always check relative path (local dev / fallback)
    pathsToCheck.push(path.resolve(relativePath, 'dist/index.js'));
    
    // Also check if extraNodeModules path exists
    const extraNodeModulesPath = config.resolver.extraNodeModules?.['@tasks-management/frontend-services'];
    if (extraNodeModulesPath) {
      pathsToCheck.push(path.resolve(extraNodeModulesPath, 'dist/index.js'));
    }
    
    // Try each path
    for (const mainPath of pathsToCheck) {
      try {
        if (fs.existsSync(mainPath)) {
          return {
            type: 'sourceFile',
            filePath: mainPath,
          };
        }
      } catch (e) {
        // Continue to next path
      }
    }
  }
  
  // Handle subpath exports (legacy)
  if (
    moduleName === '@tasks-management/frontend-services/i18n' ||
    moduleName === '@tasks-management/frontend-services/dist/i18n'
  ) {
    const i18nPaths = [
      frontendServicesPath ? path.resolve(frontendServicesPath, 'dist/i18n/index.js') : null,
      path.resolve(nodeModulesPath, 'dist/i18n/index.js'),
      path.resolve(relativePath, 'dist/i18n/index.js'),
    ].filter(Boolean);
    
    for (const i18nPath of i18nPaths) {
      try {
        if (fs.existsSync(i18nPath)) {
          return {
            type: 'sourceFile',
            filePath: i18nPath,
          };
        }
      } catch (e) {
        // Continue
      }
    }
  }
  
  // Use default resolver for everything else
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
