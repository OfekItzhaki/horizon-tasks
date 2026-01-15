// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for resolving subpath exports from frontend-services
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    // Handle @tasks-management/frontend-services/i18n subpath export
    if (moduleName === '@tasks-management/frontend-services/i18n') {
      return {
        type: 'sourceFile',
        filePath: require.resolve('../frontend-services/dist/i18n/index.js'),
      };
    }
    
    // Use default resolver for everything else
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
