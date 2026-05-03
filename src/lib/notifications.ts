import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
const CHECKINS_STORAGE_KEY = "clood_scheduled_checkins";

export interface ScheduledCheckIn {
  hour: number;
  minute: number;
  reason: string;
  fired: boolean;
}

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

// --- Check-in storage (background task reads these) ---

/**
 * Store check-in times for the background task to process.
 * Replaces any existing check-ins. Past times are skipped.
 */
export async function scheduleCheckIns(
  checkIns: { hour: number; minute: number; reason: string }[]
): Promise<{ scheduled: number; skipped: number }> {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  let scheduled = 0;
  let skipped = 0;

  const stored: ScheduledCheckIn[] = [];

  for (const ci of checkIns.slice(0, 3)) {
    const ciMinutes = ci.hour * 60 + ci.minute;
    if (ciMinutes <= currentMinutes) {
      skipped++;
      continue;
    }
    stored.push({ ...ci, fired: false });
    scheduled++;
  }

  await AsyncStorage.setItem(CHECKINS_STORAGE_KEY, JSON.stringify(stored));

  // Ensure notification permissions for when background task fires
  if (Platform.OS !== "web") {
    await requestPermissions();
  }

  return { scheduled, skipped };
}

/**
 * Get pending (unfired) check-ins that are due.
 */
export async function getDueCheckIns(): Promise<ScheduledCheckIn[]> {
  const raw = await AsyncStorage.getItem(CHECKINS_STORAGE_KEY);
  if (!raw) return [];

  let checkIns: ScheduledCheckIn[];
  try {
    checkIns = JSON.parse(raw);
  } catch {
    return [];
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return checkIns.filter(
    (ci) => !ci.fired && ci.hour * 60 + ci.minute <= currentMinutes
  );
}

/**
 * Mark a check-in as fired so it doesn't trigger again.
 */
export async function markCheckInFired(
  hour: number,
  minute: number
): Promise<void> {
  const raw = await AsyncStorage.getItem(CHECKINS_STORAGE_KEY);
  if (!raw) return;

  let checkIns: ScheduledCheckIn[];
  try {
    checkIns = JSON.parse(raw);
  } catch {
    return;
  }

  const updated = checkIns.map((ci) =>
    ci.hour === hour && ci.minute === minute ? { ...ci, fired: true } : ci
  );
  await AsyncStorage.setItem(CHECKINS_STORAGE_KEY, JSON.stringify(updated));
}

/**
 * Fire a notification with Claude's check-in message.
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
    trigger: null, // fire immediately
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
