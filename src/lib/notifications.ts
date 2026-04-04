import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Schedule a daily local notification at 9:00 AM.
 * Cancels any existing scheduled notifications first to avoid duplicates.
 */
export async function scheduleDailyNotification(): Promise<void> {
  if (Platform.OS === "web") return;

  const granted = await requestPermissions();
  if (!granted) return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "clood",
      body: "Good morning! I'm feeling chatty today \u2728",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
    },
  });
}

/**
 * Fire a test notification after a short delay.
 * Only intended for dev/debug use.
 */
export async function sendTestNotification(): Promise<void> {
  if (Platform.OS === "web") {
    console.log("[notifications] skipped on web");
    return;
  }

  const granted = await requestPermissions();
  if (!granted) {
    console.log("[notifications] permission denied");
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "clood",
      body: "Test notification — if you see this, it works!",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
    },
  });
}
