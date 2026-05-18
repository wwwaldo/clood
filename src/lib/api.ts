import { fetch as expoFetch } from "expo/fetch";
import { AwsClient } from "aws4fetch";
import { getProviderConfig, getSelectedModel, type ProviderConfig } from "./storage";

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

const BEDROCK_REGION = "us-east-1";

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
];

// --- Provider fetch ---

const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

async function anthropicFetch(
  apiKey: string,
  body: string,
  streaming: boolean
): Promise<Response> {
  const fetchFn = streaming ? expoFetch : fetch;
  return fetchFn("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body,
  });
}

async function bedrockFetch(
  config: ProviderConfig,
  body: string,
  streaming: boolean,
  modelId: string
): Promise<Response> {
  const aws = new AwsClient({
    accessKeyId: config.awsAccessKey!,
    secretAccessKey: config.awsSecretKey!,
    region: BEDROCK_REGION,
    service: "bedrock",
  });

  const encodedModel = encodeURIComponent(modelId);
  const endpoint = streaming
    ? `https://bedrock-runtime.${BEDROCK_REGION}.amazonaws.com/model/${encodedModel}/invoke-with-response-stream`
    : `https://bedrock-runtime.${BEDROCK_REGION}.amazonaws.com/model/${encodedModel}/invoke`;

  return aws.fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

function buildRequestBody(
  messages: { role: string; content: unknown }[],
  options: {
    maxTokens?: number;
    stream?: boolean;
    system?: string;
    tools?: boolean;
  }
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: options.maxTokens ?? 4096,
  };
  if (options.stream) body.stream = true;

  // System prompt with cache control — cached after first request
  if (options.system) {
    body.system = [
      {
        type: "text",
        text: options.system,
        cache_control: { type: "ephemeral" },
      },
    ];
  }

  // Tools with cache control
  if (options.tools) {
    const toolsWithCache = TOOLS.map((tool, i) =>
      i === TOOLS.length - 1
        ? { ...tool, cache_control: { type: "ephemeral" } }
        : tool
    );
    body.tools = toolsWithCache;
  }

  // Messages — add cache breakpoint on the second-to-last user turn
  // so the conversation history up to that point is cached
  const msgs = messages.map((msg, i) => {
    // Find the second-to-last user message for cache breakpoint
    const isSecondToLastUser =
      msg.role === "user" &&
      i < messages.length - 1 &&
      messages.slice(i + 1).filter((m) => m.role === "user").length === 1;

    if (isSecondToLastUser && typeof msg.content === "string") {
      return {
        role: msg.role,
        content: [
          {
            type: "text",
            text: msg.content,
            cache_control: { type: "ephemeral" },
          },
        ],
      };
    }
    return msg;
  });
  body.messages = msgs;

  return body;
}

async function providerFetch(
  body: Record<string, unknown>,
  streaming: boolean
): Promise<Response> {
  const config = await getProviderConfig();
  if (!config) throw new Error("No API credentials configured");

  if (config.provider === "anthropic") {
    const { anthropic_version: _, ...rest } = body;
    const anthropicBody = { ...rest, model: ANTHROPIC_MODEL };
    return anthropicFetch(config.apiKey!, JSON.stringify(anthropicBody), streaming);
  }

  const model = await getSelectedModel();
  return bedrockFetch(config, JSON.stringify(body), streaming, model.id);
}

// --- SSE stream parsing (same format for both providers) ---

function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (text: string) => void
): Promise<ToolUseRequest[]> {
  return new Promise(async (resolve) => {
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

          if (
            event.type === "content_block_start" &&
            event.content_block?.type === "tool_use"
          ) {
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

    resolve(toolUseRequests);
  });
}

// --- Public API ---

export async function streamChat(
  _apiKey: string, // kept for backward compat, ignored — reads from storage
  messages: { role: string; content: unknown }[],
  onChunk: (text: string) => void,
  onError: (error: string) => void,
  signal?: AbortSignal,
  system?: string
): Promise<StreamResult> {
  try {
    const body = buildRequestBody(messages, {
      stream: true,
      system,
      tools: true,
    });

    const response = await providerFetch(body, true);

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(
        err?.error?.message || err?.message || `API error: ${response.status}`
      );
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response stream");

    const toolUseRequests = await parseSSEStream(reader, onChunk);

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

/**
 * Non-streaming call. Used by dreaming and heartbeat.
 */
export async function invokeChat(
  messages: { role: string; content: unknown }[],
  options?: { system?: string; maxTokens?: number }
): Promise<string | null> {
  try {
    const body = buildRequestBody(messages, {
      maxTokens: options?.maxTokens ?? 4096,
      system: options?.system,
    });

    const response = await providerFetch(body, false);
    if (!response.ok) return null;

    const data = await response.json();
    return data.content?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

export async function validateAnthropicKey(apiKey: string): Promise<boolean> {
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
        model: ANTHROPIC_MODEL,
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function validateBedrockCredentials(
  accessKey: string,
  secretKey: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const aws = new AwsClient({
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
      region: BEDROCK_REGION,
      service: "bedrock",
    });

    // Validate with Nova Micro — always available, no use case form needed
    const body = JSON.stringify({
      messages: [{ role: "user", content: [{ text: "hi" }] }],
      inferenceConfig: { maxTokens: 1 },
    });

    const response = await aws.fetch(
      `https://bedrock-runtime.${BEDROCK_REGION}.amazonaws.com/model/us.amazon.nova-micro-v1%3A0/invoke`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      }
    );

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      return { ok: false, error: `HTTP ${response.status}: ${errBody.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message || String(e) };
  }
}
