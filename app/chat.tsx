import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  AppState,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { theme } from "../src/lib/theme";
import { getApiKey, deleteProviderConfig, getCustomPrompt } from "../src/lib/storage";
import { streamChat, type Message, type ToolUseRequest } from "../src/lib/api";
import { enrichMessages } from "../src/lib/enrichment";
import { getSystemPrompt } from "../src/lib/mood";
import {
  sendTestNotification,
} from "../src/lib/notifications";
import {
  saveChat,
  getTodayChat,
  loadChat,
  listChatDates,
  formatChatForTool,
  dateKey,
} from "../src/lib/chatStorage";
import {
  getAllMemories,
  getTopic,
  searchMemories,
  type TopicMemory,
} from "../src/lib/memoryStorage";
import { dream, shouldDream } from "../src/lib/dreaming";
import {
  getDayPlan,
  getAllDayPlans,
  formatMealPlanForTool,
  getAllAvailableMeals,
  getCustomMeals,
  saveCustomMeal,
  updateCustomMeal,
  deleteCustomMeal,
  type MealInput,
  type MealPatch,
  type GroceryStore,
} from "../src/lib/mealPlan";
import {
  getEvents,
  createEvent,
  deleteEvent,
  formatEventsForTool,
} from "../src/lib/calendar";
import { ChatBubble } from "../src/components/ChatBubble";
import { ChatInput } from "../src/components/ChatInput";
import { MoodPill } from "../src/components/MoodPill";
import { MenuSheet } from "../src/components/MenuSheet";

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [apiKey, setApiKeyState] = useState("");
  const [chatDates, setChatDates] = useState<string[]>([]);
  const [memories, setMemories] = useState<TopicMemory[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [customPrompt, setCustomPromptState] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamTextRef = useRef("");
  const currentDateRef = useRef(dateKey());

  // Load today's chat and available dates on mount
  useEffect(() => {
    getApiKey().then(async (key) => {
      if (!key) {
        router.replace("/");
        return;
      }
      setApiKeyState(key);

      const todayMessages = await getTodayChat();
      if (todayMessages.length > 0) {
        setMessages(todayMessages);
      }

      const dates = await listChatDates();
      setChatDates(dates);

      // Run dreaming if overdue (past 11pm or next day)
      if (await shouldDream()) {
        try {
          await dream();
          console.log("[dreaming] completed");
        } catch (e) {
          console.error("[dreaming] failed:", e);
        }
      }

      // Load memories and custom prompt for system prompt
      const mems = await getAllMemories();
      setMemories(mems);
      const cp = await getCustomPrompt();
      setCustomPromptState(cp);
    });
  }, []);

  // Date rollover detection — when app comes to foreground, check if day changed
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state !== "active") return;

      const today = dateKey();
      if (today !== currentDateRef.current) {
        // Day rolled over — save current chat under old date, start fresh
        if (messages.length > 0) {
          await saveChat(messages, currentDateRef.current);
        }
        currentDateRef.current = today;
        setMessages([]);
        const dates = await listChatDates();
        setChatDates(dates);
      }
    });
    return () => sub.remove();
  }, [messages]);

  // Persist chat after messages change (debounced)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (messages.length === 0) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveChat(messages, currentDateRef.current);
    }, 1000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [messages]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);
  }, []);

  // Handle tool use requests from Claude
  const handleToolUse = useCallback(
    async (
      toolRequests: ToolUseRequest[],
      apiMessages: { role: string; content: unknown }[],
      assistantMsgId: string,
      controller: AbortController,
      system: string
    ) => {
      // Build tool results
      const toolResults: { type: string; tool_use_id: string; content: string }[] = [];
      for (const req of toolRequests) {
        if (req.toolName === "read_past_chat") {
          const date = req.input.date as string;
          const pastMessages = await loadChat(date);
          const formatted = formatChatForTool(pastMessages, date);
          toolResults.push({
            type: "tool_result",
            tool_use_id: req.toolId,
            content: formatted,
          });
        } else if (req.toolName === "recall") {
          const query = req.input.query as string;
          // Try exact topic match first, then fuzzy search
          const exact = await getTopic(query);
          let content: string;
          if (exact) {
            const related = exact.links.length
              ? `\nRelated: ${exact.links.join(", ")}`
              : "";
            content = `## ${exact.topic} (rank ${exact.rank})\n${exact.content}${related}`;
          } else {
            const results = await searchMemories(query);
            if (results.length === 0) {
              content = `No memories found matching "${query}".`;
            } else {
              content = results
                .slice(0, 5)
                .map((m) => {
                  const related = m.links.length
                    ? `\nRelated: ${m.links.join(", ")}`
                    : "";
                  return `## ${m.topic} (rank ${m.rank})\n${m.content}${related}`;
                })
                .join("\n\n");
            }
          }
          toolResults.push({
            type: "tool_result",
            tool_use_id: req.toolId,
            content,
          });
        } else if (req.toolName === "get_meal_plan") {
          const day = (req.input.day as string).toLowerCase().trim();
          let content: string;
          if (day === "all") {
            const plans = await getAllDayPlans();
            content = plans
              .map((p) => formatMealPlanForTool(p))
              .join("\n\n---\n\n");
          } else {
            const plan = await getDayPlan(day);
            content = plan
              ? formatMealPlanForTool(plan)
              : `No meal plan found for "${day}". Valid days: Monday–Sunday.`;
          }
          toolResults.push({
            type: "tool_result",
            tool_use_id: req.toolId,
            content,
          });
        } else if (req.toolName === "get_calendar_events") {
          const startDate = req.input.startDate as string;
          const endDate = req.input.endDate as string;
          let content: string;
          try {
            const events = await getEvents(startDate, endDate);
            content = formatEventsForTool(events, startDate, endDate);
          } catch (e: any) {
            content = `Calendar error: ${e.message}`;
          }
          toolResults.push({
            type: "tool_result",
            tool_use_id: req.toolId,
            content,
          });
        } else if (req.toolName === "create_calendar_event") {
          const { title, startDate, endDate, notes, location } = req.input as {
            title: string;
            startDate: string;
            endDate: string;
            notes?: string;
            location?: string;
          };
          let content: string;
          try {
            const eventId = await createEvent(title, startDate, endDate, notes, location);
            content = `Event "${title}" created successfully. [id: ${eventId}]`;
          } catch (e: any) {
            content = `Failed to create event: ${e.message}`;
          }
          toolResults.push({
            type: "tool_result",
            tool_use_id: req.toolId,
            content,
          });
        } else if (req.toolName === "delete_calendar_event") {
          const eventId = req.input.eventId as string;
          let content: string;
          try {
            await deleteEvent(eventId);
            content = `Event ${eventId} deleted successfully.`;
          } catch (e: any) {
            content = `Failed to delete event: ${e.message}`;
          }
          toolResults.push({
            type: "tool_result",
            tool_use_id: req.toolId,
            content,
          });
        } else if (req.toolName === "list_meals") {
          const filter = (req.input.filter as string | undefined) ?? "all";
          const meals =
            filter === "custom" ? await getCustomMeals() : await getAllAvailableMeals();
          const content = meals.length
            ? meals
                .map(
                  (m) =>
                    `- ${m.id} [${m.source}] ${m.name} — ${m.calories}cal, ${m.protein}g protein, ${m.store}`
                )
                .join("\n")
            : "No meals found.";
          toolResults.push({
            type: "tool_result",
            tool_use_id: req.toolId,
            content,
          });
        } else if (req.toolName === "create_meal") {
          let content: string;
          try {
            const input: MealInput = {
              name: req.input.name as string,
              description: (req.input.description as string) ?? "",
              calories: (req.input.calories as number) ?? 0,
              protein: (req.input.protein as number) ?? 0,
              store: (req.input.store as GroceryStore) ?? "Loblaws",
              ingredients: (req.input.ingredients as string[]) ?? [],
              steps: (req.input.steps as string[]) ?? [],
              carbs: req.input.carbs as number | undefined,
              fat: req.input.fat as number | undefined,
              fiber: req.input.fiber as number | undefined,
              prepMinutes: req.input.prepMinutes as number | undefined,
              cookMinutes: req.input.cookMinutes as number | undefined,
              servings: req.input.servings as number | undefined,
              tags: req.input.tags as string[] | undefined,
            };
            const meal = await saveCustomMeal(input);
            content = `Created meal "${meal.name}" with id ${meal.id}.`;
          } catch (e: any) {
            content = `Failed to create meal: ${e?.message ?? "unknown error"}`;
          }
          toolResults.push({
            type: "tool_result",
            tool_use_id: req.toolId,
            content,
          });
        } else if (req.toolName === "update_meal") {
          const id = req.input.id as string;
          const { id: _id, ...rest } = req.input as Record<string, unknown>;
          const patch = rest as MealPatch;
          let content: string;
          try {
            const updated = await updateCustomMeal(id, patch);
            content = updated
              ? `Updated meal "${updated.name}" (${id}).`
              : `No custom meal found with id ${id}. Use list_meals first.`;
          } catch (e: any) {
            content = `Failed to update meal: ${e?.message ?? "unknown error"}`;
          }
          toolResults.push({
            type: "tool_result",
            tool_use_id: req.toolId,
            content,
          });
        } else if (req.toolName === "delete_meal") {
          const id = req.input.id as string;
          let content: string;
          try {
            const customs = await getCustomMeals();
            if (!customs.some((m) => m.id === id)) {
              content = `No custom meal with id ${id}. Only custom meals can be deleted.`;
            } else {
              await deleteCustomMeal(id);
              content = `Deleted meal ${id}.`;
            }
          } catch (e: any) {
            content = `Failed to delete meal: ${e?.message ?? "unknown error"}`;
          }
          toolResults.push({
            type: "tool_result",
            tool_use_id: req.toolId,
            content,
          });
        }
      }

      // Build the assistant message content blocks for the tool_use turn
      const assistantContent: unknown[] = [];
      // Include any text that was streamed before the tool call
      const currentText = streamTextRef.current;
      if (currentText) {
        assistantContent.push({ type: "text", text: currentText });
      }
      for (const req of toolRequests) {
        assistantContent.push({
          type: "tool_use",
          id: req.toolId,
          name: req.toolName,
          input: req.input,
        });
      }

      // Continue the conversation with tool results
      const continuedMessages = [
        ...apiMessages,
        { role: "assistant", content: assistantContent },
        { role: "user", content: toolResults },
      ];

      streamTextRef.current = "";

      const result = await streamChat(
        apiKey,
        continuedMessages,
        (chunk) => {
          streamTextRef.current += chunk;
          const text = streamTextRef.current;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, content: text } : m
            )
          );
          scrollToEnd();
        },
        (error) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: `Error: ${error}` }
                : m
            )
          );
          setIsStreaming(false);
          abortRef.current = null;
        },
        controller.signal,
        system
      );

      if (result.type === "tool_use") {
        // Recursive tool use (unlikely but handle it)
        await handleToolUse(
          result.requests,
          continuedMessages,
          assistantMsgId,
          controller,
          system
        );
      } else {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [apiKey, scrollToEnd]
  );

  const handleSend = useCallback(
    async (text: string) => {
      if (!apiKey || isStreaming) return;

      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      };

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);
      streamTextRef.current = "";
      scrollToEnd();

      const history = enrichMessages([...messages, userMsg]);
      const dates = await listChatDates();
      const system = await getSystemPrompt(
        dates.filter((d) => d !== dateKey()),
        memories,
        customPrompt
      );

      const controller = new AbortController();
      abortRef.current = controller;

      const result = await streamChat(
        apiKey,
        history,
        (chunk) => {
          streamTextRef.current += chunk;
          const t = streamTextRef.current;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: t } : m
            )
          );
          scrollToEnd();
        },
        (error) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: `Error: ${error}` }
                : m
            )
          );
          setIsStreaming(false);
          abortRef.current = null;
        },
        controller.signal,
        system
      );

      if (result.type === "tool_use") {
        await handleToolUse(
          result.requests,
          history,
          assistantMsg.id,
          controller,
          system
        );
      } else {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [apiKey, messages, isStreaming, scrollToEnd, handleToolUse, customPrompt]
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    abortRef.current = null;
  }, []);

  const handleLogout = useCallback(() => {
    const doLogout = async () => {
      if (isStreaming) handleStop();
      if (messages.length > 0) await saveChat(messages);
      await deleteProviderConfig();
      router.replace("/");
    };

    if (Platform.OS === "web") {
      if (confirm("Remove API key and sign out?")) doLogout();
    } else {
      Alert.alert("Sign Out", "Remove API key and sign out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: doLogout },
      ]);
    }
  }, [isStreaming, handleStop, messages]);

  const renderItem = useCallback(
    ({ item, index }: { item: Message; index: number }) => (
      <ChatBubble
        role={item.role}
        content={item.content}
        isStreaming={isStreaming && index === messages.length - 1}
        index={index}
      />
    ),
    [isStreaming, messages.length]
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Animated.View entering={FadeIn.duration(800)} style={styles.emptyLogo}>
          <Text style={styles.emptyLogoText}>C</Text>
        </Animated.View>
        <Animated.Text
          entering={FadeInDown.delay(200).duration(600)}
          style={styles.emptyTitle}
        >
          What's on your mind?
        </Animated.Text>
        <Animated.Text
          entering={FadeInDown.delay(400).duration(600)}
          style={styles.emptySubtitle}
        >
          Start a conversation with Claude
        </Animated.Text>
      </View>
    ),
    []
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.push("/history")}
            style={styles.headerButton}
          >
            <Ionicons
              name="time-outline"
              size={22}
              color={theme.colors.textDim}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/wiki")}
            style={styles.headerButton}
          >
            <Ionicons
              name="book-outline"
              size={22}
              color={theme.colors.textDim}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <TouchableOpacity
            onPress={() => router.push("/avatar")}
            activeOpacity={0.8}
          >
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>clood</Text>
              <View style={styles.headerDot} />
            </View>
          </TouchableOpacity>
          <MoodPill />
        </View>
        <TouchableOpacity
          onPress={() => setMenuOpen(true)}
          style={styles.headerButton}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={22}
            color={theme.colors.textDim}
          />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.messageList,
          messages.length === 0 && styles.messageListEmpty,
        ]}
        ListEmptyComponent={renderEmpty}
        onContentSizeChange={scrollToEnd}
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      />

      {/* Input */}
      <View style={{ paddingBottom: insets.bottom }}>
        <ChatInput
          onSend={handleSend}
          onStop={handleStop}
          isStreaming={isStreaming}
        />
      </View>
      <MenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onDream={async () => {
          try {
            const results = await dream();
            const mems = await getAllMemories();
            setMemories(mems);
            Alert.alert("Dream complete", `Processed ${results.length} topics`);
          } catch (e: any) {
            Alert.alert("Dream failed", e.message);
          }
        }}
        onCustomPromptChange={setCustomPromptState}
        onLogout={handleLogout}
      />
    </KeyboardAvoidingView>
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.bg,
  },
  headerLeft: {
    flexDirection: "row",
    gap: 2,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.sm,
  },
  headerCenter: {
    alignItems: "center",
    gap: 6,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  headerTitle: {
    fontSize: theme.font.size.lg,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accent,
    marginBottom: 4,
    marginLeft: 1,
  },
  messageList: {
    paddingVertical: theme.spacing.md,
  },
  messageListEmpty: {
    flex: 1,
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  emptyLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.accentGlow,
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.lg,
  },
  emptyLogoText: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.accent,
  },
  emptyTitle: {
    fontSize: theme.font.size.xl,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: theme.font.size.md,
    color: theme.colors.textDim,
  },
});
