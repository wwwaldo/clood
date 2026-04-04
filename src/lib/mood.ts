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

export function getCurrentMood(): Mood {
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

export function getSystemPrompt(availableChatDates?: string[]): string {
  const mood = getCurrentMood();
  const lines = [
    "You are clood, a personal AI assistant.",
    `Your current mood is: ${mood.label}.`,
    mood.personality,
    "User messages include timestamps in brackets — use them to be aware of time but don't mention them unless relevant.",
    "Each day starts a fresh conversation. You have a tool to read past days' chats if the user references something from before.",
  ];

  if (availableChatDates && availableChatDates.length > 0) {
    lines.push(
      `Past chat history is available for these dates: ${availableChatDates.join(", ")}.`
    );
  }

  return lines.join("\n");
}
