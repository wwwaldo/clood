import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { theme } from "../src/lib/theme";
import {
  getAllMemories,
  stripWikiLinks,
  type TopicMemory,
} from "../src/lib/memoryStorage";

export default function WikiScreen() {
  const insets = useSafeAreaInsets();
  const [memories, setMemories] = useState<TopicMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getAllMemories().then((mems) => {
      setMemories(mems);
      setLoading(false);
    });
  }, []);

  const filtered = search.trim()
    ? memories.filter(
        (m) =>
          m.topic.includes(search.toLowerCase()) ||
          m.content.toLowerCase().includes(search.toLowerCase())
      )
    : memories;

  const renderItem = useCallback(
    ({ item, index }: { item: TopicMemory; index: number }) => {
      const preview = stripWikiLinks(item.content).slice(0, 100);
      return (
        <Animated.View entering={FadeInDown.delay(index * 40).duration(250)}>
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() =>
              router.push(`/wiki/${encodeURIComponent(item.topic)}`)
            }
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTopic}>{item.topic}</Text>
              <Text style={styles.cardRank}>rank {item.rank}</Text>
            </View>
            <Text style={styles.cardPreview} numberOfLines={2}>
              {preview}
            </Text>
            {item.links.length > 0 && (
              <View style={styles.cardFooter}>
                <Ionicons
                  name="link-outline"
                  size={12}
                  color={theme.colors.textMuted}
                />
                <Text style={styles.cardLinks}>
                  {item.links.length} link{item.links.length !== 1 ? "s" : ""}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      );
    },
    []
  );

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
        <Text style={styles.headerTitle}>Wiki</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons
          name="search-outline"
          size={16}
          color={theme.colors.textMuted}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search memories..."
          placeholderTextColor={theme.colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons
              name="close-circle"
              size={16}
              color={theme.colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={theme.colors.accent} size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons
            name="bulb-outline"
            size={48}
            color={theme.colors.textMuted}
          />
          <Text style={styles.emptyText}>
            {search ? "No matching memories" : "No memories yet"}
          </Text>
          {!search && (
            <Text style={styles.emptySubtext}>
              Chat with clood and trigger dreaming to build memories
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item.topic}
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
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.font.size.sm,
    color: theme.colors.text,
    padding: 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.font.size.md,
    color: theme.colors.textMuted,
  },
  emptySubtext: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textMuted,
    textAlign: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  list: {
    padding: theme.spacing.md,
    paddingTop: 0,
    gap: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTopic: {
    fontSize: theme.font.size.md,
    fontWeight: "700",
    color: theme.colors.accent,
    flex: 1,
  },
  cardRank: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  cardPreview: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textDim,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  cardLinks: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textMuted,
  },
});
