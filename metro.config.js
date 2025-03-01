const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');

// Get Metro's default configuration
const defaultConfig = getDefaultConfig(__dirname);
const customConfig = {};

// Merge custom config with default config
const mergedConfig = mergeConfig(defaultConfig, customConfig);

// Wrap with Reanimated's Metro config
module.exports = wrapWithReanimatedMetroConfig(mergedConfig);
