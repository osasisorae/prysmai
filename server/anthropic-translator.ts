/**
 * Anthropic Translation Layer
 *
 * Translates between OpenAI Chat Completions format and Anthropic Messages API format.
 * This allows users to use the standard OpenAI SDK format while routing to Anthropic models.
 *
 * Key differences handled:
 * 1. System messages → separate "system" parameter (not in messages array)
 * 2. Auth header: x-api-key instead of Authorization: Bearer
 * 3. Request body: max_tokens required, model mapping, tool format differences
 * 4. Response: content blocks → choices format, usage field mapping
 * 5. Streaming: message_start/content_block_delta/message_delta → OpenAI SSE chunks
 */

// ─── Types ───

interface OpenAIMessage {
  role: string;
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  name?: string;
  tool_calls?: Array<{
    id: string;
    type: string;
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

interface OpenAIChatRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  tools?: OpenAITool[];
  tool_choice?: string | { type: string; function?: { name: string } };
  stop?: string | string[];
  logprobs?: boolean;
  top_logprobs?: number;
}

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | Array<AnthropicContentBlock>;
}

interface AnthropicContentBlock {
  type: "text" | "image" | "tool_use" | "tool_result";
  text?: string;
  source?: { type: string; media_type: string; data: string };
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string | Array<{ type: string; text?: string }>;
}

interface AnthropicTool {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
}

interface AnthropicRequest {
  model: string;
  messages: AnthropicMessage[];
  system?: string | Array<{ type: string; text: string }>;
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  tools?: AnthropicTool[];
  tool_choice?: { type: string; name?: string };
  stop_sequences?: string[];
}

// ─── Model Mapping ───

const OPENAI_TO_ANTHROPIC_MODEL: Record<string, string> = {
  // Users might pass Anthropic model names directly — pass through
  // Or they might use aliases
};

function resolveAnthropicModel(model: string): string {
  return OPENAI_TO_ANTHROPIC_MODEL[model] || model;
}

// ─── Request Translation: OpenAI → Anthropic ───

export function translateRequestToAnthropic(openaiReq: OpenAIChatRequest): AnthropicRequest {
  const messages = openaiReq.messages || [];

  // 1. Extract system messages → Anthropic "system" parameter
  const systemMessages: string[] = [];
  const nonSystemMessages: OpenAIMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      const content = typeof msg.content === "string"
        ? msg.content
        : (msg.content as Array<{ type: string; text?: string }>)
            .filter((c) => c.type === "text")
            .map((c) => c.text)
            .join("\n");
      systemMessages.push(content);
    } else {
      nonSystemMessages.push(msg);
    }
  }

  // 2. Translate messages
  const anthropicMessages: AnthropicMessage[] = [];

  for (const msg of nonSystemMessages) {
    if (msg.role === "user") {
      anthropicMessages.push({
        role: "user",
        content: translateUserContent(msg),
      });
    } else if (msg.role === "assistant") {
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        // Assistant message with tool calls → content blocks with tool_use
        const contentBlocks: AnthropicContentBlock[] = [];
        // Add text content if present
        if (msg.content && typeof msg.content === "string" && msg.content.trim()) {
          contentBlocks.push({ type: "text", text: msg.content });
        }
        // Add tool_use blocks
        for (const tc of msg.tool_calls) {
          contentBlocks.push({
            type: "tool_use",
            id: tc.id,
            name: tc.function.name,
            input: safeParseJSON(tc.function.arguments),
          });
        }
        anthropicMessages.push({ role: "assistant", content: contentBlocks });
      } else {
        const content = typeof msg.content === "string" ? msg.content : "";
        anthropicMessages.push({ role: "assistant", content });
      }
    } else if (msg.role === "tool") {
      // Tool result message → user message with tool_result content block
      anthropicMessages.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: msg.tool_call_id,
            content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
          },
        ],
      });
    }
  }

  // 3. Merge consecutive same-role messages (Anthropic requires alternating roles)
  const mergedMessages = mergeConsecutiveMessages(anthropicMessages);

  // 4. Build Anthropic request
  const anthropicReq: AnthropicRequest = {
    model: resolveAnthropicModel(openaiReq.model),
    messages: mergedMessages,
    max_tokens: openaiReq.max_tokens ?? 4096, // Anthropic requires max_tokens
    stream: openaiReq.stream,
  };

  // System message
  if (systemMessages.length > 0) {
    anthropicReq.system = systemMessages.join("\n\n");
  }

  // Optional parameters
  if (openaiReq.temperature !== undefined) {
    anthropicReq.temperature = openaiReq.temperature;
  }
  if (openaiReq.top_p !== undefined) {
    anthropicReq.top_p = openaiReq.top_p;
  }

  // Stop sequences
  if (openaiReq.stop) {
    anthropicReq.stop_sequences = Array.isArray(openaiReq.stop)
      ? openaiReq.stop
      : [openaiReq.stop];
  }

  // 5. Translate tools
  if (openaiReq.tools && openaiReq.tools.length > 0) {
    anthropicReq.tools = openaiReq.tools.map((tool) => ({
      name: tool.function.name,
      description: tool.function.description || "",
      input_schema: tool.function.parameters || { type: "object", properties: {} },
    }));
  }

  // 6. Translate tool_choice
  if (openaiReq.tool_choice) {
    if (openaiReq.tool_choice === "auto") {
      anthropicReq.tool_choice = { type: "auto" };
    } else if (openaiReq.tool_choice === "none") {
      // Anthropic doesn't have "none" — just omit tools
      delete anthropicReq.tools;
    } else if (openaiReq.tool_choice === "required") {
      anthropicReq.tool_choice = { type: "any" };
    } else if (typeof openaiReq.tool_choice === "object" && openaiReq.tool_choice.function?.name) {
      anthropicReq.tool_choice = {
        type: "tool",
        name: openaiReq.tool_choice.function.name,
      };
    }
  }

  return anthropicReq;
}

