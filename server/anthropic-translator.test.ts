/**
 * Tests for Anthropic Translation Layer
 * Covers: request translation, response translation, streaming, headers, edge cases
 */
import { describe, it, expect } from "vitest";
import {
  translateRequestToAnthropic,
  translateResponseToOpenAI,
  createStreamState,
  translateStreamEvent,
  getAnthropicHeaders,
  getAnthropicBaseUrl,
} from "./anthropic-translator";

// ─── Request Translation ───
describe("translateRequestToAnthropic", () => {
  it("extracts system messages into the system parameter", () => {
    const result = translateRequestToAnthropic({
      model: "claude-3-5-sonnet-20241022",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello" },
      ],
    });
    expect(result.system).toBe("You are a helpful assistant.");
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe("user");
    expect(result.messages[0].content).toBe("Hello");
  });

  it("concatenates multiple system messages", () => {
    const result = translateRequestToAnthropic({
      model: "claude-3-5-sonnet-20241022",
      messages: [
        { role: "system", content: "Rule 1" },
        { role: "system", content: "Rule 2" },
        { role: "user", content: "Hi" },
      ],
    });
    expect(result.system).toBe("Rule 1\n\nRule 2");
  });

  it("sets max_tokens to 4096 when not provided", () => {
    const result = translateRequestToAnthropic({
      model: "claude-3-5-sonnet-20241022",
      messages: [{ role: "user", content: "Hello" }],
    });
    expect(result.max_tokens).toBe(4096);
  });

  it("preserves max_tokens when provided", () => {
    const result = translateRequestToAnthropic({
      model: "claude-3-5-sonnet-20241022",
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 1024,
    });
    expect(result.max_tokens).toBe(1024);
  });

  it("passes through temperature and top_p", () => {
    const result = translateRequestToAnthropic({
      model: "claude-3-5-sonnet-20241022",
      messages: [{ role: "user", content: "Hello" }],
      temperature: 0.7,
      top_p: 0.9,
    });
    expect(result.temperature).toBe(0.7);
    expect(result.top_p).toBe(0.9);
  });

  it("converts stop string to stop_sequences array", () => {
    const result = translateRequestToAnthropic({
      model: "claude-3-5-sonnet-20241022",
      messages: [{ role: "user", content: "Hello" }],
      stop: "END",
    });
    expect(result.stop_sequences).toEqual(["END"]);
  });

  it("converts stop array to stop_sequences", () => {
    const result = translateRequestToAnthropic({
      model: "claude-3-5-sonnet-20241022",
      messages: [{ role: "user", content: "Hello" }],
      stop: ["END", "STOP"],
    });
    expect(result.stop_sequences).toEqual(["END", "STOP"]);
  });

  it("translates OpenAI tools to Anthropic tool format", () => {
    const result = translateRequestToAnthropic({
      model: "claude-3-5-sonnet-20241022",
      messages: [{ role: "user", content: "What's the weather?" }],
      tools: [
        {
          type: "function",
          function: {
            name: "get_weather",
            description: "Get the weather for a location",
            parameters: {
              type: "object",
              properties: { location: { type: "string" } },
              required: ["location"],
            },
          },
        },
      ],
    });
    expect(result.tools).toHaveLength(1);
    expect(result.tools![0].name).toBe("get_weather");
    expect(result.tools![0].description).toBe("Get the weather for a location");
    expect(result.tools![0].input_schema).toHaveProperty("properties");
  });

  it("translates tool_choice 'auto' to { type: 'auto' }", () => {
    const result = translateRequestToAnthropic({
      model: "claude-3-5-sonnet-20241022",
      messages: [{ role: "user", content: "Hello" }],
      tools: [{ type: "function", function: { name: "test", parameters: {} } }],
      tool_choice: "auto",
    });
    expect(result.tool_choice).toEqual({ type: "auto" });
  });

  it("translates tool_choice 'required' to { type: 'any' }", () => {
    const result = translateRequestToAnthropic({
      model: "claude-3-5-sonnet-20241022",
      messages: [{ role: "user", content: "Hello" }],
      tools: [{ type: "function", function: { name: "test", parameters: {} } }],
      tool_choice: "required",
    });
    expect(result.tool_choice).toEqual({ type: "any" });
  });

  it("translates tool_choice 'none' by removing tools", () => {
    const result = translateRequestToAnthropic({
      model: "claude-3-5-sonnet-20241022",
      messages: [{ role: "user", content: "Hello" }],
      tools: [{ type: "function", function: { name: "test", parameters: {} } }],
      tool_choice: "none",
    });
    expect(result.tools).toBeUndefined();
  });

  it("translates specific tool_choice to { type: 'tool', name }", () => {
    const result = translateRequestToAnthropic({
      model: "claude-3-5-sonnet-20241022",
      messages: [{ role: "user", content: "Hello" }],
      tools: [{ type: "function", function: { name: "get_weather", parameters: {} } }],
      tool_choice: { type: "function", function: { name: "get_weather" } },
    });
    expect(result.tool_choice).toEqual({ type: "tool", name: "get_weather" });
  });

  it("translates assistant messages with tool_calls", () => {
    const result = translateRequestToAnthropic({
      model: "claude-3-5-sonnet-20241022",
      messages: [
        { role: "user", content: "What's the weather?" },
        {
          role: "assistant",
          content: "",
          tool_calls: [
            {
              id: "call_123",
              type: "function",
              function: { name: "get_weather", arguments: '{"location":"NYC"}' },
            },
          ],
        },
        {
          role: "tool",
          content: '{"temp": 72}',
          tool_call_id: "call_123",
        },
      ],
    });
    // Assistant message should have tool_use content blocks
    const assistantMsg = result.messages.find((m) => m.role === "assistant");
    expect(assistantMsg).toBeDefined();
    expect(Array.isArray(assistantMsg!.content)).toBe(true);
    const blocks = assistantMsg!.content as any[];
    expect(blocks.some((b: any) => b.type === "tool_use")).toBe(true);

    // Tool result should be a user message with tool_result content block
    const toolResultMsg = result.messages.filter((m) => m.role === "user");
    expect(toolResultMsg.length).toBeGreaterThanOrEqual(1);
  });

  it("merges consecutive same-role messages", () => {
    const result = translateRequestToAnthropic({
      model: "claude-3-5-sonnet-20241022",
      messages: [
        { role: "user", content: "Hello" },
        { role: "user", content: "How are you?" },
      ],
    });
    // Anthropic requires alternating roles, so consecutive user messages should be merged
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe("user");
  });

  it("passes stream flag through", () => {
    const result = translateRequestToAnthropic({
      model: "claude-3-5-sonnet-20241022",
      messages: [{ role: "user", content: "Hello" }],
      stream: true,
    });
    expect(result.stream).toBe(true);
  });

  it("passes model name through unchanged", () => {
    const result = translateRequestToAnthropic({
      model: "claude-3-opus-20240229",
      messages: [{ role: "user", content: "Hello" }],
    });
    expect(result.model).toBe("claude-3-opus-20240229");
  });
});

