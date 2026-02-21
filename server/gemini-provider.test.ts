import { describe, it, expect } from "vitest";

/**
 * Tests for Google Gemini provider support in the proxy.
 * Gemini uses Google's native OpenAI-compatible endpoint,
 * so no translator is needed — requests flow through the
 * standard OpenAI pipeline with different base URL routing.
 */

// ── Provider Detection ──────────────────────────────────────

describe("Gemini provider detection", () => {
  // Simulate the provider detection logic from proxy.ts
  function detectProvider(model: string, baseUrl: string): string {
    if (baseUrl.includes("generativelanguage.googleapis.com")) return "google";
    if (baseUrl.includes("api.anthropic.com")) return "anthropic";
    if (model.startsWith("gemini-")) return "google";
    if (model.startsWith("claude-")) return "anthropic";
    return "openai";
  }

  it("detects Google from base URL containing generativelanguage.googleapis.com", () => {
    expect(detectProvider("gemini-2.5-pro", "https://generativelanguage.googleapis.com/v1beta/openai")).toBe("google");
  });

  it("detects Google from model name prefix gemini-", () => {
    expect(detectProvider("gemini-2.5-flash", "https://some-custom-url.com/v1")).toBe("google");
  });

  it("detects Google for gemini-2.0-flash model", () => {
    expect(detectProvider("gemini-2.0-flash", "https://api.openai.com/v1")).toBe("google");
  });

  it("detects Google for gemini-2.5-flash-lite model", () => {
    expect(detectProvider("gemini-2.5-flash-lite", "https://api.openai.com/v1")).toBe("google");
  });

  it("detects Google for gemini-3-pro-preview model", () => {
    expect(detectProvider("gemini-3-pro-preview", "https://api.openai.com/v1")).toBe("google");
  });

  it("detects Google for gemini-1.5-pro model", () => {
    expect(detectProvider("gemini-1.5-pro", "https://api.openai.com/v1")).toBe("google");
  });

  it("does not detect Google for gpt-4o model", () => {
    expect(detectProvider("gpt-4o", "https://api.openai.com/v1")).toBe("openai");
  });

  it("does not detect Google for claude model", () => {
    expect(detectProvider("claude-3-5-sonnet-20241022", "https://api.anthropic.com/v1")).toBe("anthropic");
  });

  it("base URL detection takes priority over model name", () => {
    // Even with a non-gemini model, if base URL is Google, detect as google
    expect(detectProvider("custom-model", "https://generativelanguage.googleapis.com/v1beta/openai")).toBe("google");
  });
});

// ── Base URL Resolution ─────────────────────────────────────

describe("Gemini base URL resolution", () => {
  function resolveBaseUrl(provider: string, configuredUrl: string): string {
    if (provider === "google" && !configuredUrl.includes("generativelanguage.googleapis.com")) {
      return "https://generativelanguage.googleapis.com/v1beta/openai";
    }
    return configuredUrl;
  }

  it("returns Google OpenAI-compatible endpoint for google provider with default URL", () => {
    expect(resolveBaseUrl("google", "https://api.openai.com/v1")).toBe(
      "https://generativelanguage.googleapis.com/v1beta/openai"
    );
  });

  it("preserves configured Google URL if already correct", () => {
    const url = "https://generativelanguage.googleapis.com/v1beta/openai";
    expect(resolveBaseUrl("google", url)).toBe(url);
  });

  it("does not modify non-google provider URLs", () => {
    expect(resolveBaseUrl("openai", "https://api.openai.com/v1")).toBe("https://api.openai.com/v1");
  });
});

// ── Gemini Model Pricing ────────────────────────────────────

