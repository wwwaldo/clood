import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  ALL_MOODS,
  getCurrentMood,
  getMoodOverride,
  hydrateMoodOverride,
  setMoodOverride,
  subscribeToMood,
  type Mood,
  type MoodName,
} from "../lib/mood";
import { theme } from "../lib/theme";

export function MoodPill() {
  const [mood, setMood] = useState<Mood>(getCurrentMood);
  const [override, setOverride] = useState<MoodName | null>(getMoodOverride());
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    hydrateMoodOverride();
    const unsub = subscribeToMood(() => {
      setMood(getCurrentMood());
      setOverride(getMoodOverride());
    });
    // Re-check mood every minute so the pill updates at time boundaries
    const interval = setInterval(() => {
      setMood(getCurrentMood());
    }, 60_000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  const handlePick = async (name: MoodName | null) => {
    await setMoodOverride(name);
    setPickerOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setPickerOpen(true)}
        activeOpacity={0.7}
      >
        <Animated.View
          entering={FadeIn.duration(500)}
          style={[styles.pill, { borderColor: mood.color + "66" }]}
        >
          <Text style={styles.emoji}>{mood.emoji}</Text>
          <Text style={[styles.label, { color: mood.color }]}>
            {mood.label}
            {override ? " ·" : ""}
          </Text>
        </Animated.View>
      </TouchableOpacity>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setPickerOpen(false)}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Set clood's mood</Text>
            <Text style={styles.sheetSubtitle}>
              Override the time-based mood, or let it follow the clock.
            </Text>

            {ALL_MOODS.map((m) => {
              const selected = override === m.name;
              return (
                <TouchableOpacity
                  key={m.name}
                  style={[
                    styles.option,
                    selected && {
                      borderColor: m.color,
                      backgroundColor: m.color + "1A",
                    },
                  ]}
                  onPress={() => handlePick(m.name)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.optionEmoji}>{m.emoji}</Text>
                  <View style={styles.optionTextWrap}>
                    <Text style={[styles.optionLabel, { color: m.color }]}>
                      {m.label}
                    </Text>
                    <Text style={styles.optionDesc} numberOfLines={2}>
                      {m.personality}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[
                styles.option,
                styles.autoOption,
                override === null && {
                  borderColor: theme.colors.accent,
                  backgroundColor: theme.colors.accentGlow,
                },
              ]}
              onPress={() => handlePick(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.optionEmoji}>🕒</Text>
              <View style={styles.optionTextWrap}>
                <Text
                  style={[styles.optionLabel, { color: theme.colors.text }]}
                >
                  Auto
                </Text>
                <Text style={styles.optionDesc}>
                  Let mood follow time of day
                </Text>
              </View>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
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
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  sheetTitle: {
    fontSize: theme.font.size.lg,
    fontWeight: "700",
    color: theme.colors.text,
  },
  sheetSubtitle: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textDim,
    marginBottom: theme.spacing.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bg,
  },
  autoOption: {
    marginTop: theme.spacing.xs,
  },
  optionEmoji: {
    fontSize: 20,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionLabel: {
    fontSize: theme.font.size.md,
    fontWeight: "700",
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textDim,
    lineHeight: 16,
  },
});
