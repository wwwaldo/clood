# clood

A stylish chat app powered by Anthropic's Claude API, built with Expo + React Native.

## Architecture

```
app/
  _layout.tsx          # Root layout, dark theme, expo-router
  index.tsx            # API key setup screen (validates + stores securely)
  chat.tsx             # Main chat screen — the brain of the app
  history.tsx          # List of past daily chats
  history/[date].tsx   # Read-only view of a specific day's chat

src/
  lib/
    api.ts             # Anthropic streaming client + tool_use support
    enrichment.ts      # Prepends timestamps to user messages before API calls
    mood.ts            # Time-of-day mood system (chatty/focused/chill/sleepy)
    chatStorage.ts     # AsyncStorage persistence, keyed by date (YYYY-MM-DD)
    memoryStorage.ts   # Topic-based long-term memory (ranked blob per topic)
    dreaming.ts        # Nightly memory extraction — processes day's chat into topic blobs
    storage.ts         # SecureStore wrapper for API key
    notifications.ts   # Push notifications (daily 9am + test helper)
    theme.ts           # Design tokens (colors, spacing, radius, fonts)
  components/
    ChatBubble.tsx     # Message bubble with entrance animations + "remembering..." state
    ChatInput.tsx      # Input bar with send/stop buttons
    MoodPill.tsx       # Header pill showing current mood emoji + label
```

## Key concepts

### Message enrichment
User messages are stored as raw text in state and AsyncStorage. At the API boundary only, `enrichMessages()` prepends a human-readable timestamp like `[Thu Apr 3, 2:47 PM]` so Claude is time-aware. The UI never sees enriched content.

### Mood system
Four moods mapped to time-of-day windows: chatty (6-10), focused (10-17), chill (17-21), sleepy (21-6). Each mood injects a personality fragment into the system prompt. The MoodPill component in the header shows the current mood and updates every 60s.

**TODO:** The personality strings are placeholder one-liners. Expand into richer multi-paragraph prompts covering tone, behavior, response style, and guardrails. See the TODO comment in `mood.ts`.

### Daily chat persistence
One chat per day, keyed by `YYYY-MM-DD` in AsyncStorage. Today's chat auto-saves (debounced 1s) after every message. On app foreground, if the date has rolled over, current messages save under the old date and state clears for the new day.

### Memory system

**Data model:** Each topic is a single living paragraph — not a list of atomic facts. `TopicMemory` has `topic`, `content` (the paragraph), `updatedAt`, and `rank` (importance score). Stored in AsyncStorage as `clood_topic_{name}`.

**Rank:** +1 every day the topic comes up in conversation. Frequently-discussed topics naturally float to the top. Rank affects both system prompt inclusion order and dreaming priority.

**Dreaming:** A nightly pass (runs on app mount if past 11pm or next morning) that sends the day's conversation + all existing topic blobs to Claude. Claude rewrites each topic paragraph with new info, creates new topics, merges overlapping ones, and flags which were mentioned today. Higher-ranked topics are processed first (earlier in context = more careful attention). This means memories evolve organically — stale info gets dropped, contradictions get resolved.

**Automatic recall:** Top 5 topics by rank are injected directly into the system prompt — clood just *knows* these, like waking up. Remaining topics are listed by name + rank, accessible via the `recall` tool.

**Recall tool:** When clood needs to remember something not in the top 5, it uses the `recall` tool. Tries exact topic match first, then fuzzy keyword search. The UI shows a subtle italic "remembering..." while the tool resolves — no visible function call.

**Debug:** Long-press the "clood" title to trigger dreaming manually in dev mode.

### Claude tools
- `read_past_chat` — loads a specific day's conversation by date
- `recall` — searches long-term memory by keyword or topic name

The tool execution loop in `chat.tsx` handles `tool_use` -> `tool_result` -> streaming final response, including recursive tool calls.

### Notifications
Daily local push notification at 9am. `sendTestNotification()` fires a test after 5s delay. Requires a dev build (not Expo Go) and Apple Developer account for iOS.

## Running

```bash
npm install
npx expo start          # Expo Go (no notifications)
npx expo start --web    # Web browser
npx expo run:ios --device  # Dev build on physical iPhone (needs Xcode)
```

### Known build issue
CocoaPods 1.16.2 doesn't work with Ruby 4.0 (Homebrew). Fix:
```bash
brew unlink ruby
npx expo run:ios --device
```

