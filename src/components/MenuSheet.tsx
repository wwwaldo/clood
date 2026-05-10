import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Switch,
} from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { theme } from "../lib/theme";
import { getCustomPrompt, setCustomPrompt } from "../lib/storage";
import {
  getHeartbeatSettings,
  setHeartbeatSettings,
  type HeartbeatSettings,
} from "../lib/checkinTask";
import {
  getSelectedModel,
  setSelectedModel,
  getSpiceMode,
  setSpiceMode,
  BEDROCK_MODELS,
  type BedrockModel,
} from "../lib/storage";

type MenuView = "menu" | "prompt" | "heartbeat" | "model";

interface MenuSheetProps {
  visible: boolean;
  onClose: () => void;
  onDream: () => Promise<void>;
  onCustomPromptChange: (prompt: string) => void;
  onLogout: () => void;
}

export function MenuSheet({
  visible,
  onClose,
  onDream,
  onCustomPromptChange,
  onLogout,
}: MenuSheetProps) {
  const [view, setView] = useState<MenuView>("menu");
  const [dreaming, setDreaming] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [promptDirty, setPromptDirty] = useState(false);
  const [heartbeat, setHeartbeat] = useState<HeartbeatSettings>({
    enabled: false,
    intervalMinutes: 30,
  });
  const [selectedModel, setSelectedModelState] = useState<BedrockModel>(
    BEDROCK_MODELS[0]
  );
  const [spicy, setSpicy] = useState(false);

  useEffect(() => {
    if (visible) {
      setView("menu");
      getSpiceMode().then(setSpicy);
    }
  }, [visible]);

  const handleOpenModel = async () => {
    const current = await getSelectedModel();
    setSelectedModelState(current);
    setView("model");
  };

  const handleSelectModel = async (model: BedrockModel) => {
    setSelectedModelState(model);
    await setSelectedModel(model.id);
  };

  const handleOpenHeartbeat = async () => {
    const settings = await getHeartbeatSettings();
    setHeartbeat(settings);
    setView("heartbeat");
  };

  const handleSaveHeartbeat = async (settings: HeartbeatSettings) => {
    setHeartbeat(settings);
    await setHeartbeatSettings(settings);
  };

  const handleOpenPrompt = async () => {
    const current = await getCustomPrompt();
    setPromptText(current);
    setPromptDirty(false);
    setView("prompt");
  };

  const handleSavePrompt = async () => {
    await setCustomPrompt(promptText);
    onCustomPromptChange(promptText);
    setPromptDirty(false);
    onClose();
  };

  const handleDream = async () => {
    setDreaming(true);
    try {
      await onDream();
    } finally {
      setDreaming(false);
    }
  };

  const handleClose = () => {
    if (view === "prompt" && promptDirty) {
      const doDiscard = () => onClose();
      if (Platform.OS === "web") {
        if (confirm("Discard unsaved changes?")) doDiscard();
      } else {
        Alert.alert("Unsaved changes", "Discard edits to system prompt?", [
          { text: "Keep editing", style: "cancel" },
          { text: "Discard", style: "destructive", onPress: doDiscard },
        ]);
      }
      return;
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={styles.sheet}
          onPress={(e) => e.stopPropagation()}
        >
          {view === "menu" && (
            <>
              <Text style={styles.title}>Menu</Text>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onClose();
                  router.push("/cookbook");
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="nutrition-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <View style={styles.menuTextWrap}>
                  <Text style={styles.menuLabel}>Cookbook</Text>
                  <Text style={styles.menuDesc}>
                    7-day meal plan with recipes
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={theme.colors.textMuted}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onClose();
                  router.push("/wiki");
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="book-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <View style={styles.menuTextWrap}>
                  <Text style={styles.menuLabel}>Wiki</Text>
                  <Text style={styles.menuDesc}>
                    Browse and edit your memories
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={theme.colors.textMuted}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onClose();
                  router.push("/portal");
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="globe-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <View style={styles.menuTextWrap}>
                  <Text style={styles.menuLabel}>Wiki Portal</Text>
                  <Text style={styles.menuDesc}>
                    Serve wiki to your laptop browser
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={theme.colors.textMuted}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleDream}
                disabled={dreaming}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="moon-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <View style={styles.menuTextWrap}>
                  <Text style={styles.menuLabel}>
                    {dreaming ? "Dreaming..." : "Trigger dreaming"}
                  </Text>
                  <Text style={styles.menuDesc}>
                    Consolidate today's chat into memories
                  </Text>
                </View>
                {dreaming && (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.accent}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleOpenHeartbeat}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="pulse-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <View style={styles.menuTextWrap}>
                  <Text style={styles.menuLabel}>Heartbeat</Text>
                  <Text style={styles.menuDesc}>
                    {heartbeat.enabled
                      ? `Every ~${heartbeat.intervalMinutes}m`
                      : "Proactive check-ins (off)"}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={theme.colors.textMuted}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleOpenModel}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="hardware-chip-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <View style={styles.menuTextWrap}>
                  <Text style={styles.menuLabel}>Model</Text>
                  <Text style={styles.menuDesc}>
                    {selectedModel.label} — ${selectedModel.inputCost}/$
                    {selectedModel.outputCost} per MTok
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={theme.colors.textMuted}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleOpenPrompt}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="create-outline"
                  size={20}
                  color={theme.colors.accent}
                />
                <View style={styles.menuTextWrap}>
                  <Text style={styles.menuLabel}>Edit system prompt</Text>
                  <Text style={styles.menuDesc}>
                    Add custom instructions for clood
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={theme.colors.textMuted}
                />
              </TouchableOpacity>

              <View style={styles.spiceRow}>
                <View style={styles.menuTextWrap}>
                  <Text style={styles.menuLabel}>Spice mode</Text>
                  <Text style={styles.menuDesc}>
                    {spicy ? "Relationship mode on" : "Off"}
                  </Text>
                </View>
                <Switch
                  value={spicy}
                  onValueChange={async (val) => {
                    setSpicy(val);
                    await setSpiceMode(val);
                  }}
                  trackColor={{
                    false: theme.colors.border,
                    true: "#e05555",
                  }}
                  thumbColor={theme.colors.text}
                />
              </View>

              <TouchableOpacity
                style={[styles.menuItem, styles.logoutItem]}
                onPress={() => {
                  onClose();
                  onLogout();
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color={theme.colors.danger}
                />
                <View style={styles.menuTextWrap}>
                  <Text style={[styles.menuLabel, { color: theme.colors.danger }]}>
                    Sign out
                  </Text>
                  <Text style={styles.menuDesc}>
                    Remove API key and sign out
                  </Text>
                </View>
              </TouchableOpacity>
            </>
          )}

          {view === "model" && (
            <>
              <View style={styles.subHeader}>
                <TouchableOpacity onPress={() => setView("menu")}>
                  <Ionicons
                    name="arrow-back"
                    size={22}
                    color={theme.colors.textDim}
                  />
                </TouchableOpacity>
                <Text style={styles.title}>Model</Text>
                <View style={{ width: 22 }} />
              </View>

              {BEDROCK_MODELS.map((model) => {
                const active = selectedModel.id === model.id;
                return (
                  <TouchableOpacity
                    key={model.id}
                    style={[
                      styles.menuItem,
                      active && {
                        borderColor: theme.colors.accent,
                        backgroundColor: theme.colors.accentGlow,
                      },
                    ]}
                    onPress={() => handleSelectModel(model)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.menuTextWrap}>
                      <Text
                        style={[
                          styles.menuLabel,
                          active && { color: theme.colors.accent },
                        ]}
                      >
                        {model.label}
                      </Text>
                      <Text style={styles.menuDesc}>
                        ${model.inputCost} in / ${model.outputCost} out per MTok
                      </Text>
                    </View>
                    {active && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={theme.colors.accent}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {view === "heartbeat" && (
            <>
              <View style={styles.subHeader}>
                <TouchableOpacity onPress={() => setView("menu")}>
                  <Ionicons
                    name="arrow-back"
                    size={22}
                    color={theme.colors.textDim}
                  />
                </TouchableOpacity>
                <Text style={styles.title}>Heartbeat</Text>
                <View style={{ width: 22 }} />
              </View>

              <Text style={styles.promptHint}>
                When enabled, clood periodically wakes up in the background. If
                it has something worth saying — a meal reminder, a follow-up —
                it sends a notification. Otherwise it stays quiet.
              </Text>

              <View style={styles.heartbeatToggleRow}>
                <Text style={styles.heartbeatLabel}>Enable heartbeat</Text>
                <Switch
                  value={heartbeat.enabled}
                  onValueChange={(enabled) =>
                    handleSaveHeartbeat({ ...heartbeat, enabled })
                  }
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.accent,
                  }}
                  thumbColor={theme.colors.text}
                />
              </View>

              {heartbeat.enabled && (
                <View style={styles.heartbeatSliderWrap}>
                  <Text style={styles.heartbeatLabel}>
                    Interval: ~{heartbeat.intervalMinutes}m
                  </Text>
                  <View style={styles.heartbeatSliderRow}>
                    <Text style={styles.heartbeatSliderLabel}>15m</Text>
                    <Slider
                      style={{ flex: 1, height: 40 }}
                      minimumValue={15}
                      maximumValue={120}
                      step={5}
                      value={heartbeat.intervalMinutes}
                      onSlidingComplete={(val) =>
                        handleSaveHeartbeat({
                          ...heartbeat,
                          intervalMinutes: val,
                        })
                      }
                      minimumTrackTintColor={theme.colors.accent}
                      maximumTrackTintColor={theme.colors.border}
                      thumbTintColor={theme.colors.accent}
                    />
                    <Text style={styles.heartbeatSliderLabel}>2h</Text>
                  </View>
                  <Text style={styles.heartbeatHint}>
                    ±20% jitter applied so it feels natural. Claude may skip
                    heartbeats if there's nothing relevant to say.
                  </Text>
                </View>
              )}
            </>
          )}

          {view === "prompt" && (
            <>
              <View style={styles.subHeader}>
                <TouchableOpacity onPress={() => {
                  if (promptDirty) {
                    setView("menu");
                    return;
                  }
                  setView("menu");
                }}>
                  <Ionicons
                    name="arrow-back"
                    size={22}
                    color={theme.colors.textDim}
                  />
                </TouchableOpacity>
                <Text style={styles.title}>System Prompt</Text>
                <TouchableOpacity
                  onPress={handleSavePrompt}
                  disabled={!promptDirty}
                >
                  <Text
                    style={{
                      fontSize: theme.font.size.sm,
                      fontWeight: "700",
                      color: promptDirty
                        ? theme.colors.accent
                        : theme.colors.textMuted,
                    }}
                  >
                    Save
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.promptHint}>
                These instructions are appended to clood's system prompt for
                every message.
              </Text>

              <TextInput
                style={styles.promptInput}
                value={promptText}
                onChangeText={(t) => {
                  setPromptText(t);
                  setPromptDirty(true);
                }}
                placeholder="e.g. Always respond in haiku. Never use emoji."
                placeholderTextColor={theme.colors.textMuted}
                multiline
                textAlignVertical="top"
                autoCapitalize="sentences"
                autoCorrect
              />
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl + 16,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: theme.colors.border,
    maxHeight: "80%",
  },
  title: {
    fontSize: theme.font.size.lg,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bg,
    marginBottom: theme.spacing.sm,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuLabel: {
    fontSize: theme.font.size.md,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 2,
  },
  menuDesc: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textDim,
    lineHeight: 16,
  },
  promptHint: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textDim,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },
  promptInput: {
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontSize: theme.font.size.md,
    color: theme.colors.text,
    minHeight: 160,
    maxHeight: 300,
  },
  saveButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: theme.spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    color: theme.colors.bg,
    fontSize: theme.font.size.md,
    fontWeight: "700",
  },
  logoutItem: {
    marginTop: theme.spacing.sm,
    borderColor: theme.colors.danger + "33",
  },
  spiceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bg,
    marginBottom: theme.spacing.sm,
  },
  heartbeatToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  heartbeatLabel: {
    fontSize: theme.font.size.md,
    fontWeight: "600",
    color: theme.colors.text,
  },
  heartbeatSliderWrap: {
    paddingHorizontal: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
  },
  heartbeatSliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: theme.spacing.sm,
  },
  heartbeatSliderLabel: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textMuted,
    fontWeight: "600",
    width: 24,
  },
  heartbeatHint: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
    lineHeight: 18,
  },
});
