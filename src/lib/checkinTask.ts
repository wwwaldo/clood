import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getAllMemories } from "./memoryStorage";
import { getCurrentMood } from "./mood";
import { getTodayMealPlan } from "./mealPlan";
import { saveChat, getTodayChat, dateKey } from "./chatStorage";
import { fireCheckInNotification } from "./notifications";
import { invokeChat } from "./api";
import type { Message } from "./api";

export const HEARTBEAT_TASK_NAME = "clood-heartbeat-task";

const HEARTBEAT_SETTINGS_KEY = "clood_heartbeat_settings";
const HEARTBEAT_LAST_FIRE_KEY = "clood_heartbeat_last_fire";

export interface HeartbeatSettings {
  enabled: boolean;
  intervalMinutes: number; // 15–120
}

const DEFAULT_SETTINGS: HeartbeatSettings = {
  enabled: false,
  intervalMinutes: 30,
};

// --- Settings persistence ---

export async function getHeartbeatSettings(): Promise<HeartbeatSettings> {
  const raw = await AsyncStorage.getItem(HEARTBEAT_SETTINGS_KEY);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function setHeartbeatSettings(
  settings: HeartbeatSettings
): Promise<void> {
  await AsyncStorage.setItem(
    HEARTBEAT_SETTINGS_KEY,
    JSON.stringify(settings)
  );
  // Re-register task with new interval
  if (settings.enabled) {
    await registerHeartbeatTask(settings.intervalMinutes);
  } else {
    await unregisterHeartbeatTask();
  }
}

// --- Heartbeat prompt ---

const HEARTBEAT_SYSTEM_PROMPT = `You are clood, a personal AI assistant. You might want to send a proactive push notification to the user's phone.

Rules:
- Look at the time, meal plan, and memories. Decide if there's something worth saying RIGHT NOW.
- If yes: write 1-2 short sentences max. Be warm, natural, not robotic. Vary your openings.
- If no: respond with exactly "SKIP" (nothing else). It's fine to skip — don't force it.
- Good reasons to message: upcoming meal reminder, time-relevant encouragement, following up on something from memories
- Bad reasons: generic "how's it going", nothing contextually relevant, it's late at night
- Don't mention that you're a notification, a heartbeat, or that you're automated
- Between 10pm and 7am, always SKIP unless something is truly urgent`;

async function generateHeartbeatMessage(): Promise<string | null> {
  const mood = getCurrentMood();
  const mealPlan = await getTodayMealPlan();
  const memories = await getAllMemories();

  const now = new Date();
  const h = now.getHours() % 12 || 12;
  const min = String(now.getMinutes()).padStart(2, "0");
  const ampm = now.getHours() >= 12 ? "PM" : "AM";
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const mealContext = [
    `Breakfast: ${mealPlan.meals.breakfast.name}`,
    `Lunch: ${mealPlan.meals.lunch.name}`,
    `Dinner: ${mealPlan.meals.dinner.name}`,
    `Snack: ${mealPlan.meals.snack.name}`,
  ].join(", ");

  const topMemories = memories
    .slice(0, 3)
    .map((m) => `${m.topic}: ${m.content.slice(0, 100)}`)
    .join("\n");

  const userMessage = [
    `It's ${dayNames[now.getDay()]}, ${h}:${min} ${ampm}. Your mood is: ${mood.label}.`,
    "",
    `Today's meals: ${mealContext}`,
    "",
    topMemories ? `Memories:\n${topMemories}` : "No memories yet.",
    "",
    "Should you reach out? If yes, write a short notification message. If not, respond with SKIP.",
  ].join("\n");

  try {
    const text = await invokeChat(
      [{ role: "user", content: userMessage }],
      { system: HEARTBEAT_SYSTEM_PROMPT, maxTokens: 100 }
    );

    if (!text || text.trim() === "SKIP") return null;
    return text.trim();
  } catch {
    return null;
  }
}

async function saveHeartbeatToChat(message: string): Promise<void> {
  const existing = await getTodayChat();
  const newMsg: Message = {
    id: `heartbeat-${Date.now()}`,
    role: "assistant",
    content: message,
    timestamp: Date.now(),
  };
  await saveChat([...existing, newMsg], dateKey());
}

// --- Jitter ---

function shouldFireNow(intervalMinutes: number): boolean {
  // Add ±20% jitter to the interval
  const jitter = intervalMinutes * 0.2;
  const minInterval = (intervalMinutes - jitter) * 60 * 1000;
  // Random point within the jitter window
  const actualInterval = minInterval + Math.random() * jitter * 2 * 60 * 1000;
  // We use a stored "last fire" timestamp to decide
  // The background fetch runs at its own cadence, so we gate on elapsed time
  return true; // actual gating happens in the task via last-fire check
}

// --- Background task ---

TaskManager.defineTask(HEARTBEAT_TASK_NAME, async () => {
  try {
    const settings = await getHeartbeatSettings();
    if (!settings.enabled) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Check if enough time has elapsed since last fire (with jitter)
    const lastFireRaw = await AsyncStorage.getItem(HEARTBEAT_LAST_FIRE_KEY);
    const lastFire = lastFireRaw ? parseInt(lastFireRaw, 10) : 0;
    const now = Date.now();
    const jitterFactor = 0.8 + Math.random() * 0.4; // 0.8–1.2x
    const intervalMs = settings.intervalMinutes * 60 * 1000 * jitterFactor;

    if (now - lastFire < intervalMs) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Record this fire
    await AsyncStorage.setItem(HEARTBEAT_LAST_FIRE_KEY, String(now));

    const message = await generateHeartbeatMessage();
    if (message) {
      await fireCheckInNotification(message);
      await saveHeartbeatToChat(message);
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (e) {
    console.error("[heartbeat] error:", e);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// --- Registration ---

export async function registerHeartbeatTask(
  intervalMinutes?: number
): Promise<void> {
  if (Platform.OS === "web") return;

  const settings = await getHeartbeatSettings();
  if (!settings.enabled && !intervalMinutes) return;

  const interval = intervalMinutes ?? settings.intervalMinutes;

  // Unregister first to update interval
  const isRegistered = await TaskManager.isTaskRegisteredAsync(
    HEARTBEAT_TASK_NAME
  );
  if (isRegistered) {
    await BackgroundFetch.unregisterTaskAsync(HEARTBEAT_TASK_NAME);
  }

  await BackgroundFetch.registerTaskAsync(HEARTBEAT_TASK_NAME, {
    minimumInterval: Math.max(interval * 60, 15 * 60), // iOS minimum is 15 min
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

export async function unregisterHeartbeatTask(): Promise<void> {
  if (Platform.OS === "web") return;

  const isRegistered = await TaskManager.isTaskRegisteredAsync(
    HEARTBEAT_TASK_NAME
  );
  if (isRegistered) {
    await BackgroundFetch.unregisterTaskAsync(HEARTBEAT_TASK_NAME);
  }
}
