// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Find frontend-services package location
const nodeModulesPath = path.resolve(__dirname, 'node_modules/@tasks-management/frontend-services');
const relativePath = path.resolve(__dirname, '../frontend-services');

// Determine which path exists (EAS uses node_modules, local dev uses relative)
let frontendServicesPath = null;
if (fs.existsSync(nodeModulesPath)) {
  try {
    const stats = fs.lstatSync(nodeModulesPath);
    frontendServicesPath = stats.isSymbolicLink() ? fs.realpathSync(nodeModulesPath) : nodeModulesPath;
  } catch (e) {
    // Continue
  }
}
if (!frontendServicesPath && fs.existsSync(relativePath)) {
  frontendServicesPath = relativePath;
}

// Use extraNodeModules to map the package
// Metro will use package.json "main" field (dist/index.js) automatically
if (frontendServicesPath) {
  config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    '@tasks-management/frontend-services': frontendServicesPath,
  };
}

// Custom resolver as fallback (shouldn't be needed if extraNodeModules works)
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle @tasks-management/frontend-services
  if (moduleName === '@tasks-management/frontend-services') {
    const possiblePaths = [
      frontendServicesPath ? path.resolve(frontendServicesPath, 'dist/index.js') : null,
      path.resolve(nodeModulesPath, 'dist/index.js'),
      path.resolve(relativePath, 'dist/index.js'),
    ].filter(Boolean);
    
    for (const mainPath of possiblePaths) {
      try {
        if (fs.existsSync(mainPath)) {
          return {
            type: 'sourceFile',
            filePath: mainPath,
          };
        }
      } catch (e) {
        // Continue
      }
    }
  }
  
  // Use default resolver
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