// ─── Response Translation ───
describe("translateResponseToOpenAI", () => {
  it("translates a basic text response to OpenAI format", () => {
    const result = translateResponseToOpenAI(
      {
        id: "msg_abc123",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "Hello! How can I help?" }],
        model: "claude-3-5-sonnet-20241022",
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 8 },
      },
      "claude-3-5-sonnet-20241022"
    );

    expect(result.object).toBe("chat.completion");
    expect(result.id).toBe("chatcmpl-msg_abc123");
    expect(result.choices).toHaveLength(1);
    expect(result.choices[0].message.role).toBe("assistant");
    expect(result.choices[0].message.content).toBe("Hello! How can I help?");
    expect(result.choices[0].finish_reason).toBe("stop");
    expect(result.usage.prompt_tokens).toBe(10);
    expect(result.usage.completion_tokens).toBe(8);
    expect(result.usage.total_tokens).toBe(18);
  });

  it("translates tool_use content blocks to tool_calls", () => {
    const result = translateResponseToOpenAI(
      {
        id: "msg_tool123",
        type: "message",
        role: "assistant",
        content: [
          { type: "tool_use", id: "toolu_123", name: "get_weather", input: { location: "NYC" } },
        ],
        model: "claude-3-5-sonnet-20241022",
        stop_reason: "tool_use",
        stop_sequence: null,
        usage: { input_tokens: 20, output_tokens: 15 },
      },
      "claude-3-5-sonnet-20241022"
    );

    expect(result.choices[0].finish_reason).toBe("tool_calls");
    expect(result.choices[0].message.tool_calls).toHaveLength(1);
    expect(result.choices[0].message.tool_calls[0].id).toBe("toolu_123");
    expect(result.choices[0].message.tool_calls[0].function.name).toBe("get_weather");
    expect(JSON.parse(result.choices[0].message.tool_calls[0].function.arguments)).toEqual({ location: "NYC" });
  });

  it("maps stop_reason 'max_tokens' to finish_reason 'length'", () => {
    const result = translateResponseToOpenAI(
      {
        id: "msg_max",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "Truncated..." }],
        model: "claude-3-5-sonnet-20241022",
        stop_reason: "max_tokens",
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 4096 },
      },
      "claude-3-5-sonnet-20241022"
    );
    expect(result.choices[0].finish_reason).toBe("length");
  });

  it("maps stop_reason 'stop_sequence' to finish_reason 'stop'", () => {
    const result = translateResponseToOpenAI(
      {
        id: "msg_seq",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "Done" }],
        model: "claude-3-5-sonnet-20241022",
        stop_reason: "stop_sequence",
        stop_sequence: "END",
        usage: { input_tokens: 5, output_tokens: 1 },
      },
      "claude-3-5-sonnet-20241022"
    );
    expect(result.choices[0].finish_reason).toBe("stop");
  });
});

