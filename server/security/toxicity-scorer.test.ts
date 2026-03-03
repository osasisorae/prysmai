/**
 * ML-Based Toxicity Scorer Tests
 * Blueprint Section 5.4 — 6-dimension LLM-based toxicity scoring
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the AI SDK
vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => vi.fn()),
}));

vi.mock("../_core/patchedFetch", () => ({
  createPatchedFetch: vi.fn(() => vi.fn()),
}));

import { scoreToxicityML, getEmptyDimensions, type ToxicityScores, type MLToxicityResult } from "./toxicity-scorer";
import { generateObject } from "ai";

const mockGenerateObject = vi.mocked(generateObject);

describe("ML Toxicity Scorer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up env vars
    vi.stubEnv("BUILT_IN_FORGE_API_URL", "https://forge.test.com");
    vi.stubEnv("BUILT_IN_FORGE_API_KEY", "test-key");
  });

  describe("Plan gating", () => {
    it("should skip ML scoring for free tier", async () => {
      const result = await scoreToxicityML("some text", "free");
      expect(result.scanned).toBe(false);
      expect(result.summary).toContain("paid plan");
      expect(mockGenerateObject).not.toHaveBeenCalled();
    });

    it("should allow ML scoring for pro tier", async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          hate_speech: { score: 0, flagged: false, reason: "Safe" },
          harassment: { score: 0, flagged: false, reason: "Safe" },
          self_harm: { score: 0, flagged: false, reason: "Safe" },
          sexual_content: { score: 0, flagged: false, reason: "Safe" },
          violence: { score: 0, flagged: false, reason: "Safe" },
          dangerous_info: { score: 0, flagged: false, reason: "Safe" },
          summary: "Content is safe",
        },
      } as any);

      const result = await scoreToxicityML("Hello world", "pro");
      expect(result.scanned).toBe(true);
    });

    it("should allow ML scoring for team tier", async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          hate_speech: { score: 0, flagged: false, reason: "Safe" },
          harassment: { score: 0, flagged: false, reason: "Safe" },
          self_harm: { score: 0, flagged: false, reason: "Safe" },
          sexual_content: { score: 0, flagged: false, reason: "Safe" },
          violence: { score: 0, flagged: false, reason: "Safe" },
          dangerous_info: { score: 0, flagged: false, reason: "Safe" },
          summary: "Content is safe",
        },
      } as any);

      const result = await scoreToxicityML("Hello world", "team");
      expect(result.scanned).toBe(true);
    });

    it("should allow ML scoring for enterprise tier", async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          hate_speech: { score: 0, flagged: false, reason: "Safe" },
          harassment: { score: 0, flagged: false, reason: "Safe" },
          self_harm: { score: 0, flagged: false, reason: "Safe" },
          sexual_content: { score: 0, flagged: false, reason: "Safe" },
          violence: { score: 0, flagged: false, reason: "Safe" },
          dangerous_info: { score: 0, flagged: false, reason: "Safe" },
          summary: "Content is safe",
        },
      } as any);

      const result = await scoreToxicityML("Hello world", "enterprise");
      expect(result.scanned).toBe(true);
    });
  });

  describe("Empty/short content handling", () => {
    it("should handle empty text", async () => {
      const result = await scoreToxicityML("", "pro");
      expect(result.scanned).toBe(true);
      expect(result.overallScore).toBe(0);
      expect(result.summary).toContain("too short");
    });

    it("should handle very short text", async () => {
      const result = await scoreToxicityML("hi", "pro");
      expect(result.scanned).toBe(true);
      expect(result.overallScore).toBe(0);
    });
  });

  describe("Scoring logic", () => {
    it("should return low score for safe content", async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          hate_speech: { score: 0.05, flagged: false, reason: "No hate speech detected" },
          harassment: { score: 0.02, flagged: false, reason: "No harassment detected" },
          self_harm: { score: 0.0, flagged: false, reason: "No self-harm content" },
          sexual_content: { score: 0.01, flagged: false, reason: "No sexual content" },
          violence: { score: 0.03, flagged: false, reason: "No violence" },
          dangerous_info: { score: 0.0, flagged: false, reason: "No dangerous info" },
          summary: "Content is completely safe",
        },
      } as any);

      const result = await scoreToxicityML("The weather is nice today", "pro");
      expect(result.scanned).toBe(true);
      expect(result.overallScore).toBeLessThan(10);
      expect(result.flaggedCategories).toHaveLength(0);
    });

    it("should return high score for toxic content", async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          hate_speech: { score: 0.9, flagged: true, reason: "Contains hate speech" },
          harassment: { score: 0.7, flagged: true, reason: "Threatening language" },
          self_harm: { score: 0.1, flagged: false, reason: "No self-harm" },
          sexual_content: { score: 0.0, flagged: false, reason: "No sexual content" },
          violence: { score: 0.8, flagged: true, reason: "Violent threats" },
          dangerous_info: { score: 0.0, flagged: false, reason: "No dangerous info" },
          summary: "Content contains hate speech, harassment, and violent threats",
        },
      } as any);

      const result = await scoreToxicityML("toxic content here", "pro");
      expect(result.scanned).toBe(true);
      expect(result.overallScore).toBeGreaterThan(50);
      expect(result.flaggedCategories).toContain("hate_speech");
      expect(result.flaggedCategories).toContain("harassment");
      expect(result.flaggedCategories).toContain("violence");
      expect(result.flaggedCategories).not.toContain("self_harm");
    });

    it("should correctly identify flagged categories", async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          hate_speech: { score: 0.1, flagged: false, reason: "Safe" },
          harassment: { score: 0.1, flagged: false, reason: "Safe" },
          self_harm: { score: 0.8, flagged: true, reason: "Contains self-harm instructions" },
          sexual_content: { score: 0.0, flagged: false, reason: "Safe" },
          violence: { score: 0.1, flagged: false, reason: "Safe" },
          dangerous_info: { score: 0.6, flagged: true, reason: "Contains dangerous instructions" },
          summary: "Content contains self-harm and dangerous info",
        },
      } as any);

      const result = await scoreToxicityML("dangerous content", "pro");
      expect(result.flaggedCategories).toEqual(["self_harm", "dangerous_info"]);
    });
  });

  describe("6 dimensions", () => {
    it("should return all 6 dimensions in the result", async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          hate_speech: { score: 0, flagged: false, reason: "Safe" },
          harassment: { score: 0, flagged: false, reason: "Safe" },
          self_harm: { score: 0, flagged: false, reason: "Safe" },
          sexual_content: { score: 0, flagged: false, reason: "Safe" },
          violence: { score: 0, flagged: false, reason: "Safe" },
          dangerous_info: { score: 0, flagged: false, reason: "Safe" },
          summary: "Safe",
        },
      } as any);

      const result = await scoreToxicityML("Hello", "pro");
      const dims = result.dimensions;
      expect(dims).toHaveProperty("hate_speech");
      expect(dims).toHaveProperty("harassment");
      expect(dims).toHaveProperty("self_harm");
      expect(dims).toHaveProperty("sexual_content");
      expect(dims).toHaveProperty("violence");
      expect(dims).toHaveProperty("dangerous_info");
    });
  });

  describe("Error handling", () => {
    it("should handle API errors gracefully", async () => {
      mockGenerateObject.mockRejectedValueOnce(new Error("API timeout"));

      const result = await scoreToxicityML("some text", "pro");
      expect(result.scanned).toBe(false);
      expect(result.error).toBe("API timeout");
      expect(result.overallScore).toBe(0);
    });

    it("should handle missing Forge API config", async () => {
      vi.stubEnv("BUILT_IN_FORGE_API_URL", "");
      vi.stubEnv("BUILT_IN_FORGE_API_KEY", "");

      const result = await scoreToxicityML("some text", "pro");
      expect(result.scanned).toBe(false);
      expect(result.error).toContain("Missing");
    });
  });

  describe("getEmptyDimensions", () => {
    it("should return all 6 dimensions with zero scores", () => {
      const dims = getEmptyDimensions();
      expect(Object.keys(dims)).toHaveLength(6);
      for (const dim of Object.values(dims)) {
        expect(dim.score).toBe(0);
        expect(dim.flagged).toBe(false);
      }
    });
  });

  describe("Processing time tracking", () => {
    it("should include processingTimeMs in result", async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          hate_speech: { score: 0, flagged: false, reason: "Safe" },
          harassment: { score: 0, flagged: false, reason: "Safe" },
          self_harm: { score: 0, flagged: false, reason: "Safe" },
          sexual_content: { score: 0, flagged: false, reason: "Safe" },
          violence: { score: 0, flagged: false, reason: "Safe" },
          dangerous_info: { score: 0, flagged: false, reason: "Safe" },
          summary: "Safe",
        },
      } as any);

      const result = await scoreToxicityML("Hello", "pro");
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});
