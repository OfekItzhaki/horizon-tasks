// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add parent directory to nodeModulesPaths so Metro can find local packages
config.resolver.nodeModulesPaths = [
  ...(config.resolver.nodeModulesPaths || []),
  path.resolve(__dirname, '..'),
];

// Add watchFolders to ensure Metro watches the frontend-services directory
config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(__dirname, '../frontend-services'),
];

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

// Always set extraNodeModules (even if path not found at config time)
// In EAS builds, the path will exist at runtime
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@tasks-management/frontend-services': frontendServicesPath || nodeModulesPath || relativePath,
};

// Custom resolver - MUST handle the package before default resolution
// Metro's resolveRequest signature: (context, realModuleName, platform, moduleName)
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, realModuleName, platform, moduleName) => {
  const targetModule = realModuleName || moduleName;
  
  // Handle @tasks-management/frontend-services - intercept FIRST
  if (targetModule === '@tasks-management/frontend-services') {
    // Build list of all possible base paths to check
    const basePaths = [];
    
    // Add detected path
    if (frontendServicesPath) {
      basePaths.push(frontendServicesPath);
    }
    
    // Always check node_modules (EAS build)
    basePaths.push(nodeModulesPath);
    
    // Always check relative path (local dev / fallback)
    basePaths.push(relativePath);
    
    // Also check extraNodeModules mapped path
    const extraPath = config.resolver.extraNodeModules?.['@tasks-management/frontend-services'];
    if (extraPath && !basePaths.includes(extraPath)) {
      basePaths.push(extraPath);
    }
    
    // Also check common EAS build paths
    const easBuildPaths = [
      '/home/expo/workingdir/build/frontend-services',
      path.resolve('/home/expo/workingdir/build', 'frontend-services'),
    ];
    for (const buildPath of easBuildPaths) {
      if (fs.existsSync(buildPath) && !basePaths.includes(buildPath)) {
        basePaths.push(buildPath);
      }
    }
    
    // Try each base path
    for (const basePath of basePaths) {
      const mainPath = path.resolve(basePath, 'dist/index.js');
      const packageJsonPath = path.resolve(basePath, 'package.json');
      
      try {
        // Verify both package.json and dist/index.js exist
        if (fs.existsSync(packageJsonPath) && fs.existsSync(mainPath)) {
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
  
  // Use default resolver for everything else
  if (originalResolveRequest) {
    return originalResolveRequest(context, realModuleName, platform, moduleName);
  }
  return context.resolveRequest(context, realModuleName, platform, moduleName);
};

module.exports = config;