function translateUserContent(msg: OpenAIMessage): string | AnthropicContentBlock[] {
  if (typeof msg.content === "string") {
    return msg.content;
  }

  // Multi-modal content (text + images)
  if (Array.isArray(msg.content)) {
    const blocks: AnthropicContentBlock[] = [];
    for (const part of msg.content) {
      if (part.type === "text" && part.text) {
        blocks.push({ type: "text", text: part.text });
      } else if (part.type === "image_url" && part.image_url?.url) {
        const url = part.image_url.url;
        if (url.startsWith("data:")) {
          // Base64 image
          const match = url.match(/^data:(image\/\w+);base64,(.+)$/);
          if (match) {
            blocks.push({
              type: "image",
              source: {
                type: "base64",
                media_type: match[1],
                data: match[2],
              },
            });
          }
        } else {
          // URL image — Anthropic requires base64, so we note this limitation
          // For now, pass as text description
          blocks.push({ type: "text", text: `[Image: ${url}]` });
        }
      }
    }
    return blocks.length === 1 && blocks[0].type === "text" ? (blocks[0].text as string) : blocks;
  }

  return "";
}

function mergeConsecutiveMessages(messages: AnthropicMessage[]): AnthropicMessage[] {
  if (messages.length === 0) return [];

  const merged: AnthropicMessage[] = [messages[0]];

  for (let i = 1; i < messages.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = messages[i];

    if (prev.role === curr.role) {
      // Merge content
      const prevContent = Array.isArray(prev.content)
        ? prev.content
        : [{ type: "text" as const, text: prev.content }];
      const currContent = Array.isArray(curr.content)
        ? curr.content
        : [{ type: "text" as const, text: curr.content }];
      prev.content = [...prevContent, ...currContent];
    } else {
      merged.push(curr);
    }
  }

  return merged;
}

function safeParseJSON(str: string): Record<string, unknown> {
  try {
    return JSON.parse(str);
  } catch {
    return { raw: str };
  }
}

