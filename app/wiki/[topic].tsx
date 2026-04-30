import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../src/lib/theme";
import {
  getTopic,
  updateTopicContent,
  deleteTopic,
  type TopicMemory,
} from "../../src/lib/memoryStorage";
import { WikiContent } from "../../src/components/WikiContent";

export default function WikiTopicScreen() {
  const { topic: rawTopic } = useLocalSearchParams<{ topic: string }>();
  const topicKey = decodeURIComponent(rawTopic ?? "");
  const insets = useSafeAreaInsets();
  const [memory, setMemory] = useState<TopicMemory | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    if (!topicKey) return;
    getTopic(topicKey).then((mem) => {
      setMemory(mem);
      setLoading(false);
    });
  }, [topicKey]);

  const handleSave = async () => {
    if (!memory) return;
    await updateTopicContent(memory.topic, editText);
    const updated = await getTopic(memory.topic);
    setMemory(updated);
    setEditing(false);
  };

  const handleDelete = () => {
    if (!memory) return;
    const doDelete = async () => {
      await deleteTopic(memory.topic);
      router.back();
    };

    if (Platform.OS === "web") {
      if (confirm(`Delete "${memory.topic}" permanently?`)) doDelete();
    } else {
      Alert.alert(
        "Delete memory",
        `Delete "${memory.topic}" permanently?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: doDelete },
        ]
      );
    }
  };

  const handleStartEdit = () => {
    if (!memory) return;
    setEditText(memory.content);
    setEditing(true);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator color={theme.colors.accent} size="large" />
        </View>
      </View>
    );
  }

  if (!memory) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{topicKey}</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="help-circle-outline" size={48} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>Topic not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {memory.topic}
        </Text>
        {editing ? (
          <TouchableOpacity onPress={handleSave} style={styles.headerBtn}>
            <Ionicons name="checkmark" size={24} color={theme.colors.accent} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleStartEdit} style={styles.headerBtn}>
            <Ionicons name="create-outline" size={22} color={theme.colors.textDim} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metaRow}>
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>rank {memory.rank}</Text>
          </View>
          <Text style={styles.dateText}>
            Updated {formatDate(memory.updatedAt)}
          </Text>
        </View>

        {editing ? (
          <TextInput
            style={styles.editInput}
            value={editText}
            onChangeText={setEditText}
            multiline
            textAlignVertical="top"
            autoCapitalize="sentences"
            autoCorrect
            placeholder="Write memory content. Use [[topic name]] to link to other topics."
            placeholderTextColor={theme.colors.textMuted}
          />
        ) : (
          <View style={styles.contentCard}>
            <WikiContent content={memory.content} />
          </View>
        )}

        {!editing && memory.links.length > 0 && (
          <View style={styles.linksSection}>
            <Text style={styles.linksSectionTitle}>Related topics</Text>
            <View style={styles.linksWrap}>
              {memory.links.map((link) => (
                <TouchableOpacity
                  key={link}
                  style={styles.linkPill}
                  onPress={() =>
                    router.push(`/wiki/${encodeURIComponent(link)}`)
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="link-outline"
                    size={12}
                    color={theme.colors.accent}
                  />
                  <Text style={styles.linkPillText}>{link}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {!editing && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
            <Text style={styles.deleteText}>Delete this memory</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
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
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: theme.font.size.lg,
    fontWeight: "700",
    color: theme.colors.text,
    flex: 1,
    textAlign: "center",
    marginHorizontal: theme.spacing.sm,
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
  content: {
    padding: theme.spacing.md,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  rankBadge: {
    backgroundColor: theme.colors.accentGlow,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: theme.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  rankText: {
    fontSize: theme.font.size.xs,
    fontWeight: "700",
    color: theme.colors.accent,
  },
  dateText: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textMuted,
  },
  contentCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  editInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontSize: theme.font.size.sm,
    color: theme.colors.text,
    lineHeight: 22,
    minHeight: 200,
  },
  linksSection: {
    marginTop: theme.spacing.lg,
  },
  linksSectionTitle: {
    fontSize: theme.font.size.sm,
    fontWeight: "700",
    color: theme.colors.textDim,
    marginBottom: theme.spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  linksWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  linkPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: theme.colors.accentGlow,
    borderWidth: 1,
    borderColor: theme.colors.accent + "44",
    borderRadius: theme.radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  linkPillText: {
    fontSize: theme.font.size.xs,
    color: theme.colors.accent,
    fontWeight: "600",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: theme.spacing.xl,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.danger + "33",
  },
  deleteText: {
    fontSize: theme.font.size.sm,
    color: theme.colors.danger,
    fontWeight: "600",
  },
});
