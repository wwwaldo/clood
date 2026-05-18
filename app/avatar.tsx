import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../src/lib/theme";
import {
  getCurrentMood,
  subscribeToMood,
  hydrateMoodOverride,
  type MoodName,
} from "../src/lib/mood";

// --- ASCII art frames per mood (at least 5 each) ---

const FRAMES: Record<MoodName, string[]> = {
  chatty: [
    `
      .-"""-.
     /        \\
    |  O    O  |
    |    __    |
    |   /  \\   |
     \\  '=='  /
      '-....-'
        |  |
       _|  |_
    `,
    `
      .-"""-.
     /        \\
    |  O    O  |
    |    __    |
    |   |  |   |
     \\  '=='  /
      '-....-'
        |  |
       _|  |_
    `,
    `
      .-"""-.
     /        \\
    |  ^    ^  |
    |    __    |
    |   /  \\   |
     \\  \\__/  /
      '-....-'
       \\|  |/
       _|  |_
    `,
    `
      .-"""-.
     /        \\
    |  O    O  |
    |    <>    |
    |   \\__/   |
     \\        /
      '-....-'
      / |  | \\
       _|  |_
    `,
    `
      .-"""-.
     /        \\
    |  *    *  |
    |    __    |
    |   \\  /   |
     \\   \\/   /
      '-....-'
        |  |
       _|  |_
    `,
    `
      .-"""-.
     /        \\
    |  O    O  |
    |    __    |
    |   |__|   |
     \\   ==   /
      '-....-'
     \\  |  |  /
       _|  |_
    `,
  ],
  focused: [
    `
      .-"""-.
     /        \\
    |  -    -  |
    |    __    |
    |   ----   |
     \\        /
      '-....-'
        |  |
       _|  |_
    `,
    `
      .-"""-.
     /        \\
    |  -    -  |
    |   \\__/   |
    |   ----   |
     \\        /
      '-....-'
        |__|
       _|  |_
    `,
    `
      .-"""-.
     /        \\
    |  .    .  |
    |    __    |
    |   ----   |
     \\        /
      '-....-'
        |  |
       _|  |_
    `,
    `
      .-"""-.
     /        \\
    |  -    -  |
    |    __    |
    |   ----   |
     \\   ..   /
      '-....-'
        |  |
       _|  |_
    `,
    `
      .-"""-.
     /        \\
    |  =    =  |
    |    __    |
    |   ----   |
     \\        /
      '-....-'
       \\|  |
       _|  |_
    `,
    `
      .-"""-.
     /        \\
    |  -    -  |
    |    \\/    |
    |   ----   |
     \\        /
      '-....-'
        |  |/
       _|  |_
    `,
  ],
  chill: [
    `
      .-"""-.
     /        \\
    |  ~    ~  |
    |          |
    |   \\__/   |
     \\        /
      '-....-'
        |  |
       _\\  /_
    `,
    `
      .-"""-.
     /        \\
    |  ~    ~  |
    |          |
    |    __    |
     \\  \\__/  /
      '-....-'
        |  |
       _\\  /_
    `,
    `
      .-"""-.
     /        \\
    |  -    ~  |
    |          |
    |   \\__/   |
     \\        /
      '-....-'
       \\|  |
       _\\  /_
    `,
    `
      .-"""-.
     /        \\
    |  ~    -  |
    |          |
    |   \\__/   |
     \\        /
      '-....-'
        |  |/
       _\\  /_
    `,
    `
      .-"""-.
     /        \\
    |  ~    ~  |
    |    ..    |
    |   \\__/   |
     \\        /
      '-....-'
        |  |
       _\\  /_
    `,
    `
      .-"""-.
     /        \\
    |  ~    ~  |
    |          |
    |    --    |
     \\  \\__/  /
      '-....-'
      / |  |
       _\\  /_
    `,
  ],
  sleepy: [
    `
      .-"""-.
     /        \\
    |  -    -  |
    |          |        z
    |   \\__/   |      z
     \\        /     z
      '-....-'
        |  |
       _|  |_
    `,
    `
      .-"""-.
     /        \\
    |  _    _  |
    |          |
    |    --    |     z
     \\        /       z
      '-....-'          z
        |  |
       _|  |_
    `,
    `
      .-"""-.
     /        \\
    |  -    -  |         Z
    |          |       Z
    |   \\__/   |     Z
     \\        /
      '-....-'
        |  |
       _|  |_
    `,
    `
      .-"""-.
     /        \\
    |  _    _  |
    |          |
    |    ..    |
     \\        /    z z
      '-....-'      z
        |  |
       _|  |_
    `,
    `
      .-"""-.
     /        \\
    |  .    .  |
    |          |         z
    |    --    |       z
     \\        /      z
      '-....-'
        |  |
       _|  |_
    `,
    `
      .-"""-.
     /        \\
    |  _    _  |      Z
    |          |        Z
    |   ~~~~   |          Z
     \\        /
      '-....-'
        |  |
       _|  |_
    `,
  ],
};

