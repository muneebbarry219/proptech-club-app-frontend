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
    infoPlist: {
      ...config.ios?.infoPlist,
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    ...config.android,
    package: isDevelopmentBuild
      ? "pk.landtrack.proptech.club.dev"
      : config.android?.package,
    blockedPermissions: [
      ...(config.android?.blockedPermissions ?? []),
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_BACKGROUND_LOCATION",
    ],
  },
});
