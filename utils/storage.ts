import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const memoryStorage = new Map<string, string>();

const isNativeAsyncStorageAvailable = () => {
  try {
    return (
      AsyncStorage != null &&
      typeof AsyncStorage.getItem === "function" &&
      typeof AsyncStorage.setItem === "function" &&
      typeof AsyncStorage.removeItem === "function"
    );
  } catch {
    return false;
  }
};

const getWebStorage = () => {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) {
    return null;
  }

  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
};

const getItem = async (key: string): Promise<string | null> => {
  if (Platform.OS === "web") {
    const webStorage = getWebStorage();
    if (webStorage) {
      return webStorage.getItem(key);
    }
  }

  if (isNativeAsyncStorageAvailable()) {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn("[storage] Falling back from native getItem", error);
    }
  }

  return memoryStorage.get(key) ?? null;
};

const setItem = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === "web") {
    const webStorage = getWebStorage();
    if (webStorage) {
      webStorage.setItem(key, value);
      return;
    }
  }

  if (isNativeAsyncStorageAvailable()) {
    try {
      await AsyncStorage.setItem(key, value);
      return;
    } catch (error) {
      console.warn("[storage] Falling back from native setItem", error);
    }
  }

  memoryStorage.set(key, value);
};

const removeItem = async (key: string): Promise<void> => {
  if (Platform.OS === "web") {
    const webStorage = getWebStorage();
    if (webStorage) {
      webStorage.removeItem(key);
      return;
    }
  }

  if (isNativeAsyncStorageAvailable()) {
    try {
      await AsyncStorage.removeItem(key);
      return;
    } catch (error) {
      console.warn("[storage] Falling back from native removeItem", error);
    }
  }

  memoryStorage.delete(key);
};

export const storage = {
  getItem,
  setItem,
  removeItem,
};
