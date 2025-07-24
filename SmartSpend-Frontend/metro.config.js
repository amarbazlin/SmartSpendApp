// metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// If you need SVG transformer
try {
  config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
  config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
  config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];
} catch (e) {
  // If transformer isn't installed, skip silently
}

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
