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
  ScrollView,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../src/lib/theme";
import {
  getProviderConfig,
  setProviderConfig,
  type ApiProvider,
} from "../src/lib/storage";
import {
  validateAnthropicKey,
  validateBedrockCredentials,
} from "../src/lib/api";

export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const [provider, setProvider] = useState<ApiProvider>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [awsAccessKey, setAwsAccessKey] = useState("");
  const [awsSecretKey, setAwsSecretKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getProviderConfig().then((config) => {
      if (config) {
        router.replace("/chat");
      } else {
        setLoading(false);
      }
    });
  }, []);

  const canSubmit =
    provider === "anthropic"
      ? apiKey.trim().length > 0
      : awsAccessKey.trim().length > 0 && awsSecretKey.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError("");
    setValidating(true);

    if (provider === "anthropic") {
      const trimmed = apiKey.trim();
      if (!trimmed.startsWith("sk-ant-")) {
        setError("Key should start with sk-ant-");
        setValidating(false);
        return;
      }
      const valid = await validateAnthropicKey(trimmed);
      if (valid) {
        await setProviderConfig({ provider: "anthropic", apiKey: trimmed });
        router.replace("/chat");
      } else {
        setError("Invalid API key. Check it and try again.");
      }
    } else {
      const result = await validateBedrockCredentials(
        awsAccessKey.trim(),
        awsSecretKey.trim()
      );
      if (result.ok) {
        await setProviderConfig({
          provider: "bedrock",
          awsAccessKey: awsAccessKey.trim(),
          awsSecretKey: awsSecretKey.trim(),
          awsRegion: "us-east-1",
        });
        router.replace("/chat");
      } else {
        setError(result.error || "Unknown error connecting to Bedrock.");
      }
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
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
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
          <Text style={styles.label}>Provider</Text>
          <View style={styles.providerRow}>
            <TouchableOpacity
              style={[
                styles.providerBtn,
                provider === "anthropic" && styles.providerBtnActive,
              ]}
              onPress={() => { setProvider("anthropic"); setError(""); }}
            >
              <Text style={[styles.providerBtnText, provider === "anthropic" && styles.providerBtnTextActive]}>
                Anthropic
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.providerBtn,
                provider === "bedrock" && styles.providerBtnActive,
              ]}
              onPress={() => { setProvider("bedrock"); setError(""); }}
            >
              <Text style={[styles.providerBtnText, provider === "bedrock" && styles.providerBtnTextActive]}>
                AWS Bedrock
              </Text>
            </TouchableOpacity>
          </View>

          {provider === "anthropic" && (
            <>
              <Text style={styles.label}>API Key</Text>
              <TextInput
                style={[styles.input, error ? styles.inputError : null]}
                placeholder="sk-ant-api03-..."
                placeholderTextColor={theme.colors.textMuted}
                value={apiKey}
                onChangeText={(t) => { setApiKey(t); setError(""); }}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                editable={!validating}
              />
              <Text style={styles.hint}>
                Stored securely on-device. Never sent anywhere except Anthropic.
              </Text>
            </>
          )}

          {provider === "bedrock" && (
            <>
              <Text style={styles.label}>AWS Access Key ID</Text>
              <TextInput
                style={[styles.input, error ? styles.inputError : null]}
                placeholder="AKIA..."
                placeholderTextColor={theme.colors.textMuted}
                value={awsAccessKey}
                onChangeText={(t) => { setAwsAccessKey(t); setError(""); }}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!validating}
              />
              <Text style={styles.label}>AWS Secret Access Key</Text>
              <TextInput
                style={[styles.input, error ? styles.inputError : null]}
                placeholder="wJalr..."
                placeholderTextColor={theme.colors.textMuted}
                value={awsSecretKey}
                onChangeText={(t) => { setAwsSecretKey(t); setError(""); }}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                editable={!validating}
              />
              <Text style={styles.hint}>
                Stored securely on-device. Requests go to Bedrock in us-east-1.
              </Text>
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, (!canSubmit || validating) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || validating}
            activeOpacity={0.8}
          >
            {validating ? (
              <ActivityIndicator color={theme.colors.bg} size="small" />
            ) : (
              <Text style={styles.buttonText}>Get Started</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: theme.spacing.xl },
  logoWrap: { flexDirection: "row", alignItems: "flex-end", alignSelf: "center", marginBottom: theme.spacing.sm },
  logo: { fontSize: theme.font.size.xxl, fontWeight: "700", color: theme.colors.text, letterSpacing: -1 },
  logoDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.accent, marginBottom: 8, marginLeft: 2 },
  subtitle: { fontSize: theme.font.size.md, color: theme.colors.textDim, textAlign: "center", marginBottom: theme.spacing.xl + 8 },
  form: { gap: theme.spacing.sm },
  providerRow: { flexDirection: "row", gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  providerBtn: { flex: 1, paddingVertical: 12, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center" },
  providerBtnActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentGlow },
  providerBtnText: { fontSize: theme.font.size.sm, fontWeight: "600", color: theme.colors.textMuted },
  providerBtnTextActive: { color: theme.colors.accent },
  label: { fontSize: theme.font.size.sm, color: theme.colors.textDim, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: theme.spacing.xs },
  input: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, paddingVertical: 14, fontSize: theme.font.size.md, color: theme.colors.text },
  inputError: { borderColor: theme.colors.danger },
  error: { color: theme.colors.danger, fontSize: theme.font.size.sm },
  hint: { color: theme.colors.textMuted, fontSize: theme.font.size.xs, lineHeight: 18 },
  button: { backgroundColor: theme.colors.accent, borderRadius: theme.radius.md, paddingVertical: 16, alignItems: "center", marginTop: theme.spacing.md },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: theme.colors.bg, fontSize: theme.font.size.md, fontWeight: "700" },
});
