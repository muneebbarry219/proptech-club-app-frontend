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
  extra: {
    ...config.extra,
    googleOAuth: {
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    },
  },
});
