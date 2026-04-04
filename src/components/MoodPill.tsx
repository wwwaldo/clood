import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { getCurrentMood, type Mood } from "../lib/mood";
import { theme } from "../lib/theme";

export function MoodPill() {
  const [mood, setMood] = useState<Mood>(getCurrentMood);

  useEffect(() => {
    // Re-check mood every minute so the pill updates at time boundaries
    const interval = setInterval(() => {
      setMood(getCurrentMood());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Animated.View
      entering={FadeIn.duration(500)}
      style={[styles.pill, { borderColor: mood.color + "66" }]}
    >
      <Text style={styles.emoji}>{mood.emoji}</Text>
      <Text style={[styles.label, { color: mood.color }]}>{mood.label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    backgroundColor: theme.colors.surface,
  },
  emoji: {
    fontSize: 12,
  },
  label: {
    fontSize: theme.font.size.xs,
    fontWeight: "600",
  },
});
