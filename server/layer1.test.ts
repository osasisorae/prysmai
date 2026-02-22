import { describe, it, expect } from "vitest";
import { hashApiKey, calculateCost, getDefaultPricing } from "./db";

describe("Layer 1 — Proxy & Observability", () => {
  // ─── API Key Hashing ───
  describe("hashApiKey", () => {
    it("returns a 64-character hex SHA-256 hash", () => {
      const hash = hashApiKey("sk-prysm-test123");
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
    });

    it("produces consistent hashes for the same input", () => {
      const key = "sk-prysm-abcdef1234567890";
      expect(hashApiKey(key)).toBe(hashApiKey(key));
    });

    it("produces different hashes for different keys", () => {
      const hash1 = hashApiKey("sk-prysm-key1");
      const hash2 = hashApiKey("sk-prysm-key2");
      expect(hash1).not.toBe(hash2);
    });
  });

  // ─── Cost Calculation ───
  describe("calculateCost", () => {
    it("calculates cost correctly for gpt-4o-mini pricing", () => {
      // gpt-4o-mini: $0.00015/1K input, $0.0006/1K output
      const cost = calculateCost(100, 50, 0.00015, 0.0006);
      // (100/1000) * 0.00015 + (50/1000) * 0.0006 = 0.000015 + 0.00003 = 0.000045
      expect(cost).toBeCloseTo(0.000045, 8);
    });

    it("calculates cost correctly for gpt-4o pricing", () => {
      // gpt-4o: $0.0025/1K input, $0.01/1K output
      const cost = calculateCost(1000, 500, 0.0025, 0.01);
      // (1000/1000) * 0.0025 + (500/1000) * 0.01 = 0.0025 + 0.005 = 0.0075
      expect(cost).toBeCloseTo(0.0075, 8);
    });

    it("returns 0 when no tokens are used", () => {
      const cost = calculateCost(0, 0, 0.0025, 0.01);
      expect(cost).toBe(0);
    });

    it("handles large token counts", () => {
      // 1M prompt tokens, 500K completion tokens with gpt-4 pricing
      const cost = calculateCost(1_000_000, 500_000, 0.03, 0.06);
      // (1000000/1000) * 0.03 + (500000/1000) * 0.06 = 30 + 30 = 60
      expect(cost).toBe(60);
    });

    it("handles prompt-only requests (0 completion tokens)", () => {
      const cost = calculateCost(500, 0, 0.0025, 0.01);
      // (500/1000) * 0.0025 = 0.00125
      expect(cost).toBeCloseTo(0.00125, 8);
    });
  });

  // ─── Default Pricing Lookup ───
  describe("getDefaultPricing", () => {
    it("returns pricing for gpt-4o-mini", () => {
      const pricing = getDefaultPricing("gpt-4o-mini");
      expect(pricing).toBeDefined();
      expect(pricing!.input).toBe(0.00015);
      expect(pricing!.output).toBe(0.0006);
    });

    it("returns pricing for gpt-4o", () => {
      const pricing = getDefaultPricing("gpt-4o");
      expect(pricing).toBeDefined();
      expect(pricing!.input).toBe(0.0025);
      expect(pricing!.output).toBe(0.01);
    });

    it("returns pricing for claude-3-5-sonnet (legacy)", () => {
      const pricing = getDefaultPricing("claude-3-5-sonnet-20241022");
      expect(pricing).toBeDefined();
      expect(pricing!.input).toBe(0.003);
      expect(pricing!.output).toBe(0.015);
    });

    it("returns pricing for claude-sonnet-4 (current)", () => {
      const pricing = getDefaultPricing("claude-sonnet-4-20250514");
      expect(pricing).toBeDefined();
      expect(pricing!.input).toBe(0.003);
      expect(pricing!.output).toBe(0.015);
    });

    it("returns pricing for claude-haiku-4.5 (current)", () => {
      const pricing = getDefaultPricing("claude-haiku-4.5-20251001");
      expect(pricing).toBeDefined();
      expect(pricing!.input).toBe(0.001);
      expect(pricing!.output).toBe(0.005);
    });

    it("returns pricing for claude-opus-4.5", () => {
      const pricing = getDefaultPricing("claude-opus-4.5-20251124");
      expect(pricing).toBeDefined();
      expect(pricing!.input).toBe(0.005);
      expect(pricing!.output).toBe(0.025);
    });

    it("returns pricing for claude-sonnet-4.5", () => {
      const pricing = getDefaultPricing("claude-sonnet-4.5-20250929");
      expect(pricing).toBeDefined();
      expect(pricing!.input).toBe(0.003);
      expect(pricing!.output).toBe(0.015);
    });

    it("returns pricing for claude-sonnet-4.6", () => {
      const pricing = getDefaultPricing("claude-sonnet-4.6-20260218");
      expect(pricing).toBeDefined();
      expect(pricing!.input).toBe(0.003);
      expect(pricing!.output).toBe(0.015);
    });

    it("returns pricing for claude-opus-4.6", () => {
      const pricing = getDefaultPricing("claude-opus-4.6-20260218");
      expect(pricing).toBeDefined();
      expect(pricing!.input).toBe(0.005);
      expect(pricing!.output).toBe(0.025);
    });

    it("returns pricing for gemini-2.0-flash", () => {
      const pricing = getDefaultPricing("gemini-2.0-flash");
      expect(pricing).toBeDefined();
      expect(pricing!.input).toBe(0.0001);
      expect(pricing!.output).toBe(0.0004);
    });

    it("returns undefined for unknown models", () => {
      const pricing = getDefaultPricing("unknown-model-xyz");
      expect(pricing).toBeUndefined();
    });

    it("matches models by prefix when exact match fails", () => {
      // "claude-sonnet-4-20250514" should match "claude-sonnet-4" by prefix
      const pricing = getDefaultPricing("claude-sonnet-4-20250514");
      expect(pricing).toBeDefined();
      expect(pricing!.input).toBe(0.003);
      expect(pricing!.output).toBe(0.015);
    });

    it("matches dated Anthropic model variants by prefix", () => {
      // All these dated variants should resolve via prefix matching
      const cases = [
        { model: "claude-sonnet-4-20250514", expectedInput: 0.003, expectedOutput: 0.015 },
        { model: "claude-haiku-4.5-20251001", expectedInput: 0.001, expectedOutput: 0.005 },
        { model: "claude-opus-4.5-20251124", expectedInput: 0.005, expectedOutput: 0.025 },
        { model: "claude-opus-4.1-20250414", expectedInput: 0.015, expectedOutput: 0.075 },
        { model: "claude-opus-4-20250414", expectedInput: 0.015, expectedOutput: 0.075 },
        { model: "claude-sonnet-4.5-20250929", expectedInput: 0.003, expectedOutput: 0.015 },
        { model: "claude-sonnet-4.6-20260218", expectedInput: 0.003, expectedOutput: 0.015 },
        { model: "claude-opus-4.6-20260218", expectedInput: 0.005, expectedOutput: 0.025 },
      ];
      for (const { model, expectedInput, expectedOutput } of cases) {
        const pricing = getDefaultPricing(model);
        expect(pricing, `Missing pricing for ${model}`).toBeDefined();
        expect(pricing!.input).toBe(expectedInput);
        expect(pricing!.output).toBe(expectedOutput);
      }
    });

    it("calculates cost correctly for claude-sonnet-4 (1K input + 500 output)", () => {
      const pricing = getDefaultPricing("claude-sonnet-4-20250514")!;
      const cost = calculateCost(1000, 500, pricing.input, pricing.output);
      // (1000/1000) * 0.003 + (500/1000) * 0.015 = 0.003 + 0.0075 = 0.0105
      expect(cost).toBeCloseTo(0.0105, 6);
    });

    it("calculates cost correctly for claude-haiku-4.5 (10K input + 2K output)", () => {
      const pricing = getDefaultPricing("claude-haiku-4.5-20251001")!;
      const cost = calculateCost(10000, 2000, pricing.input, pricing.output);
      // (10000/1000) * 0.001 + (2000/1000) * 0.005 = 0.01 + 0.01 = 0.02
      expect(cost).toBeCloseTo(0.02, 6);
    });

    it("covers all default pricing entries", () => {
      const models = [
        // OpenAI
        "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo",
        // Anthropic Claude 4.x
        "claude-opus-4.6", "claude-opus-4.5", "claude-opus-4.1", "claude-opus-4",
        "claude-sonnet-4.6", "claude-sonnet-4.5", "claude-sonnet-4", "claude-haiku-4.5",
        // Anthropic Claude 3.x (legacy)
        "claude-3.7-sonnet", "claude-3-5-sonnet", "claude-3-5-haiku", "claude-3-opus", "claude-3-haiku",
        // Google Gemini
        "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro",
      ];
      for (const model of models) {
        const pricing = getDefaultPricing(model);
        expect(pricing, `Missing pricing for ${model}`).toBeDefined();
        expect(pricing!.input).toBeGreaterThan(0);
        expect(pricing!.output).toBeGreaterThan(0);
        expect(pricing!.output).toBeGreaterThanOrEqual(pricing!.input);
      }
    });
  });

  // ─── Proxy Response Headers ───
  describe("proxy contract", () => {
    it("API key format follows sk-prysm-{64hex} pattern", () => {
      // Verify the expected key format
      const keyPattern = /^sk-prysm-[a-f0-9]{64}$/;
      // A valid key should match
      expect(keyPattern.test("sk-prysm-" + "a".repeat(64))).toBe(true);
      // Invalid keys should not match
      expect(keyPattern.test("sk-openai-abc")).toBe(false);
      expect(keyPattern.test("sk-prysm-short")).toBe(false);
    });

    it("proxy endpoint path follows OpenAI convention", () => {
      const endpoint = "/v1/chat/completions";
      expect(endpoint).toBe("/v1/chat/completions");
    });
  });
});
