import AsyncStorage from "@react-native-async-storage/async-storage";

export interface TopicMemory {
  topic: string;
  content: string;
  updatedAt: number;
  rank: number;
}

const TOPICS_KEY = "clood_topics";
const TOPIC_PREFIX = "clood_topic_";
const LAST_DREAM_KEY = "clood_last_dream";

// --- Topic CRUD ---

export async function saveTopic(
  topic: string,
  content: string,
  rank?: number
): Promise<void> {
  const normalized = topic.toLowerCase().trim();
  const existing = await getTopic(normalized);

  const memory: TopicMemory = {
    topic: normalized,
    content,
    updatedAt: Date.now(),
    rank: rank ?? existing?.rank ?? 1,
  };

  await AsyncStorage.setItem(
    TOPIC_PREFIX + normalized,
    JSON.stringify(memory)
  );

  // Update topic index
  const topics = await listTopics();
  if (!topics.includes(normalized)) {
    await AsyncStorage.setItem(
      TOPICS_KEY,
      JSON.stringify([...topics, normalized])
    );
  }
}

export async function getTopic(topic: string): Promise<TopicMemory | null> {
  const raw = await AsyncStorage.getItem(TOPIC_PREFIX + topic.toLowerCase().trim());
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TopicMemory;
  } catch {
    return null;
  }
}

export async function listTopics(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(TOPICS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export async function getAllMemories(): Promise<TopicMemory[]> {
  const topics = await listTopics();
  const memories: TopicMemory[] = [];
  for (const topic of topics) {
    const mem = await getTopic(topic);
    if (mem) memories.push(mem);
  }
  // Sort by rank descending
  return memories.sort((a, b) => b.rank - a.rank);
}

export async function deleteTopic(topic: string): Promise<void> {
  const normalized = topic.toLowerCase().trim();
  await AsyncStorage.removeItem(TOPIC_PREFIX + normalized);
  const topics = await listTopics();
  await AsyncStorage.setItem(
    TOPICS_KEY,
    JSON.stringify(topics.filter((t) => t !== normalized))
  );
}

// --- Fuzzy keyword search ---

export async function searchMemories(query: string): Promise<TopicMemory[]> {
  const memories = await getAllMemories();
  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1);

  if (queryWords.length === 0) return memories;

  const scored = memories.map((mem) => {
    const searchText = `${mem.topic} ${mem.content}`.toLowerCase();
    let score = 0;
    for (const word of queryWords) {
      if (searchText.includes(word)) score += 1;
      // Bonus for topic name match
      if (mem.topic.includes(word)) score += 2;
    }
    return { mem, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.mem);
}

// --- Dream tracking ---

export async function getLastDreamDate(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_DREAM_KEY);
}

export async function setLastDreamDate(date: string): Promise<void> {
  await AsyncStorage.setItem(LAST_DREAM_KEY, date);
}
