const isDevelopmentBuild = process.env.EAS_BUILD_PROFILE === "development";

module.exports = ({ config }) => ({
  ...config,
  name: isDevelopmentBuild ? "PropTech Club Dev" : config.name,
  scheme: isDevelopmentBuild ? "proptechclubdev" : config.scheme,
  ios: {
    ...config.ios,
    bundleIdentifier: isDevelopmentBuild
      ? "pk.landtrack.proptech.club.dev"
      : config.ios?.bundleIdentifier,
  },
  android: {
    ...config.android,
    package: isDevelopmentBuild
      ? "pk.landtrack.proptech.club.dev"
      : config.android?.package,
  },
});
