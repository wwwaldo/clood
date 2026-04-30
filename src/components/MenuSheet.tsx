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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { theme } from "../lib/theme";
import { getCustomPrompt, setCustomPrompt } from "../lib/storage";

type MenuView = "menu" | "prompt";

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

  useEffect(() => {
    if (visible) {
      setView("menu");
    }
  }, [visible]);

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
                <View style={{ width: 22 }} />
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

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  !promptDirty && styles.saveButtonDisabled,
                ]}
                onPress={handleSavePrompt}
                disabled={!promptDirty}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
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
});
