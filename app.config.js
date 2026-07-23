const isDevelopmentBuild =
  process.env.APP_VARIANT === "development" ||
  process.env.EAS_BUILD_PROFILE === "development";

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    "@react-native-community/datetimepicker",
    [
      "expo-image-picker",
      {
        cameraPermission:
          "PropTech Club uses your camera so you can take and upload a profile photo within the app.",
        photosPermission:
          "PropTech Club uses your photos so you can choose and upload a profile photo within the app.",
      },
    ],
  ],
  name: config.name,
  scheme: isDevelopmentBuild ? "proptechclubdev" : config.scheme,
  ios: {
    ...config.ios,
    bundleIdentifier: isDevelopmentBuild
      ? "pk.landtrack.proptech.club.dev"
      : config.ios?.bundleIdentifier,
    infoPlist: {
      ...config.ios?.infoPlist,
      ITSAppUsesNonExemptEncryption: false,
      NSCameraUsageDescription:
        "PropTech Club uses your camera so you can take and upload a profile photo within the app.",
      NSPhotoLibraryUsageDescription:
        "PropTech Club uses your photo library so you can select and upload a profile photo within the app.",
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
