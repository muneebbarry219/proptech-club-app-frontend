const isDevelopmentBuild =
  process.env.APP_VARIANT === "development" ||
  process.env.EAS_BUILD_PROFILE === "development";

const imagePickerPlugin = [
  "expo-image-picker",
  {
    cameraPermission:
      "PropTech Club uses your camera so you can take and upload a profile photo within the app.",
    photosPermission:
      "PropTech Club uses your photos so you can choose and upload a profile photo within the app.",
  },
];

function hasPlugin(plugins, name) {
  return plugins.some((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) === name);
}

module.exports = ({ config }) => ({
  ...config,
  version: process.env.IOS_RELEASE_VERSION ?? config.version,
  plugins: [
    ...(config.plugins ?? []),
    "@react-native-community/datetimepicker",
    ...(hasPlugin(config.plugins ?? [], "expo-image-picker") ? [] : [imagePickerPlugin]),
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
    softwareKeyboardLayoutMode: "resize",
    blockedPermissions: [
      ...(config.android?.blockedPermissions ?? []),
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_BACKGROUND_LOCATION",
    ],
  },
});
