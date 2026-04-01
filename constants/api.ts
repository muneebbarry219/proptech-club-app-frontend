import { Platform } from "react-native";

const LAN_API_BASE_URL = "http://192.168.1.113:5000";
const ANDROID_EMULATOR_API_BASE_URL = "http://10.0.2.2:5000";
const IOS_SIMULATOR_API_BASE_URL = "http://localhost:5000";

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

export const API_BASE_URL = configuredBaseUrl ?? LAN_API_BASE_URL;

export const API_BASE_URL_CANDIDATES = configuredBaseUrl
  ? [configuredBaseUrl]
  : Platform.select({
      android: [LAN_API_BASE_URL, ANDROID_EMULATOR_API_BASE_URL],
      ios: [LAN_API_BASE_URL, IOS_SIMULATOR_API_BASE_URL],
      default: [LAN_API_BASE_URL],
    }) ?? [LAN_API_BASE_URL];