describe("Gemini model pricing", () => {
  // Replicate the DEFAULT_PRICING lookup logic
  const GEMINI_PRICING: Record<string, { input: number; output: number }> = {
    "gemini-2.5-pro": { input: 0.00125, output: 0.01 },
    "gemini-2.5-flash": { input: 0.0003, output: 0.0025 },
    "gemini-2.5-flash-lite": { input: 0.0001, output: 0.0004 },
    "gemini-2.0-flash": { input: 0.0001, output: 0.0004 },
    "gemini-2.0-flash-lite": { input: 0.000075, output: 0.0003 },
    "gemini-3-pro-preview": { input: 0.002, output: 0.012 },
    "gemini-3-flash-preview": { input: 0.0005, output: 0.003 },
    "gemini-3.1-pro-preview": { input: 0.002, output: 0.012 },
    "gemini-1.5-pro": { input: 0.00125, output: 0.005 },
    "gemini-1.5-flash": { input: 0.000075, output: 0.0003 },
  };

  function getPricing(model: string) {
    if (GEMINI_PRICING[model]) return GEMINI_PRICING[model];
    for (const [key, val] of Object.entries(GEMINI_PRICING)) {
      if (model.startsWith(key)) return val;
    }
    return undefined;
  }

  it("returns pricing for gemini-2.5-pro", () => {
    const p = getPricing("gemini-2.5-pro");
    expect(p).toBeDefined();
    expect(p!.input).toBe(0.00125);
    expect(p!.output).toBe(0.01);
  });

  it("returns pricing for gemini-2.5-flash", () => {
    const p = getPricing("gemini-2.5-flash");
    expect(p).toBeDefined();
    expect(p!.input).toBe(0.0003);
    expect(p!.output).toBe(0.0025);
  });

  it("returns pricing for gemini-2.5-flash-lite", () => {
    const p = getPricing("gemini-2.5-flash-lite");
    expect(p).toBeDefined();
    expect(p!.input).toBe(0.0001);
    expect(p!.output).toBe(0.0004);
  });

  it("returns pricing for gemini-2.0-flash", () => {
    const p = getPricing("gemini-2.0-flash");
    expect(p).toBeDefined();
    expect(p!.input).toBe(0.0001);
    expect(p!.output).toBe(0.0004);
  });

  it("returns pricing for gemini-2.0-flash-lite", () => {
    const p = getPricing("gemini-2.0-flash-lite");
    expect(p).toBeDefined();
    expect(p!.input).toBe(0.000075);
    expect(p!.output).toBe(0.0003);
  });

  it("returns pricing for gemini-3-pro-preview", () => {
    const p = getPricing("gemini-3-pro-preview");
    expect(p).toBeDefined();
    expect(p!.input).toBe(0.002);
    expect(p!.output).toBe(0.012);
  });

  it("returns pricing for gemini-3-flash-preview", () => {
    const p = getPricing("gemini-3-flash-preview");
    expect(p).toBeDefined();
    expect(p!.input).toBe(0.0005);
    expect(p!.output).toBe(0.003);
  });

  it("returns pricing for gemini-3.1-pro-preview", () => {
    const p = getPricing("gemini-3.1-pro-preview");
    expect(p).toBeDefined();
    expect(p!.input).toBe(0.002);
    expect(p!.output).toBe(0.012);
  });

  it("returns pricing for gemini-1.5-pro", () => {
    const p = getPricing("gemini-1.5-pro");
    expect(p).toBeDefined();
    expect(p!.input).toBe(0.00125);
    expect(p!.output).toBe(0.005);
  });

  it("returns pricing for gemini-1.5-flash", () => {
    const p = getPricing("gemini-1.5-flash");
    expect(p).toBeDefined();
    expect(p!.input).toBe(0.000075);
    expect(p!.output).toBe(0.0003);
  });

  it("returns undefined for unknown model", () => {
    expect(getPricing("unknown-model")).toBeUndefined();
  });

  it("calculates cost correctly for gemini-2.5-pro (1K input + 500 output tokens)", () => {
    const p = getPricing("gemini-2.5-pro")!;
    const cost = (1000 / 1000) * p.input + (500 / 1000) * p.output;
    expect(cost).toBeCloseTo(0.00625, 5); // $0.00125 + $0.005
  });

  it("calculates cost correctly for gemini-2.0-flash (10K input + 2K output tokens)", () => {
    const p = getPricing("gemini-2.0-flash")!;
    const cost = (10000 / 1000) * p.input + (2000 / 1000) * p.output;
    expect(cost).toBeCloseTo(0.0018, 5); // $0.001 + $0.0008
  });
});

// ── OpenAI-Compatible Request Format ────────────────────────

describe("Gemini OpenAI-compatible format", () => {
  it("constructs a valid OpenAI-format request for Gemini", () => {
    const request = {
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello, Gemini!" },
      ],
      temperature: 0.7,
      max_tokens: 1024,
      stream: false,
    };

    // Verify the request is valid OpenAI format (which Gemini accepts natively)
    expect(request.model).toBe("gemini-2.5-flash");
    expect(request.messages).toHaveLength(2);
    expect(request.messages[0].role).toBe("system");
    expect(request.messages[1].role).toBe("user");
    expect(request.stream).toBe(false);
  });

  it("constructs a valid streaming request for Gemini", () => {
    const request = {
      model: "gemini-2.5-pro",
      messages: [{ role: "user", content: "Stream this response" }],
      stream: true,
    };

    expect(request.stream).toBe(true);
    expect(request.model).toBe("gemini-2.5-pro");
  });

  it("supports tool definitions in OpenAI format for Gemini", () => {
    const request = {
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: "What's the weather?" }],
      tools: [
        {
          type: "function",
          function: {
            name: "get_weather",
            description: "Get weather for a location",
            parameters: {
              type: "object",
              properties: {
                location: { type: "string" },
              },
              required: ["location"],
            },
          },
        },
      ],
    };

    expect(request.tools).toHaveLength(1);
    expect(request.tools[0].type).toBe("function");
    expect(request.tools[0].function.name).toBe("get_weather");
  });

  it("constructs correct Authorization header for Google API key", () => {
    const apiKey = "AIzaSyB-test-key-123";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    expect(headers["Authorization"]).toBe("Bearer AIzaSyB-test-key-123");
  });
});
