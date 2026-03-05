/**
 * Tests for Stress Test Report Fixes
 *
 * BUG-002: Per-request rate limiter with proper headers
 * FINDING-001: Supported models documentation and /models endpoint
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createRateLimiter, getClientIp } from "./rate-limiter";
import { detectProviderFromModel, getSupportedModels } from "./provider-router";

// ─── BUG-002: Rate Limiter Tests ───────────────────────────────────

describe("BUG-002: Per-request rate limiter", () => {
  let limiter: ReturnType<typeof createRateLimiter>;

  beforeEach(() => {
    limiter = createRateLimiter("test-bug002", { maxRequests: 5, windowMs: 60000 });
    limiter.reset();
  });

  it("should allow requests within the limit", () => {
    const result = limiter.check("192.168.1.1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.limit).toBe(5);
    expect(result.retryAfterMs).toBe(0);
  });

  it("should track remaining requests accurately", () => {
    for (let i = 0; i < 4; i++) {
      limiter.check("192.168.1.1");
    }
    const result = limiter.check("192.168.1.1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("should block requests exceeding the limit", () => {
    for (let i = 0; i < 5; i++) {
      limiter.check("192.168.1.1");
    }
    const result = limiter.check("192.168.1.1");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("should return retryAfterMs when rate limited", () => {
    for (let i = 0; i < 5; i++) {
      limiter.check("192.168.1.1");
    }
    const result = limiter.check("192.168.1.1");
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(60000);
  });

  it("should track different IPs independently", () => {
    for (let i = 0; i < 5; i++) {
      limiter.check("192.168.1.1");
    }
    const blockedResult = limiter.check("192.168.1.1");
    expect(blockedResult.allowed).toBe(false);

    const otherIpResult = limiter.check("192.168.1.2");
    expect(otherIpResult.allowed).toBe(true);
    expect(otherIpResult.remaining).toBe(4);
  });

  it("should provide correct limit value in all responses", () => {
    const allowed = limiter.check("10.0.0.1");
    expect(allowed.limit).toBe(5);

    for (let i = 0; i < 5; i++) {
      limiter.check("10.0.0.2");
    }
    const blocked = limiter.check("10.0.0.2");
    expect(blocked.limit).toBe(5);
  });
});

describe("BUG-002: getClientIp extraction", () => {
  it("should extract IP from X-Forwarded-For header", () => {
    const ip = getClientIp({
      ip: "127.0.0.1",
      headers: { "x-forwarded-for": "203.0.113.50, 70.41.3.18, 150.172.238.178" },
    });
    expect(ip).toBe("203.0.113.50");
  });

  it("should fall back to req.ip when no X-Forwarded-For", () => {
    const ip = getClientIp({
      ip: "10.0.0.1",
      headers: {},
    });
    expect(ip).toBe("10.0.0.1");
  });

  it("should return 'unknown' when no IP info available", () => {
    const ip = getClientIp({
      headers: {},
    });
    expect(ip).toBe("unknown");
  });
});

// ─── FINDING-001: Supported Models Tests ───────────────────────────

describe("FINDING-001: Provider detection from model names", () => {
  it("should detect OpenAI from gpt-* models", () => {
    expect(detectProviderFromModel("gpt-4o")).toBe("openai");
    expect(detectProviderFromModel("gpt-4o-mini")).toBe("openai");
    expect(detectProviderFromModel("gpt-4.1")).toBe("openai");
    expect(detectProviderFromModel("gpt-4.1-mini")).toBe("openai");
    expect(detectProviderFromModel("gpt-4.1-nano")).toBe("openai");
  });

  it("should detect Anthropic from claude-* models", () => {
    expect(detectProviderFromModel("claude-sonnet-4-20250514")).toBe("anthropic");
    expect(detectProviderFromModel("claude-3.5-sonnet")).toBe("anthropic");
    expect(detectProviderFromModel("claude-3-opus")).toBe("anthropic");
  });

  it("should detect Google from gemini-* models", () => {
    expect(detectProviderFromModel("gemini-2.5-flash")).toBe("google");
    expect(detectProviderFromModel("gemini-2.5-pro")).toBe("google");
    expect(detectProviderFromModel("gemini-1.5-pro")).toBe("google");
  });

  it("should detect OpenAI for embedding models", () => {
    expect(detectProviderFromModel("text-embedding-3-small")).toBe("openai");
    expect(detectProviderFromModel("text-embedding-3-large")).toBe("openai");
  });

  it("should detect OpenAI for o-series reasoning models", () => {
    expect(detectProviderFromModel("o1")).toBe("openai");
    expect(detectProviderFromModel("o1-preview")).toBe("openai");
    expect(detectProviderFromModel("o3")).toBe("openai");
    expect(detectProviderFromModel("o3-mini")).toBe("openai");
  });

  it("should detect OpenAI for deepseek models (OpenAI-compatible)", () => {
    expect(detectProviderFromModel("deepseek-chat")).toBe("openai");
    expect(detectProviderFromModel("deepseek-coder")).toBe("openai");
  });

  it("should detect OpenAI for mistral models (OpenAI-compatible)", () => {
    expect(detectProviderFromModel("mistral-large")).toBe("openai");
    expect(detectProviderFromModel("mixtral-8x7b")).toBe("openai");
  });

  it("should return null for unknown models", () => {
    expect(detectProviderFromModel("unknown-model")).toBeNull();
    expect(detectProviderFromModel("")).toBeNull();
  });
});

describe("FINDING-001: getSupportedModels endpoint data", () => {
  it("should return a non-empty array of model patterns", () => {
    const models = getSupportedModels();
    expect(models.length).toBeGreaterThan(0);
  });

  it("should include all major providers", () => {
    const models = getSupportedModels();
    const providers = new Set(models.map((m) => m.provider));
    expect(providers.has("openai")).toBe(true);
    expect(providers.has("anthropic")).toBe(true);
    expect(providers.has("google")).toBe(true);
  });

  it("should include gpt-4o-mini in OpenAI examples", () => {
    const models = getSupportedModels();
    const openaiModels = models.filter((m) => m.provider === "openai");
    const allExamples = openaiModels.flatMap((m) => m.examples);
    expect(allExamples).toContain("gpt-4o-mini");
  });

  it("should have pattern and examples for every entry", () => {
    const models = getSupportedModels();
    for (const model of models) {
      expect(model.pattern).toBeTruthy();
      expect(model.examples.length).toBeGreaterThan(0);
      expect(model.provider).toBeTruthy();
    }
  });
});
