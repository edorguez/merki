/* eslint-disable @typescript-eslint/no-require-imports */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# Unity Ads: raise pod deployment targets to 15.0';
const SCRIPT = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        current = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f
        if current > 0 && current < 15.0
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'
        end
      end
    end
`;

/**
 * Unity Ads ships pods (UnityAds, UnityCoherenceLib) with an iOS 13 deployment
 * target, which recent Xcode versions reject. Raise every pod target below 15.0
 * to 15.0 inside the generated Podfile's post_install hook.
 */
module.exports = function withUnityAdsDeploymentTarget(config) {
  return withDangerousMod(config, [
    'ios',
    async cfg => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (!contents.includes(MARKER)) {
        contents = contents.replace(
          'post_install do |installer|',
          `post_install do |installer|\n    ${MARKER}\n${SCRIPT}`
        );
        fs.writeFileSync(podfilePath, contents);
      }

      return cfg;
    },
  ]);
};
