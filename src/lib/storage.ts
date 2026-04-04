import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const API_KEY_STORE = "clood_api_key";

export async function getApiKey(): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(API_KEY_STORE);
  }
  return SecureStore.getItemAsync(API_KEY_STORE);
}

export async function setApiKey(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(API_KEY_STORE, key);
    return;
  }
  await SecureStore.setItemAsync(API_KEY_STORE, key);
}

export async function deleteApiKey(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(API_KEY_STORE);
    return;
  }
  await SecureStore.deleteItemAsync(API_KEY_STORE);
}
