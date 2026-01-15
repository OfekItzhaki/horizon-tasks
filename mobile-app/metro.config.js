// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Find the frontend-services package location
// In EAS builds, it's in node_modules as a local file dependency
function findFrontendServicesPath() {
  const nodeModulesPath = path.resolve(__dirname, 'node_modules/@tasks-management/frontend-services');
  const relativePath = path.resolve(__dirname, '../frontend-services');
  
  // First check node_modules (EAS build environment)
  if (fs.existsSync(nodeModulesPath)) {
    try {
      // Check if it's a symlink
      const stats = fs.lstatSync(nodeModulesPath);
      if (stats.isSymbolicLink()) {
        return fs.realpathSync(nodeModulesPath);
      }
      return nodeModulesPath;
    } catch (e) {
      // Fallback to relative path
    }
  }
  
  // Check relative path (local development)
  if (fs.existsSync(relativePath)) {
    return relativePath;
  }
  
  return null;
}

const frontendServicesPath = findFrontendServicesPath();

// Add support for resolving subpath exports from frontend-services
if (frontendServicesPath) {
  const i18nPath = path.resolve(frontendServicesPath, 'dist/i18n/index.js');
  
  // Custom resolver for the subpath export
  const originalResolveRequest = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    // Handle @tasks-management/frontend-services/i18n subpath export
    if (moduleName === '@tasks-management/frontend-services/i18n') {
      // Try multiple possible paths
      const possiblePaths = [
        i18nPath,
        path.resolve(frontendServicesPath, 'dist/i18n/index.js'),
        path.resolve(__dirname, 'node_modules/@tasks-management/frontend-services/dist/i18n/index.js'),
        path.resolve(__dirname, '../frontend-services/dist/i18n/index.js'),
      ];
      
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          return {
            type: 'sourceFile',
            filePath: possiblePath,
          };
        }
      }
      
      // If file doesn't exist, log error but continue with default resolution
      console.warn(`Warning: Could not find @tasks-management/frontend-services/i18n at any of: ${possiblePaths.join(', ')}`);
    }
    
    // Use default resolver for everything else
    if (originalResolveRequest) {
      return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;
