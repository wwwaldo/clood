import { useEffect, useState } from "react";
import { router } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { theme } from "../src/lib/theme";
import { getApiKey, setApiKey } from "../src/lib/storage";
import { validateApiKey } from "../src/lib/api";

export default function SetupScreen() {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getApiKey().then((stored) => {
      if (stored) {
        router.replace("/chat");
      } else {
        setLoading(false);
      }
    });
  }, []);

  const handleSubmit = async () => {
    const trimmed = key.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith("sk-ant-")) {
      setError("Key should start with sk-ant-");
      return;
    }

    setError("");
    setValidating(true);

    const valid = await validateApiKey(trimmed);
    if (valid) {
      await setApiKey(trimmed);
      router.replace("/chat");
    } else {
      setError("Invalid API key. Check it and try again.");
    }
    setValidating(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={theme.colors.accent} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.content}>
        <Animated.View entering={FadeIn.duration(800)} style={styles.logoWrap}>
          <Text style={styles.logo}>clood</Text>
          <View style={styles.logoDot} />
        </Animated.View>

        <Animated.Text
          entering={FadeInUp.delay(300).duration(600)}
          style={styles.subtitle}
        >
          chat with claude, beautifully
        </Animated.Text>

        <Animated.View
          entering={FadeInDown.delay(500).duration(600)}
          style={styles.form}
        >
          <Text style={styles.label}>API Key</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            placeholder="sk-ant-api03-..."
            placeholderTextColor={theme.colors.textMuted}
            value={key}
            onChangeText={(t) => {
              setKey(t);
              setError("");
            }}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            editable={!validating}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Text style={styles.hint}>
            Stored securely on-device. Never sent anywhere except Anthropic.
          </Text>

          <TouchableOpacity
            style={[
              styles.button,
              (!key.trim() || validating) && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!key.trim() || validating}
            activeOpacity={0.8}
          >
            {validating ? (
              <ActivityIndicator color={theme.colors.bg} size="small" />
            ) : (
              <Text style={styles.buttonText}>Get Started</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  logoWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    alignSelf: "center",
    marginBottom: theme.spacing.sm,
  },
  logo: {
    fontSize: theme.font.size.xxl,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: -1,
  },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
    marginBottom: 8,
    marginLeft: 2,
  },
  subtitle: {
    fontSize: theme.font.size.md,
    color: theme.colors.textDim,
    textAlign: "center",
    marginBottom: theme.spacing.xl + 8,
  },
  form: {
    gap: theme.spacing.sm,
  },
  label: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textDim,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    fontSize: theme.font.size.md,
    color: theme.colors.text,
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.font.size.sm,
  },
  hint: {
    color: theme.colors.textMuted,
    fontSize: theme.font.size.xs,
    lineHeight: 18,
  },
  button: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: theme.spacing.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: theme.colors.bg,
    fontSize: theme.font.size.md,
    fontWeight: "700",
  },
});
