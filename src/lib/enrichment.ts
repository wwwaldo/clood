import type { Message } from "./api";

interface ApiMessage {
  role: "user" | "assistant";
  content: string;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const day = days[d.getDay()];
  const month = months[d.getMonth()];
  const date = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${day} ${month} ${date}, ${h12}:${minutes} ${ampm}`;
}

/**
 * Transforms UI messages into API-ready messages.
 * User messages get a human-readable timestamp prepended so Claude
 * is aware of when each message was sent. Assistant messages pass through unchanged.
 * The UI never sees the enriched content — this runs only at the API boundary.
 */
export function enrichMessages(messages: Message[]): ApiMessage[] {
  return messages.map((msg) => {
    if (msg.role === "assistant") {
      return { role: msg.role, content: msg.content };
    }
    const time = formatTimestamp(msg.timestamp);
    return { role: msg.role, content: `[${time}] ${msg.content}` };
  });
}
