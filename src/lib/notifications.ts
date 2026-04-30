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

// Category IDs for filtering scheduled notifications
const DAILY_CATEGORY = "clood_daily";
const CHECKIN_CATEGORY = "clood_checkin";

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Cancel only notifications matching a given category.
 */
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
 * Only cancels existing daily notifications, not check-ins.
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

export interface CheckIn {
  hour: number;   // 0-23
  minute: number; // 0-59
  message: string;
}

/**
 * Schedule check-in notifications for today. Clood decides when and what to say.
 * Cancels any existing check-ins first, then schedules up to 3 new ones.
 * Check-ins in the past (earlier today) are skipped.
 */
export async function scheduleCheckIns(
  checkIns: CheckIn[]
): Promise<{ scheduled: number; skipped: number }> {
  if (Platform.OS === "web") return { scheduled: 0, skipped: 0 };

  const granted = await requestPermissions();
  if (!granted) throw new Error("Notification permission not granted");

  // Clear old check-ins
  await cancelByCategory(CHECKIN_CATEGORY);

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  let scheduled = 0;
  let skipped = 0;

  // Limit to 3
  const limited = checkIns.slice(0, 3);

  for (const ci of limited) {
    const ciMinutes = ci.hour * 60 + ci.minute;
    if (ciMinutes <= currentMinutes) {
      // This time already passed today
      skipped++;
      continue;
    }

    // Schedule as a time interval from now
    const diffSeconds = (ciMinutes - currentMinutes) * 60;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "clood",
        body: ci.message,
        categoryIdentifier: CHECKIN_CATEGORY,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: diffSeconds,
      },
    });
    scheduled++;
  }

  return { scheduled, skipped };
}

/**
 * Cancel all scheduled check-ins.
 */
export async function cancelCheckIns(): Promise<void> {
  if (Platform.OS === "web") return;
  await cancelByCategory(CHECKIN_CATEGORY);
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
