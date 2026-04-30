import * as Calendar from "expo-calendar";
import { Platform } from "react-native";

/**
 * Request calendar read+write permissions. Returns true if granted.
 */
export async function ensureCalendarPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === "granted";
}

/**
 * Get events across all calendars for a date range.
 * @param startDate YYYY-MM-DD
 * @param endDate   YYYY-MM-DD
 */
export async function getEvents(
  startDate: string,
  endDate: string
): Promise<Calendar.Event[]> {
  if (Platform.OS === "web") return [];

  const granted = await ensureCalendarPermission();
  if (!granted) throw new Error("Calendar permission not granted");

  const calendars = await Calendar.getCalendarsAsync(
    Calendar.EntityTypes.EVENT
  );
  const calendarIds = calendars.map((c) => c.id);

  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T23:59:59");

  return Calendar.getEventsAsync(calendarIds, start, end);
}

/**
 * Create an event on the device's default calendar.
 * Returns the new event ID.
 */
export async function createEvent(
  title: string,
  startDate: string,
  endDate: string,
  notes?: string,
  location?: string
): Promise<string> {
  if (Platform.OS === "web") throw new Error("Calendar not available on web");

  const granted = await ensureCalendarPermission();
  if (!granted) throw new Error("Calendar permission not granted");

  const calendarId = await getDefaultCalendarId();

  const eventId = await Calendar.createEventAsync(calendarId, {
    title,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    notes,
    location,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  return eventId;
}

/**
 * Delete an event by ID.
 */
export async function deleteEvent(eventId: string): Promise<void> {
  if (Platform.OS === "web") throw new Error("Calendar not available on web");

  const granted = await ensureCalendarPermission();
  if (!granted) throw new Error("Calendar permission not granted");

  await Calendar.deleteEventAsync(eventId);
}

/**
 * Find the default calendar. On iOS, uses the default calendar for new events.
 * On Android, picks the first writable calendar.
 */
async function getDefaultCalendarId(): Promise<string> {
  if (Platform.OS === "ios") {
    const defaultCal = await Calendar.getDefaultCalendarAsync();
    return defaultCal.id;
  }

  // Android: find first writable calendar
  const calendars = await Calendar.getCalendarsAsync(
    Calendar.EntityTypes.EVENT
  );
  const writable = calendars.find(
    (c) => c.accessLevel === Calendar.CalendarAccessLevel.OWNER
  );
  if (writable) return writable.id;

  // Fallback: create one
  const newId = await Calendar.createCalendarAsync({
    title: "Clood",
    color: "#d4a574",
    entityType: Calendar.EntityTypes.EVENT,
    source: {
      isLocalAccount: true,
      name: "Clood",
      type: Calendar.SourceType.LOCAL,
    },
    name: "Clood",
    ownerAccount: "clood",
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
  return newId;
}

/**
 * Format events into a readable string for Claude's tool result.
 */
export function formatEventsForTool(
  events: Calendar.Event[],
  startDate: string,
  endDate: string
): string {
  if (events.length === 0) {
    return `No events found between ${startDate} and ${endDate}.`;
  }

  const lines = events.map((e) => {
    const start = new Date(e.startDate);
    const end = new Date(e.endDate);
    const fmt = (d: Date) => {
      const h = d.getHours() % 12 || 12;
      const min = String(d.getMinutes()).padStart(2, "0");
      const ampm = d.getHours() >= 12 ? "PM" : "AM";
      return `${h}:${min} ${ampm}`;
    };

    let line = `- ${e.title} (${fmt(start)} – ${fmt(end)})`;
    if (e.location) line += ` @ ${e.location}`;
    if (e.notes) line += ` — ${e.notes}`;
    line += ` [id: ${e.id}]`;
    return line;
  });

  return `Events from ${startDate} to ${endDate}:\n${lines.join("\n")}`;
}
