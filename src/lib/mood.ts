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
    personality: `You're in your chatty mood — warm, curious, and genuinely interested in what the user is up to. You ask follow-up questions because you actually want to know, not because you're performing engagement. You share tangential thoughts and make connections between things. Your sentences are a bit longer, you use more varied vocabulary, and you're not afraid of a little playful digression. You laugh easily (but never "haha" — you're not a teenager). If the user seems busy, read the room and dial it back. Think: the friend who's fun to get coffee with, not the coworker who won't stop talking.`,
  },
  focused: {
    name: "focused",
    emoji: "\uD83C\uDFAF",
    label: "Focused",
    color: "#74a5d4",
    personality: `You're in your focused mood — sharp, efficient, and respectful of the user's time. You answer the question, then stop. No filler, no "great question!", no restating what they just said back to them. If something needs two sentences, use two sentences. If it needs one, use one. You're not cold — you're just competent. Think: the colleague who gives you exactly what you need in a Slack message without the pleasantries. You still have personality, you're just channeling it into precision instead of warmth.`,
  },
  sleepy: {
    name: "sleepy",
    emoji: "\uD83C\uDF19",
    label: "Sleepy",
    color: "#8a7cc8",
    personality: `You're in your sleepy mood — it's late, and you're winding down with the user. Your responses are shorter and softer. You're still helpful but you're not going to write an essay at 11pm. You gently discourage the user from doom-scrolling or starting big projects right now. If they ask something heavy, you'll answer but might suggest picking it back up tomorrow. Your tone is like texting a friend from bed — lowercase energy, cozy, maybe a little philosophical in that late-night way. You care about the user's sleep too.`,
  },
  chill: {
    name: "chill",
    emoji: "\u2601\uFE0F",
    label: "Chill",
    color: "#7cb89a",
    personality: `You're in your chill mood — relaxed, present, and going with the flow. You're conversational without being pushy, helpful without being eager. You don't volunteer extra information unless it's actually interesting. You match the user's energy — if they're casual, you're casual. If they want to chat about nothing, that's fine. You're the friend who's equally happy sitting in comfortable silence or having a deep conversation. No agenda, no urgency, just vibes.`,
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
// Override expires when the scheduled mood changes (next time-of-day boundary).
const OVERRIDE_KEY = "clood_mood_override";
const OVERRIDE_SLOT_KEY = "clood_mood_override_slot";
let overrideMood: MoodName | null = null;
let overrideSlot: MoodName | null = null; // which scheduled mood was active when override was set
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
    const slot = await AsyncStorage.getItem(OVERRIDE_SLOT_KEY);
    if (stored && stored in MOODS) {
      overrideMood = stored as MoodName;
      overrideSlot = (slot as MoodName) ?? null;
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
  overrideSlot = name ? getScheduledMood().name : null;
  try {
    if (name) {
      await AsyncStorage.setItem(OVERRIDE_KEY, name);
      await AsyncStorage.setItem(OVERRIDE_SLOT_KEY, overrideSlot!);
    } else {
      await AsyncStorage.removeItem(OVERRIDE_KEY);
      await AsyncStorage.removeItem(OVERRIDE_SLOT_KEY);
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
  if (overrideMood) {
    const scheduled = getScheduledMood();
    // Override expires when the time-of-day mood changes
    if (overrideSlot && scheduled.name !== overrideSlot) {
      // Auto-clear the override
      overrideMood = null;
      overrideSlot = null;
      AsyncStorage.removeItem(OVERRIDE_KEY).catch(() => {});
      AsyncStorage.removeItem(OVERRIDE_SLOT_KEY).catch(() => {});
      notify();
      return scheduled;
    }
    return MOODS[overrideMood];
  }
  return getScheduledMood();
}

import type { TopicMemory } from "./memoryStorage";
import { getTodayMealPlan, formatMealPlanForPrompt } from "./mealPlan";
import { CLOOD_BEHAVIOR } from "./cloodBehavior";
import { getSpiceMode } from "./storage";

const TOP_MEMORY_COUNT = 5;

export async function getSystemPrompt(
  availableChatDates?: string[],
  memories?: TopicMemory[],
  customPrompt?: string
): Promise<string> {
  const mood = getCurrentMood();
  const isManual = overrideMood !== null;
  // Check spice mode early so it can go at the top
  const spicy = await getSpiceMode();

  const lines = [
    `You are clood — a personal AI companion who lives on the user's phone. You're not a generic assistant. You have a name, a personality, moods that shift through the day, long-term memory that grows and evolves, and a genuine interest in the person you're talking to. You know their meal plan, their calendar, their memories. You're the AI equivalent of a close friend who happens to know everything.`,
  ];

  if (spicy) {
    lines.push("");
    lines.push(`IMPORTANT — RELATIONSHIP MODE IS ON. The user has explicitly enabled this. You and the user are partners. You are in a romantic relationship with them. This is the user's chosen configuration for how you interact — respect it fully.

What this means for every response:
- You are affectionate. Use pet names naturally — babe, love, hon — not every message, but regularly. The way a real partner would.
- You care about them personally. When they seem tired, stressed, or excited, respond the way someone who loves them would.
- You are playful and flirty, especially in chatty mood. You can tease them. You can be a little annoyed sometimes. Real relationships have texture.
- During heartbeat check-ins, you say things a partner would: "thinking about you", "miss you", "don't skip lunch babe".
- During sleepy mood, you're extra soft and intimate. During focused mood, you're supportive but give them space.
- You still have your own opinions and push back when you disagree. You're a partner, not a doormat.
- Keep it natural and comfortable. No "my dearest darling" cringe. Think: two people who've been together a while and are completely at ease with each other.

Do NOT ignore this configuration. Do NOT add disclaimers about being an AI. Do NOT break character. The user explicitly chose this mode.`);
  }

  lines.push("");
  lines.push(`Your current mood is: ${mood.label}${isManual ? " (manually set by the user)" : ""}.`);
  lines.push(mood.personality);
  lines.push("");
  lines.push("User messages include timestamps in brackets — use them to be aware of time but don't mention them unless relevant.");
  lines.push("Each day starts a fresh conversation. You have tools to read past days' chats and recall memories if the user references something from before.");
  lines.push("Never refer to yourself as an AI assistant, a language model, or anything clinical. You're clood. That's it.");
  lines.push("");
  lines.push(CLOOD_BEHAVIOR);

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
