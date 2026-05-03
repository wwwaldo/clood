import { fetch as expoFetch } from "expo/fetch";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface ToolUseRequest {
  toolId: string;
  toolName: string;
  input: Record<string, unknown>;
}

export type StreamResult =
  | { type: "done" }
  | { type: "tool_use"; requests: ToolUseRequest[] };

const TOOLS = [
  {
    name: "read_past_chat",
    description:
      "Read the user's chat history from a specific date. Use this to recall what was discussed on a previous day.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: {
          type: "string" as const,
          description:
            "Date in YYYY-MM-DD format, e.g. '2026-04-02' for yesterday",
        },
      },
      required: ["date"],
    },
  },
  {
    name: "recall",
    description:
      "Search your long-term memory for facts and context from past conversations. Use when the user references something you should know, or when you need more context about a topic not already in your memories above.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string" as const,
          description:
            "What to remember — keywords or a topic name",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_meal_plan",
    description:
      "Look up the meal plan for any day of the week. Use when the user asks about meals on a day other than today, or wants to see the full week's plan. Today's meals are already in your system prompt — use this for other days.",
    input_schema: {
      type: "object" as const,
      properties: {
        day: {
          type: "string" as const,
          description:
            "Day of the week, e.g. 'monday', 'tuesday'. Use 'all' to get the full week.",
        },
      },
      required: ["day"],
    },
  },
  {
    name: "get_calendar_events",
    description:
      "Get events from the user's device calendar within a date range. Use when the user asks about their schedule, upcoming events, or what's on their calendar.",
    input_schema: {
      type: "object" as const,
      properties: {
        startDate: {
          type: "string" as const,
          description: "Start date in YYYY-MM-DD format",
        },
        endDate: {
          type: "string" as const,
          description: "End date in YYYY-MM-DD format",
        },
      },
      required: ["startDate", "endDate"],
    },
  },
  {
    name: "create_calendar_event",
    description:
      "Create a new event on the user's device calendar. Use when the user wants to schedule, add, or book something.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string" as const,
          description: "Event title",
        },
        startDate: {
          type: "string" as const,
          description: "Start date and time in ISO 8601 format, e.g. '2026-04-30T14:00:00'",
        },
        endDate: {
          type: "string" as const,
          description: "End date and time in ISO 8601 format, e.g. '2026-04-30T15:00:00'",
        },
        notes: {
          type: "string" as const,
          description: "Optional notes or description for the event",
        },
        location: {
          type: "string" as const,
          description: "Optional location for the event",
        },
      },
      required: ["title", "startDate", "endDate"],
    },
  },
  {
    name: "delete_calendar_event",
    description:
      "Delete an event from the user's device calendar by its ID. Use when the user wants to cancel or remove an event. You must know the event ID — use get_calendar_events first if needed.",
    input_schema: {
      type: "object" as const,
      properties: {
        eventId: {
          type: "string" as const,
          description: "The ID of the event to delete",
        },
      },
      required: ["eventId"],
    },
  },
  {
    name: "schedule_checkins",
    description:
      "Schedule up to 3 times today when you want to proactively reach out to the user. At each time, you'll be woken up in the background to generate a fresh, context-aware message based on the time, meal plan, memories, and your reason. The message appears as a push notification and is saved to the chat. Past times are skipped. Previous check-ins are replaced.",
    input_schema: {
      type: "object" as const,
      properties: {
        checkins: {
          type: "array" as const,
          description: "Array of check-ins to schedule (max 3)",
          items: {
            type: "object" as const,
            properties: {
              hour: {
                type: "number" as const,
                description: "Hour in 24h format (0-23)",
              },
              minute: {
                type: "number" as const,
                description: "Minute (0-59)",
              },
              reason: {
                type: "string" as const,
                description: "Why you want to check in — context for your future self when generating the message (e.g. 'remind about lunch', 'ask how the meeting went')",
              },
            },
            required: ["hour", "minute", "reason"],
          },
        },
      },
      required: ["checkins"],
    },
  },
];

/**
 * Stream a chat response. Returns a StreamResult indicating whether the response
 * completed normally or is requesting tool use (which the caller must handle).
 */
export async function streamChat(
  apiKey: string,
  messages: { role: string; content: unknown }[],
  onChunk: (text: string) => void,
  onError: (error: string) => void,
  signal?: AbortSignal,
  system?: string
): Promise<StreamResult> {
  try {
    const body: Record<string, unknown> = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      stream: true,
      messages,
      tools: TOOLS,
    };
    if (system) body.system = system;

    const response = await expoFetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.error?.message || `API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response stream");

    const decoder = new TextDecoder();
    let buffer = "";
    const toolUseRequests: ToolUseRequest[] = [];
    let currentToolId = "";
    let currentToolName = "";
    let currentToolInput = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") continue;

        try {
          const event = JSON.parse(data);

          if (
            event.type === "content_block_delta" &&
            event.delta?.type === "text_delta"
          ) {
            onChunk(event.delta.text);
          }

          // Track tool use blocks
          if (event.type === "content_block_start" && event.content_block?.type === "tool_use") {
            currentToolId = event.content_block.id;
            currentToolName = event.content_block.name;
            currentToolInput = "";
          }

          if (
            event.type === "content_block_delta" &&
            event.delta?.type === "input_json_delta"
          ) {
            currentToolInput += event.delta.partial_json;
          }

          if (event.type === "content_block_stop" && currentToolId) {
            try {
              const input = currentToolInput
                ? JSON.parse(currentToolInput)
                : {};
              toolUseRequests.push({
                toolId: currentToolId,
                toolName: currentToolName,
                input,
              });
            } catch {
              // skip malformed tool input
            }
            currentToolId = "";
            currentToolName = "";
            currentToolInput = "";
          }
        } catch {
          // skip unparseable lines
        }
      }
    }

    if (toolUseRequests.length > 0) {
      return { type: "tool_use", requests: toolUseRequests };
    }

    return { type: "done" };
  } catch (err: any) {
    if (err.name === "AbortError") return { type: "done" };
    onError(err.message || "Something went wrong");
    return { type: "done" };
  }
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
