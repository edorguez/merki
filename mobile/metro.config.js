// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver = config.resolver || {};
config.resolver.assetExts = [...(config.resolver.assetExts || []), 'wasm'];
config.resolver.platforms = ['ios', 'android', 'web'];

module.exports = config;