// ─── Response Translation: Anthropic → OpenAI ───

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
  }>;
  model: string;
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export function translateResponseToOpenAI(
  anthropicResp: AnthropicResponse,
  requestModel: string,
): any {
  // Extract text content
  const textParts = anthropicResp.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("");

  // Extract tool calls
  const toolUseBlocks = anthropicResp.content.filter((c) => c.type === "tool_use");
  const toolCalls = toolUseBlocks.length > 0
    ? toolUseBlocks.map((tc, i) => ({
        id: tc.id || `call_${i}`,
        type: "function" as const,
        function: {
          name: tc.name || "",
          arguments: JSON.stringify(tc.input || {}),
        },
      }))
    : undefined;

  // Map stop_reason to finish_reason
  const finishReason = mapStopReason(anthropicResp.stop_reason);

  return {
    id: `chatcmpl-${anthropicResp.id}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: requestModel,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: textParts || null,
          ...(toolCalls ? { tool_calls: toolCalls } : {}),
        },
        finish_reason: finishReason,
        logprobs: null,
      },
    ],
    usage: {
      prompt_tokens: anthropicResp.usage?.input_tokens ?? 0,
      completion_tokens: anthropicResp.usage?.output_tokens ?? 0,
      total_tokens:
        (anthropicResp.usage?.input_tokens ?? 0) +
        (anthropicResp.usage?.output_tokens ?? 0),
    },
  };
}

function mapStopReason(stopReason: string | null): string {
  switch (stopReason) {
    case "end_turn":
      return "stop";
    case "max_tokens":
      return "length";
    case "tool_use":
      return "tool_calls";
    case "stop_sequence":
      return "stop";
    default:
      return "stop";
  }
}

// ─── Streaming Translation: Anthropic SSE → OpenAI SSE ───

/**
 * Translates a single Anthropic SSE event to OpenAI SSE format.
 * Returns the OpenAI-formatted SSE string(s) to send to the client, or null to skip.
 *
 * Anthropic events:
 *   message_start → initial chunk with role
 *   content_block_start → start of text/tool_use block
 *   content_block_delta → incremental text or tool input
 *   content_block_stop → end of block
 *   message_delta → final stop_reason + usage
 *   message_stop → stream end
 *
 * OpenAI format:
 *   data: {"id":"...","object":"chat.completion.chunk","choices":[{"delta":{"content":"..."},"index":0}]}
 */

export interface StreamState {
  messageId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  currentBlockIndex: number;
  currentBlockType: string;
  toolCallIndex: number;
  finishReason: string;
}

export function createStreamState(model: string): StreamState {
  return {
    messageId: "",
    model,
    promptTokens: 0,
    completionTokens: 0,
    currentBlockIndex: 0,
    currentBlockType: "",
    toolCallIndex: -1,
    finishReason: "",
  };
}

export function translateStreamEvent(
  event: { type: string; [key: string]: any },
  state: StreamState,
): string | null {
  const makeChunk = (delta: Record<string, any>, finishReason: string | null = null) => {
    const chunk: any = {
      id: `chatcmpl-${state.messageId}`,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model: state.model,
      choices: [
        {
          index: 0,
          delta,
          finish_reason: finishReason,
          logprobs: null,
        },
      ],
    };
    return `data: ${JSON.stringify(chunk)}\n\n`;
  };

  switch (event.type) {
    case "message_start": {
      state.messageId = event.message?.id || `msg_${Date.now()}`;
      state.promptTokens = event.message?.usage?.input_tokens ?? 0;
      // Send initial chunk with role
      return makeChunk({ role: "assistant", content: "" });
    }

    case "content_block_start": {
      state.currentBlockIndex = event.index ?? 0;
      const block = event.content_block;
      if (block?.type === "tool_use") {
        state.currentBlockType = "tool_use";
        state.toolCallIndex++;
        // Send tool call start
        return makeChunk({
          tool_calls: [
            {
              index: state.toolCallIndex,
              id: block.id,
              type: "function",
              function: { name: block.name, arguments: "" },
            },
          ],
        });
      }
      state.currentBlockType = "text";
      return null; // No OpenAI equivalent for text block start
    }

    case "content_block_delta": {
      const delta = event.delta;
      if (delta?.type === "text_delta" && delta.text) {
        return makeChunk({ content: delta.text });
      }
      if (delta?.type === "input_json_delta" && delta.partial_json) {
        return makeChunk({
          tool_calls: [
            {
              index: state.toolCallIndex,
              function: { arguments: delta.partial_json },
            },
          ],
        });
      }
      return null;
    }

    case "content_block_stop": {
      return null; // No OpenAI equivalent
    }

    case "message_delta": {
      // Contains stop_reason and output usage
      state.finishReason = mapStopReason(event.delta?.stop_reason);
      state.completionTokens = event.usage?.output_tokens ?? 0;

      // Send finish chunk
      const finishChunk = makeChunk({}, state.finishReason);

      // Send usage chunk (like OpenAI's stream_options.include_usage)
      const usageChunk: any = {
        id: `chatcmpl-${state.messageId}`,
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model: state.model,
        choices: [],
        usage: {
          prompt_tokens: state.promptTokens,
          completion_tokens: state.completionTokens,
          total_tokens: state.promptTokens + state.completionTokens,
        },
      };

      return finishChunk + `data: ${JSON.stringify(usageChunk)}\n\n`;
    }

    case "message_stop": {
      return "data: [DONE]\n\n";
    }

    default:
      return null;
  }
}

// ─── Anthropic API Headers ───

export function getAnthropicHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };
}

// ─── Anthropic Base URL ───

export function getAnthropicBaseUrl(configBaseUrl?: string): string {
  return configBaseUrl || "https://api.anthropic.com/v1";
}
