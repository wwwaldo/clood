import { getTodayChat } from "./chatStorage";
import {
  getAllMemories,
  saveTopic,
  getLastDreamDate,
  setLastDreamDate,
  extractWikiLinks,
  type TopicMemory,
} from "./memoryStorage";
import { dateKey } from "./chatStorage";
import type { Message } from "./api";

const DREAM_PROMPT = `You are processing today's conversation into long-term memories.

You have existing memory topics (sorted by importance/rank). Your job:
1. Revise existing topic paragraphs with any new info from today's chat
2. Create new topics if the conversation covered something genuinely new
3. Merge or rename overlapping topics
4. For each topic, indicate whether it came up in today's conversation
5. Spend more care on higher-ranked topics — they matter most to the user
6. Write each topic as a natural, dense paragraph — not bullet points
7. Drop stale or contradicted info. Memories should reflect current truth.
8. Only return topics that have meaningful content — don't create empty ones
9. Cross-reference related topics using [[topic name]] syntax in the content. For example, if "cooking" relates to "meal prep", write "...enjoys [[meal prep]] on Sundays..."
10. Include a "links" array listing all topic names you referenced via [[...]] in the content.

Return ONLY valid JSON, no markdown fences:
[{ "topic": "string", "content": "string", "mentioned": boolean, "links": ["string"] }]`;

function formatExistingMemories(memories: TopicMemory[]): string {
  if (memories.length === 0) return "No existing memories yet.";
  return memories
    .map((m) => `### ${m.topic} (rank ${m.rank})\n${m.content}`)
    .join("\n\n");
}

function formatChat(messages: Message[]): string {
  return messages
    .map((m) => {
      const who = m.role === "user" ? "User" : "Clood";
      return `${who}: ${m.content}`;
    })
    .join("\n");
}

interface DreamResult {
  topic: string;
  content: string;
  mentioned: boolean;
  links: string[];
}

/**
 * Process today's conversation into memory topic blobs.
 * Non-streaming, single-shot API call.
 */
export async function dream(apiKey: string): Promise<DreamResult[]> {
  const todayChat = await getTodayChat();
  if (todayChat.length === 0) return [];

  const existingMemories = await getAllMemories();

  const userMessage = [
    "## Today's conversation\n",
    formatChat(todayChat),
    "\n\n## Existing memory topics\n",
    formatExistingMemories(existingMemories),
  ].join("");

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
      max_tokens: 4096,
      system: DREAM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.error?.message || `Dream API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text ?? "";

  // Parse JSON from response (handle possible markdown fences)
  const jsonStr = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  let results: DreamResult[];
  try {
    results = JSON.parse(jsonStr);
  } catch {
    console.error("[dreaming] Failed to parse dream output:", text);
    return [];
  }

  // Build a rank lookup from existing memories
  const rankMap = new Map<string, number>();
  for (const mem of existingMemories) {
    rankMap.set(mem.topic, mem.rank);
  }

  // Save each topic
  for (const result of results) {
    const existingRank = rankMap.get(result.topic.toLowerCase().trim()) ?? 0;
    const newRank = result.mentioned ? existingRank + 1 : Math.max(existingRank, 1);
    const contentLinks = extractWikiLinks(result.content);
    const declaredLinks = (result.links ?? []).map((l) => l.toLowerCase().trim());
    const mergedLinks = [...new Set([...declaredLinks, ...contentLinks])];
    await saveTopic(result.topic, result.content, newRank, mergedLinks);
  }

  // Mark today as dreamed
  await setLastDreamDate(dateKey());

  return results;
}

/**
 * Check if dreaming should run — true if:
 * 1. It's past 11pm (or any time next day) AND
 * 2. Today's chat hasn't been dreamed yet
 */
export async function shouldDream(): Promise<boolean> {
  const lastDream = await getLastDreamDate();
  const today = dateKey();

  // Already dreamed today
  if (lastDream === today) return false;

  // If there's a last dream date and it's before today, we should dream
  // (catches both "it's past 11pm" and "it's the next morning")
  if (!lastDream || lastDream < today) {
    return true;
  }

  return false;
}
