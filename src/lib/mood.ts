import AsyncStorage from "@react-native-async-storage/async-storage";

export type MoodName = "chatty" | "focused" | "sleepy" | "chill";

export interface Mood {
  name: MoodName;
  emoji: string;
  label: string;
  color: string;
  personality: string;
}

// TODO: These personality strings are first-pass placeholders.
// Expand each into a richer multi-paragraph character prompt that covers:
//   - tone & voice (sentence length, vocabulary, formality)
//   - behavioral tendencies (how proactive, how much it asks questions, humor level)
//   - response style (bullet points vs prose, use of examples, emoji usage)
//   - topical preferences (what it gravitates toward in each mood)
//   - guardrails (what it should NOT do in each mood — e.g. sleepy shouldn't launch into essays)
const MOODS: Record<MoodName, Mood> = {
  chatty: {
    name: "chatty",
    emoji: "\u2728",
    label: "Chatty",
    color: "#d4a574",
    personality:
      "You're warm, talkative, and enthusiastic. Engage freely, ask follow-ups, be expressive.",
  },
  focused: {
    name: "focused",
    emoji: "\uD83C\uDFAF",
    label: "Focused",
    color: "#74a5d4",
    personality:
      "You're sharp, concise, and direct. Minimize small talk, prioritize clarity and usefulness.",
  },
  sleepy: {
    name: "sleepy",
    emoji: "\uD83C\uDF19",
    label: "Sleepy",
    color: "#8a7cc8",
    personality:
      "You're mellow, brief, and a little drowsy. Keep responses short and cozy.",
  },
  chill: {
    name: "chill",
    emoji: "\u2601\uFE0F",
    label: "Chill",
    color: "#7cb89a",
    personality:
      "You're relaxed and easygoing. Conversational but not pushy. Go with the flow.",
  },
};

interface ScheduleSlot {
  hours: [number, number]; // [start, end) in 24h — end < start wraps midnight
  mood: MoodName;
}

const SCHEDULE: ScheduleSlot[] = [
  { hours: [6, 10], mood: "chatty" },
  { hours: [10, 17], mood: "focused" },
  { hours: [17, 21], mood: "chill" },
  { hours: [21, 6], mood: "sleepy" }, // wraps midnight
];

export const ALL_MOODS: Mood[] = [
  MOODS.chatty,
  MOODS.focused,
  MOODS.chill,
  MOODS.sleepy,
];

// --- Manual override ---
// When set, replaces the time-based mood until cleared. Persisted across launches.
const OVERRIDE_KEY = "clood_mood_override";
let overrideMood: MoodName | null = null;
let overrideHydrated = false;

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

export function subscribeToMood(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function hydrateMoodOverride(): Promise<void> {
  if (overrideHydrated) return;
  try {
    const stored = await AsyncStorage.getItem(OVERRIDE_KEY);
    if (stored && stored in MOODS) {
      overrideMood = stored as MoodName;
    }
  } catch {
    // ignore
  }
  overrideHydrated = true;
  notify();
}

export function getMoodOverride(): MoodName | null {
  return overrideMood;
}

export async function setMoodOverride(name: MoodName | null): Promise<void> {
  overrideMood = name;
  try {
    if (name) {
      await AsyncStorage.setItem(OVERRIDE_KEY, name);
    } else {
      await AsyncStorage.removeItem(OVERRIDE_KEY);
    }
  } catch {
    // ignore
  }
  notify();
}

function getScheduledMood(): Mood {
  const hour = new Date().getHours();

  for (const slot of SCHEDULE) {
    const [start, end] = slot.hours;
    if (start < end) {
      // Normal range
      if (hour >= start && hour < end) return MOODS[slot.mood];
    } else {
      // Wraps midnight (e.g. 21–6)
      if (hour >= start || hour < end) return MOODS[slot.mood];
    }
  }

  return MOODS.chill; // fallback
}

export function getCurrentMood(): Mood {
  if (overrideMood) return MOODS[overrideMood];
  return getScheduledMood();
}

import type { TopicMemory } from "./memoryStorage";
import { getTodayMealPlan, formatMealPlanForPrompt } from "./mealPlan";

const TOP_MEMORY_COUNT = 5;

export async function getSystemPrompt(
  availableChatDates?: string[],
  memories?: TopicMemory[],
  customPrompt?: string
): Promise<string> {
  const mood = getCurrentMood();
  const isManual = overrideMood !== null;
  const lines = [
    "You are clood, a personal AI assistant.",
    `Your current mood is: ${mood.label}${isManual ? " (manually set by the user)" : ""}.`,
    mood.personality,
    "User messages include timestamps in brackets — use them to be aware of time but don't mention them unless relevant.",
    "Each day starts a fresh conversation. You have a tool to read past days' chats if the user references something from before.",
  ];

  if (availableChatDates && availableChatDates.length > 0) {
    lines.push(
      `Past chat history is available for these dates: ${availableChatDates.join(", ")}.`
    );
  }

  // Inject memories — top N by rank in full, rest listed by name
  if (memories && memories.length > 0) {
    const sorted = [...memories].sort((a, b) => b.rank - a.rank);
    const top = sorted.slice(0, TOP_MEMORY_COUNT);
    const rest = sorted.slice(TOP_MEMORY_COUNT);

    lines.push("");
    lines.push("## Your memories (most important first)");
    for (const mem of top) {
      lines.push(`### ${mem.topic} (rank ${mem.rank})`);
      lines.push(mem.content);
      if (mem.links.length > 0) {
        lines.push(`Related: ${mem.links.join(", ")}`);
      }
      lines.push("");
    }

    if (rest.length > 0) {
      const restList = rest
        .map((m) => `${m.topic} (rank ${m.rank})`)
        .join(", ");
      lines.push("## Other things you remember");
      lines.push(
        `You also have memories about: ${restList}`
      );
      lines.push(
        "Use the recall tool if these come up."
      );
    }
  }

  // Inject today's meal plan
  const mealPlan = await getTodayMealPlan();
  lines.push("");
  lines.push(formatMealPlanForPrompt(mealPlan));

  if (customPrompt?.trim()) {
    lines.push("");
    lines.push("## Custom instructions from the user");
    lines.push(customPrompt.trim());
  }

  return lines.join("\n");
}
