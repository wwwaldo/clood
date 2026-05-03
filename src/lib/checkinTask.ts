import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import { Platform } from "react-native";
import { getApiKey } from "./storage";
import { getAllMemories } from "./memoryStorage";
import { getCurrentMood } from "./mood";
import { getTodayMealPlan } from "./mealPlan";
import { saveChat, getTodayChat, dateKey } from "./chatStorage";
import {
  getDueCheckIns,
  markCheckInFired,
  fireCheckInNotification,
} from "./notifications";
import type { Message } from "./api";

export const CHECKIN_TASK_NAME = "clood-checkin-task";

const CHECKIN_SYSTEM_PROMPT = `You are clood, a personal AI assistant. You are generating a brief proactive check-in notification for the user's phone.

Rules:
- Write 1-2 short sentences max — this appears as a push notification
- Be warm and natural, not robotic
- Reference the specific context given (meal plan, time of day, reason for check-in)
- Don't use greetings like "Hey!" every time — vary your openings
- Don't mention that you're a notification or that you were scheduled`;

function buildCheckInPrompt(
  reason: string,
  mealPlanContext: string,
  memoriesContext: string,
  mood: string
): string {
  const now = new Date();
  const h = now.getHours() % 12 || 12;
  const min = String(now.getMinutes()).padStart(2, "0");
  const ampm = now.getHours() >= 12 ? "PM" : "AM";
  const timeStr = `${h}:${min} ${ampm}`;

  return [
    `It's ${timeStr}. Your current mood is: ${mood}.`,
    `You scheduled this check-in because: "${reason}"`,
    "",
    mealPlanContext ? `Today's meal plan context:\n${mealPlanContext}` : "",
    memoriesContext ? `Relevant memories:\n${memoriesContext}` : "",
    "",
    "Generate a short, warm check-in message for the notification.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function generateCheckInMessage(reason: string): Promise<string | null> {
  const apiKey = await getApiKey();
  if (!apiKey) return null;

  const mood = getCurrentMood();
  const mealPlan = await getTodayMealPlan();
  const memories = await getAllMemories();

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

  const userMessage = buildCheckInPrompt(
    reason,
    mealContext,
    topMemories,
    mood.label
  );

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 150,
        system: CHECKIN_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.content?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

async function saveCheckInToChat(message: string): Promise<void> {
  const existing = await getTodayChat();
  const newMsg: Message = {
    id: `checkin-${Date.now()}`,
    role: "assistant",
    content: message,
    timestamp: Date.now(),
  };
  await saveChat([...existing, newMsg], dateKey());
}

// Define the background task
TaskManager.defineTask(CHECKIN_TASK_NAME, async () => {
  try {
    const dueCheckIns = await getDueCheckIns();

    if (dueCheckIns.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    for (const ci of dueCheckIns) {
      const message = await generateCheckInMessage(ci.reason);
      if (message) {
        await fireCheckInNotification(message);
        await saveCheckInToChat(message);
      }
      await markCheckInFired(ci.hour, ci.minute);
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (e) {
    console.error("[checkin-task] error:", e);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register the background fetch task. Call once on app startup.
 */
export async function registerCheckInTask(): Promise<void> {
  if (Platform.OS === "web") return;

  const isRegistered = await TaskManager.isTaskRegisteredAsync(
    CHECKIN_TASK_NAME
  );
  if (isRegistered) return;

  await BackgroundFetch.registerTaskAsync(CHECKIN_TASK_NAME, {
    minimumInterval: 10 * 60, // check every ~10 minutes
    stopOnTerminate: false,
    startOnBoot: true,
  });
}
