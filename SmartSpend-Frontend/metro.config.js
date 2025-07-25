const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// keep ts / tsx supported
config.resolver.sourceExts = ['js', 'jsx', 'json', 'ts', 'tsx'];

module.exports = config;