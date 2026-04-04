import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { theme } from "../src/lib/theme";
import { listChatDates, loadChat } from "../src/lib/chatStorage";
import type { Message } from "../src/lib/api";

interface ChatEntry {
  date: string;
  preview: string;
  messageCount: number;
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00"); // noon to avoid timezone issues
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  if (dateStr === toDateStr(today)) return "Today";
  if (dateStr === toDateStr(yesterday)) return "Yesterday";

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${days[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}`;
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const dates = await listChatDates();
      const loaded: ChatEntry[] = [];
      for (const date of dates) {
        const msgs = await loadChat(date);
        if (msgs.length === 0) continue;
        const firstUserMsg = msgs.find((m: Message) => m.role === "user");
        loaded.push({
          date,
          preview: firstUserMsg
            ? firstUserMsg.content.slice(0, 80) + (firstUserMsg.content.length > 80 ? "..." : "")
            : "No messages",
          messageCount: msgs.length,
        });
      }
      setEntries(loaded);
      setLoading(false);
    })();
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: ChatEntry; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
        <TouchableOpacity
          style={styles.entry}
          activeOpacity={0.7}
          onPress={() => router.push(`/history/${item.date}`)}
        >
          <View style={styles.entryHeader}>
            <Text style={styles.entryDate}>
              {formatDateLabel(item.date)}
            </Text>
            <Text style={styles.entryCount}>
              {item.messageCount} messages
            </Text>
          </View>
          <Text style={styles.entryPreview} numberOfLines={2}>
            {item.preview}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    ),
    []
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
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
        <Text style={styles.headerTitle}>History</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.colors.accent} size="large" />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="chatbubbles-outline"
            size={48}
            color={theme.colors.textMuted}
          />
          <Text style={styles.emptyText}>No past chats yet</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          renderItem={renderItem}
          keyExtractor={(item) => item.date}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.font.size.md,
    color: theme.colors.textMuted,
  },
  list: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  entry: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  entryDate: {
    fontSize: theme.font.size.md,
    fontWeight: "600",
    color: theme.colors.text,
  },
  entryCount: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textMuted,
  },
  entryPreview: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textDim,
    lineHeight: 20,
  },
});
