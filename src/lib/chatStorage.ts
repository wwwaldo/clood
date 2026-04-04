import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Message } from "./api";

const CHAT_PREFIX = "clood_chat_";

export function dateKey(d?: Date): string {
  const date = d ?? new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function saveChat(
  messages: Message[],
  date?: string
): Promise<void> {
  const key = CHAT_PREFIX + (date ?? dateKey());
  if (messages.length === 0) return;
  await AsyncStorage.setItem(key, JSON.stringify(messages));
}

export async function loadChat(date: string): Promise<Message[]> {
  const raw = await AsyncStorage.getItem(CHAT_PREFIX + date);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Message[];
  } catch {
    return [];
  }
}

export async function getTodayChat(): Promise<Message[]> {
  return loadChat(dateKey());
}

export async function listChatDates(): Promise<string[]> {
  const allKeys = await AsyncStorage.getAllKeys();
  const chatKeys = allKeys
    .filter((k) => k.startsWith(CHAT_PREFIX))
    .map((k) => k.slice(CHAT_PREFIX.length))
    .sort()
    .reverse();
  return chatKeys;
}

/**
 * Format messages from a past chat into a readable summary
 * for returning as a tool result to Claude.
 */
export function formatChatForTool(messages: Message[], date: string): string {
  if (messages.length === 0) return `No chat found for ${date}.`;

  const lines = messages.map((m) => {
    const time = new Date(m.timestamp);
    const h = time.getHours() % 12 || 12;
    const min = String(time.getMinutes()).padStart(2, "0");
    const ampm = time.getHours() >= 12 ? "PM" : "AM";
    const who = m.role === "user" ? "User" : "Clood";
    return `[${h}:${min} ${ampm}] ${who}: ${m.content}`;
  });

  return `Chat from ${date}:\n\n${lines.join("\n")}`;
}
