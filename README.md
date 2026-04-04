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
    storage.ts         # SecureStore wrapper for API key
    notifications.ts   # Push notifications (daily 9am + test helper)
    theme.ts           # Design tokens (colors, spacing, radius, fonts)
  components/
    ChatBubble.tsx     # Message bubble with entrance animations
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

### Claude tool use: read_past_chat
Claude has a `read_past_chat` tool that can load any past day's conversation by date. Available dates are listed in the system prompt. The tool execution loop in `chat.tsx` handles `tool_use` → `tool_result` → streaming final response, including recursive tool calls.

### Notifications
Daily local push notification at 9am. `sendTestNotification()` fires a test after 5s delay. Debug: long-press the "clood" title in dev mode. Requires a dev build (not Expo Go) and Apple Developer account for iOS.

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

## What's not done yet

See `TODO.md` for the OpenRouter refactor checklist. Other open items:

- **Mood personality prompts** — current ones are one-liners, need expansion
- **Proactive check-ins** — mood system was designed to support this but it's not wired up yet
- **EAS / App Store publishing** — `eas init` + `eas build` when ready. Needs Apple Developer ($99/yr) for iOS, Google Play ($25 one-time) for Android
- **Notification content** — currently hardcoded "chatty" greeting at 9am. Should pull from the actual 9am mood and vary the message
- **Chat search** — no way to search across past chats yet
- **Message persistence edge cases** — streaming messages that get interrupted may save partial assistant responses
