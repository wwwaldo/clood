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
