import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { theme } from "../lib/theme";

interface Props {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  index: number;
}

export function ChatBubble({ role, content, isStreaming, index }: Props) {
  const isUser = role === "user";

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 30, 150))
        .duration(300)
        .springify()
        .damping(18)}
      style={[styles.row, isUser && styles.rowUser]}
    >
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>C</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
        ]}
      >
        <Text
          style={[styles.text, isUser ? styles.textUser : styles.textAssistant]}
          selectable
        >
          {content}
          {isStreaming && <Text style={styles.cursor}>|</Text>}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.accentGlow,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  avatarText: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  bubbleUser: {
    backgroundColor: theme.colors.userBubble,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderBottomRightRadius: theme.spacing.xs,
  },
  bubbleAssistant: {
    backgroundColor: theme.colors.assistantBubble,
    borderBottomLeftRadius: theme.spacing.xs,
  },
  text: {
    fontSize: theme.font.size.md,
    lineHeight: 24,
  },
  textUser: {
    color: theme.colors.text,
  },
  textAssistant: {
    color: theme.colors.text,
  },
  cursor: {
    color: theme.colors.accent,
    fontWeight: "300",
  },
});
