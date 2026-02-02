// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add watchFolders to ensure Metro watches the frontend-services directory
config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(__dirname, '../frontend-services'),
];

module.exports = config;
