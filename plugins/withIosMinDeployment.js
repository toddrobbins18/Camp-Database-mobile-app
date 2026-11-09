const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "Xcode 26 only accepts IPHONEOS_DEPLOYMENT_TARGET";

const SNIPPET = `
    # Xcode 26 only accepts IPHONEOS_DEPLOYMENT_TARGET 15.0–27.0.
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        current = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current.nil? || current.to_f < 15.0
          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end
      end
    end

    installer.target_installation_results.pod_target_installation_results.each do |_name, result|
      result.resource_bundle_targets.each do |resource_target|
        resource_target.build_configurations.each do |build_config|
          current = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
          if current.nil? || current.to_f < 15.0
            build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
          end
        end
      end
    end
`;

function withIosMinDeployment(config) {
  return withDangerousMod(config, [
    "ios",
    async (mod) => {
      const podfilePath = path.join(mod.modRequest.platformProjectRoot, "Podfile");
      let contents = fs.readFileSync(podfilePath, "utf8");
      if (contents.includes(MARKER)) return mod;
      contents = contents.replace(
        /react_native_post_install\(\s*installer,\s*config\[:reactNativePath\],\s*:mac_catalyst_enabled => false,\s*:ccache_enabled => ccache_enabled\?\(podfile_properties\),\s*\)\n/,
        (match) => `${match}${SNIPPET}`,
      );
      fs.writeFileSync(podfilePath, contents);
      return mod;
    },
  ]);
}

module.exports = withIosMinDeployment;
