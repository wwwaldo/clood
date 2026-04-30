import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { theme } from "../src/lib/theme";
import {
  startWikiServer,
  stopWikiServer,
  isServerRunning,
  type ServerInfo,
} from "../src/lib/wikiServer";

export default function PortalScreen() {
  const insets = useSafeAreaInsets();
  const [running, setRunning] = useState(isServerRunning());
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      // Don't stop server on unmount — let it keep running
    };
  }, []);

  const handleToggle = useCallback(async () => {
    if (running) {
      stopWikiServer();
      setRunning(false);
      setServerInfo(null);
    } else {
      setError("");
      try {
        const info = await startWikiServer();
        setServerInfo(info);
        setRunning(true);
      } catch (e: any) {
        setError(e.message);
      }
    }
  }, [running]);

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
        <Text style={styles.headerTitle}>Wiki Portal</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        <Animated.View entering={FadeIn.duration(600)} style={styles.iconWrap}>
          <Ionicons
            name={running ? "globe-outline" : "desktop-outline"}
            size={48}
            color={running ? theme.colors.accent : theme.colors.textMuted}
          />
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.delay(100).duration(400)}
          style={styles.title}
        >
          {running ? "Portal is live" : "Start the portal"}
        </Animated.Text>

        <Animated.Text
          entering={FadeInDown.delay(200).duration(400)}
          style={styles.subtitle}
        >
          {running
            ? "Open this URL on your laptop browser"
            : "Serve your wiki over the local network so you can browse and edit from your laptop"}
        </Animated.Text>

        {running && serverInfo && (
          <Animated.View
            entering={FadeInDown.delay(300).duration(400)}
            style={styles.urlCard}
          >
            <Text style={styles.urlText}>{serverInfo.url}</Text>
            <Text style={styles.urlHint}>
              Works on same WiFi or via Personal Hotspot
            </Text>
          </Animated.View>
        )}

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.button, running && styles.buttonStop]}
          onPress={handleToggle}
          activeOpacity={0.8}
        >
          <Ionicons
            name={running ? "stop-circle-outline" : "play-circle-outline"}
            size={20}
            color={running ? theme.colors.danger : theme.colors.bg}
          />
          <Text
            style={[styles.buttonText, running && styles.buttonTextStop]}
          >
            {running ? "Stop Server" : "Start Server"}
          </Text>
        </TouchableOpacity>

        {running && (
          <Animated.View
            entering={FadeInDown.delay(400).duration(400)}
            style={styles.tipsCard}
          >
            <Text style={styles.tipTitle}>Connection tips</Text>
            <Text style={styles.tipText}>
              Same WiFi — both devices on the same network
            </Text>
            <Text style={styles.tipText}>
              No WiFi — turn on Personal Hotspot, connect laptop to it, use
              http://172.20.10.1:{serverInfo?.port}
            </Text>
            <Text style={styles.tipText}>
              Keep this app in the foreground while using the portal
            </Text>
          </Animated.View>
        )}
      </View>
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
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  iconWrap: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.font.size.xl,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textDim,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
  },
  urlCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    alignItems: "center",
    marginBottom: theme.spacing.lg,
    width: "100%",
  },
  urlText: {
    fontSize: theme.font.size.lg,
    fontWeight: "700",
    color: theme.colors.accent,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginBottom: 6,
  },
  urlHint: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textMuted,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: theme.font.size.sm,
    marginBottom: theme.spacing.md,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginBottom: theme.spacing.lg,
    width: "100%",
  },
  buttonStop: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.colors.danger + "66",
  },
  buttonText: {
    color: theme.colors.bg,
    fontSize: theme.font.size.md,
    fontWeight: "700",
  },
  buttonTextStop: {
    color: theme.colors.danger,
  },
  tipsCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    width: "100%",
    gap: 8,
  },
  tipTitle: {
    fontSize: theme.font.size.sm,
    fontWeight: "700",
    color: theme.colors.textDim,
    marginBottom: 4,
  },
  tipText: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
});
