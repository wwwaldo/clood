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
import { getApiKey, deleteApiKey } from "../src/lib/storage";
import { streamChat, type Message, type ToolUseRequest } from "../src/lib/api";
import { enrichMessages } from "../src/lib/enrichment";
import { getSystemPrompt } from "../src/lib/mood";
import {
  scheduleDailyNotification,
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
import { ChatBubble } from "../src/components/ChatBubble";
import { ChatInput } from "../src/components/ChatInput";
import { MoodPill } from "../src/components/MoodPill";

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [apiKey, setApiKeyState] = useState("");
  const [chatDates, setChatDates] = useState<string[]>([]);
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
      scheduleDailyNotification();

      const todayMessages = await getTodayChat();
      if (todayMessages.length > 0) {
        setMessages(todayMessages);
      }

      const dates = await listChatDates();
      setChatDates(dates);
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
      saveChat(messages);
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
      const system = getSystemPrompt(dates.filter((d) => d !== dateKey()));

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
    [apiKey, messages, isStreaming, scrollToEnd, handleToolUse]
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    abortRef.current = null;
  }, []);

  const handleNewChat = useCallback(async () => {
    if (isStreaming) handleStop();
    // Save current messages before clearing
    if (messages.length > 0) {
      await saveChat(messages);
    }
    setMessages([]);
  }, [isStreaming, handleStop, messages]);

  const handleLogout = useCallback(() => {
    const doLogout = async () => {
      if (isStreaming) handleStop();
      if (messages.length > 0) await saveChat(messages);
      await deleteApiKey();
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
          <TouchableOpacity onPress={handleNewChat} style={styles.headerButton}>
            <Ionicons
              name="create-outline"
              size={22}
              color={theme.colors.textDim}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.headerCenter}>
          <TouchableOpacity
            onLongPress={__DEV__ ? () => sendTestNotification() : undefined}
            activeOpacity={0.8}
          >
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>clood</Text>
              <View style={styles.headerDot} />
            </View>
          </TouchableOpacity>
          <MoodPill />
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.headerButton}>
          <Ionicons
            name="log-out-outline"
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
        keyboardDismissMode="interactive"
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
