import AsyncStorage from "@react-native-async-storage/async-storage";

const memoryFallback = new Map<string, string>();
let nativeStorageAvailable: boolean | null = null;

async function canUseNativeStorage() {
  if (nativeStorageAvailable !== null) return nativeStorageAvailable;

  try {
    // Lightweight probe to verify the native module is actually usable.
    await AsyncStorage.getItem("__storage_probe__");
    nativeStorageAvailable = true;
  } catch (error) {
    nativeStorageAvailable = false;
    console.warn("[storage] AsyncStorage unavailable, using memory fallback.", error);
  }

  return nativeStorageAvailable;
}

export const storage = {
  async getItem(key: string) {
    if (!(await canUseNativeStorage())) {
      return memoryFallback.get(key) ?? null;
    }

    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn("[storage] getItem failed, using memory fallback.", error);
      nativeStorageAvailable = false;
      return memoryFallback.get(key) ?? null;
    }
  },

  async setItem(key: string, value: string) {
    if (!(await canUseNativeStorage())) {
      memoryFallback.set(key, value);
      return;
    }

    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.warn("[storage] setItem failed, using memory fallback.", error);
      nativeStorageAvailable = false;
      memoryFallback.set(key, value);
    }
  },

  async removeItem(key: string) {
    if (!(await canUseNativeStorage())) {
      memoryFallback.delete(key);
      return;
    }

    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn("[storage] removeItem failed, using memory fallback.", error);
      nativeStorageAvailable = false;
      memoryFallback.delete(key);
    }
  },
};
