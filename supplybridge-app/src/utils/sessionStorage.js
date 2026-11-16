import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "supplybridge_token";
const USER_KEY = "supplybridge_user";

const canUseSecureStore = async () => {
  if (Platform.OS === "web") {
    return false;
  }

  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
};

export const getSessionToken = async () => {
  const secureStoreAvailable = await canUseSecureStore();

  if (!secureStoreAvailable) {
    return AsyncStorage.getItem(TOKEN_KEY);
  }

  try {
    const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);

    if (storedToken) {
      return storedToken;
    }
  } catch {
    return AsyncStorage.getItem(TOKEN_KEY);
  }

  const legacyToken = await AsyncStorage.getItem(TOKEN_KEY);

  if (!legacyToken) {
    return null;
  }

  try {
    await SecureStore.setItemAsync(TOKEN_KEY, legacyToken);
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    return legacyToken;
  }

  return legacyToken;
};

export const saveSessionToken = async (token) => {
  const secureStoreAvailable = await canUseSecureStore();

  if (!secureStoreAvailable) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return;
  }

  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }
};

export const removeSessionToken = async () => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {}

  await AsyncStorage.removeItem(TOKEN_KEY);
};

export const getCachedUser = async () => {
  try {
    const storedUser = await AsyncStorage.getItem(USER_KEY);

    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    await AsyncStorage.removeItem(USER_KEY);
    return null;
  }
};

export const saveCachedUser = (user) => {
  return AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearStoredSession = async () => {
  await Promise.all([removeSessionToken(), AsyncStorage.removeItem(USER_KEY)]);
};
