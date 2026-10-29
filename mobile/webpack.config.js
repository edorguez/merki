const createExpoWebpackConfig = require('@expo/webpack-config');
const path = require('path');
const webpack = require('webpack');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfig(env, argv);

  // Set script type to module to allow import.meta
  config.output = config.output || {};
  config.output.scriptType = 'module';

  // Ensure EXPO_ROUTER_APP_ROOT is defined for expo-router
  // Path relative to expo-router/_ctx.web.js file location
  const appRoot = '../../app';
  config.plugins = config.plugins || [];

  // Find existing DefinePlugin (ExpoDefinePlugin) and add EXPO_ROUTER_APP_ROOT
  let definePluginFound = false;
  config.plugins.forEach((plugin, index) => {
    if (
      plugin.constructor.name === 'DefinePlugin' ||
      plugin.constructor.name === 'ExpoDefinePlugin'
    ) {
      if (plugin.definitions) {
        if (plugin.definitions['process.env']) {
          plugin.definitions['process.env'].EXPO_ROUTER_APP_ROOT = JSON.stringify(appRoot);
        } else {
          plugin.definitions['process.env.EXPO_ROUTER_APP_ROOT'] = JSON.stringify(appRoot);
        }
        definePluginFound = true;
      }
    }
  });

  // If no DefinePlugin found, add a new one
  if (!definePluginFound) {
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.EXPO_ROUTER_APP_ROOT': JSON.stringify(appRoot),
      })
    );
  }

  // Fix nanoid import issue: alias nanoid/non-secure to CommonJS version
  config.resolve = config.resolve || {};
  config.resolve.alias = config.resolve.alias || {};
  config.resolve.alias['nanoid/non-secure'] = path.resolve(
    __dirname,
    'node_modules/nanoid/non-secure/index.cjs'
  );

  // Modify css-loader options to set esModule: false (prevents import.meta.url)
  config.module = config.module || {};
  config.module.rules = config.module.rules || [];

  // Recursively find and modify css-loader
  const modifyCSSLoader = rules => {
    if (!rules) return;
    for (const rule of rules) {
      if (rule.oneOf) {
        modifyCSSLoader(rule.oneOf);
      } else if (rule.rules) {
        modifyCSSLoader(rule.rules);
      } else if (rule.use) {
        const use = Array.isArray(rule.use) ? rule.use : [rule.use];
        use.forEach(loader => {
          if (typeof loader === 'object' && loader.loader && loader.loader.includes('css-loader')) {
            loader.options = loader.options || {};
            loader.options.esModule = false;
          }
        });
      }
    }
  };
  modifyCSSLoader(config.module.rules);

  // Fix nanoid/non-secure import: treat as CommonJS with named exports
  config.module.rules.push({
    test: /[\\/]node_modules[\\/]nanoid[\\/]non-secure[\\/]index\.cjs$/,
    type: 'javascript/auto',
  });

  // Replace expo-router/_ctx (resolves to _ctx.web.js) with custom version
  config.plugins.push(
    new webpack.NormalModuleReplacementPlugin(/expo-router\/_ctx$/, function (resource) {
      resource.request = path.resolve(__dirname, 'webpack/node_modules/expo-router/_ctx.web.js');
    })
  );

  return config;
};
