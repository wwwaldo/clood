import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const API_KEY_STORE = "clood_api_key";
const PROVIDER_STORE = "clood_provider";
const AWS_ACCESS_KEY_STORE = "clood_aws_access_key";
const AWS_SECRET_KEY_STORE = "clood_aws_secret_key";
const CUSTOM_PROMPT_KEY = "clood_custom_prompt";
const MODEL_KEY = "clood_selected_model";
const SPICE_KEY = "clood_spice_mode";

export async function getSpiceMode(): Promise<boolean> {
  const val = await AsyncStorage.getItem(SPICE_KEY);
  return val === "true";
}

export async function setSpiceMode(enabled: boolean): Promise<void> {
  if (enabled) {
    await AsyncStorage.setItem(SPICE_KEY, "true");
  } else {
    await AsyncStorage.removeItem(SPICE_KEY);
  }
}

export interface BedrockModel {
  id: string;           // Bedrock model ID
  label: string;        // Display name
  inputCost: number;    // $ per million input tokens
  outputCost: number;   // $ per million output tokens
}

export const BEDROCK_MODELS: BedrockModel[] = [
  { id: "us.anthropic.claude-sonnet-4-20250514-v1:0", label: "Claude Sonnet 4", inputCost: 3.0, outputCost: 15.0 },
  { id: "us.anthropic.claude-sonnet-4-6", label: "Claude Sonnet 4.6", inputCost: 3.0, outputCost: 15.0 },
  { id: "us.anthropic.claude-haiku-4-5-20251001-v1:0", label: "Claude Haiku 4.5", inputCost: 0.8, outputCost: 4.0 },
  { id: "us.amazon.nova-micro-v1:0", label: "Amazon Nova Micro", inputCost: 0.035, outputCost: 0.14 },
  { id: "us.amazon.nova-lite-v1:0", label: "Amazon Nova Lite", inputCost: 0.06, outputCost: 0.24 },
  { id: "us.amazon.nova-pro-v1:0", label: "Amazon Nova Pro", inputCost: 0.8, outputCost: 3.2 },
];

export async function getSelectedModel(): Promise<BedrockModel> {
  const id = await AsyncStorage.getItem(MODEL_KEY);
  if (id) {
    const found = BEDROCK_MODELS.find((m) => m.id === id);
    if (found) return found;
  }
  return BEDROCK_MODELS[0]; // default to Sonnet
}

export async function setSelectedModel(modelId: string): Promise<void> {
  await AsyncStorage.setItem(MODEL_KEY, modelId);
}

export type ApiProvider = "anthropic" | "bedrock";

export interface ProviderConfig {
  provider: ApiProvider;
  apiKey?: string;
  awsAccessKey?: string;
  awsSecretKey?: string;
  awsRegion?: string;
}

// --- Secure storage helpers ---

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

// --- Provider config ---

export async function getProviderConfig(): Promise<ProviderConfig | null> {
  const provider = (await secureGet(PROVIDER_STORE)) as ApiProvider | null;

  if (provider === "anthropic") {
    const apiKey = await secureGet(API_KEY_STORE);
    return apiKey ? { provider, apiKey } : null;
  }

  if (provider === "bedrock") {
    const awsAccessKey = await secureGet(AWS_ACCESS_KEY_STORE);
    const awsSecretKey = await secureGet(AWS_SECRET_KEY_STORE);
    return awsAccessKey && awsSecretKey
      ? { provider, awsAccessKey, awsSecretKey, awsRegion: "us-east-1" }
      : null;
  }

  // Legacy: check for existing Anthropic API key (pre-provider era)
  const legacyKey = await secureGet(API_KEY_STORE);
  if (legacyKey) {
    return { provider: "anthropic", apiKey: legacyKey };
  }
  return null;
}

export async function setProviderConfig(config: ProviderConfig): Promise<void> {
  await secureSet(PROVIDER_STORE, config.provider);

  if (config.provider === "anthropic" && config.apiKey) {
    await secureSet(API_KEY_STORE, config.apiKey);
    await secureDelete(AWS_ACCESS_KEY_STORE);
    await secureDelete(AWS_SECRET_KEY_STORE);
  } else if (config.provider === "bedrock" && config.awsAccessKey && config.awsSecretKey) {
    await secureSet(AWS_ACCESS_KEY_STORE, config.awsAccessKey);
    await secureSet(AWS_SECRET_KEY_STORE, config.awsSecretKey);
    await secureDelete(API_KEY_STORE);
  }
}

export async function deleteProviderConfig(): Promise<void> {
  await secureDelete(PROVIDER_STORE);
  await secureDelete(API_KEY_STORE);
  await secureDelete(AWS_ACCESS_KEY_STORE);
  await secureDelete(AWS_SECRET_KEY_STORE);
}

// --- Legacy helpers (some callers just check if auth exists) ---

export async function getApiKey(): Promise<string | null> {
  const config = await getProviderConfig();
  return config ? "__bedrock__" : null;
}

// --- Custom prompt ---

export async function getCustomPrompt(): Promise<string> {
  const val = await AsyncStorage.getItem(CUSTOM_PROMPT_KEY);
  return val ?? "";
}

export async function setCustomPrompt(prompt: string): Promise<void> {
  if (prompt.trim()) {
    await AsyncStorage.setItem(CUSTOM_PROMPT_KEY, prompt);
  } else {
    await AsyncStorage.removeItem(CUSTOM_PROMPT_KEY);
  }
}
