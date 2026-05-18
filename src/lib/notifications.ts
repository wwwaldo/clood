import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const DAILY_CATEGORY = "clood_daily";

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

async function cancelByCategory(category: string): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    if (n.content.categoryIdentifier === category) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

/**
 * Schedule a daily local notification at 9:00 AM.
 */
export async function scheduleDailyNotification(): Promise<void> {
  if (Platform.OS === "web") return;

  const granted = await requestPermissions();
  if (!granted) return;

  await cancelByCategory(DAILY_CATEGORY);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "clood",
      body: "Good morning! I'm feeling chatty today \u2728",
      categoryIdentifier: DAILY_CATEGORY,
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
 * Fire a notification immediately with the given message.
 * Used by the heartbeat background task.
 */
export async function fireCheckInNotification(
  message: string
): Promise<void> {
  if (Platform.OS === "web") return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "clood",
      body: message,
      sound: true,
    },
    trigger: null,
  });
}

/**
 * Fire a test notification after a short delay.
 */
export async function sendTestNotification(): Promise<void> {
  if (Platform.OS === "web") return;

  const granted = await requestPermissions();
  if (!granted) return;

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