const MOOD_SUBTITLES: Record<MoodName, string[]> = {
  chatty: [
    "ooh, tell me more!",
    "I've got so much to say",
    "what's on your mind?",
    "let's chat about everything",
    "I'm all ears",
  ],
  focused: [
    "locked in.",
    "let's get this done",
    "no distractions",
    "heads down, shipping",
    "what do you need?",
  ],
  chill: [
    "just vibing",
    "no rush, no stress",
    "going with the flow",
    "easy like sunday morning",
    "whatever works",
  ],
  sleepy: [
    "five more minutes...",
    "winding down",
    "should probably sleep soon",
    "the moon is nice tonight",
    "shhh... cozy hours",
  ],
};

export default function AvatarScreen() {
  const insets = useSafeAreaInsets();
  const [mood, setMood] = useState(getCurrentMood());
  const [frameIndex, setFrameIndex] = useState(0);
  const [subtitleIndex, setSubtitleIndex] = useState(0);

  useEffect(() => {
    hydrateMoodOverride();
    const unsub = subscribeToMood(() => setMood(getCurrentMood()));
    return unsub;
  }, []);

  // Animate frames
  useEffect(() => {
    const frames = FRAMES[mood.name];
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frames.length);
    }, mood.name === "sleepy" ? 1200 : mood.name === "focused" ? 600 : 800);
    return () => clearInterval(interval);
  }, [mood.name]);

  // Rotate subtitles
  useEffect(() => {
    const subs = MOOD_SUBTITLES[mood.name];
    setSubtitleIndex(0);
    const interval = setInterval(() => {
      setSubtitleIndex((prev) => (prev + 1) % subs.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [mood.name]);

  const frames = FRAMES[mood.name];
  const subtitles = MOOD_SUBTITLES[mood.name];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>clood</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        <View style={[styles.avatarContainer, { borderColor: mood.color + "66" }]}>
          <Text style={[styles.ascii, { color: mood.color }]}>
            {frames[frameIndex]}
          </Text>
        </View>

        <View style={styles.moodBadge}>
          <Text style={styles.moodEmoji}>{mood.emoji}</Text>
          <Text style={[styles.moodLabel, { color: mood.color }]}>
            {mood.label}
          </Text>
        </View>

        <Text style={[styles.subtitle, { color: mood.color + "CC" }]}>
          {subtitles[subtitleIndex]}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: mood.color }]} />
            <Text style={styles.statLabel}>mood</Text>
            <Text style={[styles.statValue, { color: mood.color }]}>{mood.label}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: theme.colors.accent }]} />
            <Text style={styles.statLabel}>frame</Text>
            <Text style={[styles.statValue, { color: theme.colors.accent }]}>
              {frameIndex + 1}/{frames.length}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: theme.colors.success }]} />
            <Text style={styles.statLabel}>status</Text>
            <Text style={[styles.statValue, { color: theme.colors.success }]}>online</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: theme.font.size.lg,
    fontWeight: "700",
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  avatarContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    minWidth: 280,
    alignItems: "center",
  },
  ascii: {
    fontFamily: "Menlo",
    fontSize: 14,
    lineHeight: 16,
    textAlign: "center",
  },
  moodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  moodEmoji: {
    fontSize: 24,
  },
  moodLabel: {
    fontSize: theme.font.size.xl,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: theme.font.size.md,
    fontStyle: "italic",
    marginBottom: theme.spacing.xl + 8,
    height: 24,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.lg,
  },
  statItem: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
  },
  statValue: {
    fontSize: theme.font.size.sm,
    fontWeight: "700",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.border,
  },
});