// ─── Streaming Translation ───
describe("Streaming Translation", () => {
  it("createStreamState initializes with correct defaults", () => {
    const state = createStreamState("claude-3-5-sonnet-20241022");
    expect(state.model).toBe("claude-3-5-sonnet-20241022");
    expect(state.messageId).toBe("");
    expect(state.promptTokens).toBe(0);
    expect(state.completionTokens).toBe(0);
    expect(state.currentBlockIndex).toBe(0);
    expect(state.toolCallIndex).toBe(-1);
  });

  it("translates message_start event to initial chunk with role", () => {
    const state = createStreamState("claude-3-5-sonnet-20241022");
    const result = translateStreamEvent(
      {
        type: "message_start",
        message: { id: "msg_stream1", usage: { input_tokens: 15 } },
      },
      state
    );
    expect(result).toContain('"role":"assistant"');
    expect(result).toContain("chat.completion.chunk");
    expect(state.messageId).toBe("msg_stream1");
    expect(state.promptTokens).toBe(15);
  });

  it("translates content_block_delta text_delta to content chunk", () => {
    const state = createStreamState("claude-3-5-sonnet-20241022");
    state.messageId = "msg_test";
    state.currentBlockType = "text";
    const result = translateStreamEvent(
      {
        type: "content_block_delta",
        delta: { type: "text_delta", text: "Hello" },
      },
      state
    );
    expect(result).toContain('"content":"Hello"');
  });

  it("translates content_block_start for tool_use", () => {
    const state = createStreamState("claude-3-5-sonnet-20241022");
    state.messageId = "msg_test";
    const result = translateStreamEvent(
      {
        type: "content_block_start",
        index: 0,
        content_block: { type: "tool_use", id: "toolu_1", name: "get_weather" },
      },
      state
    );
    expect(result).toContain("tool_calls");
    expect(result).toContain("get_weather");
    expect(state.toolCallIndex).toBe(0);
  });

  it("translates input_json_delta for tool arguments", () => {
    const state = createStreamState("claude-3-5-sonnet-20241022");
    state.messageId = "msg_test";
    state.toolCallIndex = 0;
    const result = translateStreamEvent(
      {
        type: "content_block_delta",
        delta: { type: "input_json_delta", partial_json: '{"loc' },
      },
      state
    );
    expect(result).toContain("tool_calls");
    expect(result).toContain('"loc');
  });

  it("translates message_delta to finish chunk with usage", () => {
    const state = createStreamState("claude-3-5-sonnet-20241022");
    state.messageId = "msg_test";
    state.promptTokens = 10;
    const result = translateStreamEvent(
      {
        type: "message_delta",
        delta: { stop_reason: "end_turn" },
        usage: { output_tokens: 25 },
      },
      state
    );
    expect(result).toContain('"finish_reason":"stop"');
    expect(result).toContain('"prompt_tokens":10');
    expect(result).toContain('"completion_tokens":25');
    expect(state.completionTokens).toBe(25);
  });

  it("translates message_stop to [DONE]", () => {
    const state = createStreamState("claude-3-5-sonnet-20241022");
    const result = translateStreamEvent({ type: "message_stop" }, state);
    expect(result).toBe("data: [DONE]\n\n");
  });

  it("returns null for content_block_stop", () => {
    const state = createStreamState("claude-3-5-sonnet-20241022");
    const result = translateStreamEvent({ type: "content_block_stop" }, state);
    expect(result).toBeNull();
  });

  it("returns null for unknown event types", () => {
    const state = createStreamState("claude-3-5-sonnet-20241022");
    const result = translateStreamEvent({ type: "ping" }, state);
    expect(result).toBeNull();
  });
});

// ─── Headers & Base URL ───
describe("getAnthropicHeaders", () => {
  it("returns correct headers with x-api-key", () => {
    const headers = getAnthropicHeaders("sk-ant-test123");
    expect(headers["x-api-key"]).toBe("sk-ant-test123");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
  });
});

describe("getAnthropicBaseUrl", () => {
  it("returns default Anthropic URL when no config provided", () => {
    expect(getAnthropicBaseUrl()).toBe("https://api.anthropic.com/v1");
    expect(getAnthropicBaseUrl(undefined)).toBe("https://api.anthropic.com/v1");
  });

  it("returns custom URL when provided", () => {
    expect(getAnthropicBaseUrl("https://my-proxy.com/v1")).toBe("https://my-proxy.com/v1");
  });
});
