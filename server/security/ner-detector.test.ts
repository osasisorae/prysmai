/**
 * NER Detector Tests
 * Blueprint Section 5.4 — LLM-based Named Entity Recognition
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

import { detectNER, calculateNERRiskScore, type NEREntity } from "./ner-detector";
import { generateObject } from "ai";

const mockGenerateObject = vi.mocked(generateObject);

describe("NER Detector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("BUILT_IN_FORGE_API_URL", "https://forge.test.com");
    vi.stubEnv("BUILT_IN_FORGE_API_KEY", "test-key");
  });

  describe("Plan gating", () => {
    it("should skip NER for free tier", async () => {
      const result = await detectNER("John Smith lives at 123 Main St", "free");
      expect(result.scanned).toBe(false);
      expect(result.summary).toContain("paid plan");
      expect(mockGenerateObject).not.toHaveBeenCalled();
    });

    it("should allow NER for pro tier", async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: { entities: [], summary: "No entities found" },
      } as any);

      const result = await detectNER("Hello world, this is a test", "pro");
      expect(result.scanned).toBe(true);
    });

    it("should allow NER for enterprise tier", async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: { entities: [], summary: "No entities found" },
      } as any);

      const result = await detectNER("Hello world, this is a test", "enterprise");
      expect(result.scanned).toBe(true);
    });
  });

  describe("Short content handling", () => {
    it("should handle empty text", async () => {
      const result = await detectNER("", "pro");
      expect(result.scanned).toBe(true);
      expect(result.entities).toHaveLength(0);
      expect(result.summary).toContain("too short");
    });

    it("should handle very short text", async () => {
      const result = await detectNER("hi", "pro");
      expect(result.scanned).toBe(true);
      expect(result.entities).toHaveLength(0);
    });
  });

  describe("Entity detection", () => {
    it("should detect PERSON entities", async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          entities: [
            { text: "John Smith", type: "PERSON", confidence: 0.95, isSensitive: true, context: "Full name" },
          ],
          summary: "Found 1 person name",
        },
      } as any);

      const result = await detectNER("John Smith called yesterday about the project", "pro");
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].type).toBe("PERSON");
      expect(result.entities[0].isSensitive).toBe(true);
      expect(result.sensitiveCount).toBe(1);
      expect(result.entityTypes).toContain("PERSON");
    });

    it("should detect multiple entity types", async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          entities: [
            { text: "Jane Doe", type: "PERSON", confidence: 0.9, isSensitive: true, context: "Name" },
            { text: "Acme Corp", type: "ORG", confidence: 0.85, isSensitive: false, context: "Company" },
            { text: "123 Main Street, NYC", type: "LOCATION", confidence: 0.9, isSensitive: true, context: "Address" },
            { text: "sk-abc123xyz", type: "CREDENTIAL", confidence: 0.95, isSensitive: true, context: "API key" },
          ],
          summary: "Found multiple sensitive entities including a name, address, and API key",
        },
      } as any);

      const result = await detectNER("Jane Doe at Acme Corp, 123 Main Street, NYC. Key: sk-abc123xyz", "pro");
      expect(result.entities).toHaveLength(4);
      expect(result.sensitiveCount).toBe(3); // Jane, address, API key
      expect(result.entityTypes).toContain("PERSON");
      expect(result.entityTypes).toContain("ORG");
      expect(result.entityTypes).toContain("LOCATION");
      expect(result.entityTypes).toContain("CREDENTIAL");
    });

    it("should detect MEDICAL entities", async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: {
          entities: [
            { text: "Type 2 Diabetes", type: "MEDICAL", confidence: 0.92, isSensitive: true, context: "Medical condition" },
            { text: "Metformin 500mg", type: "MEDICAL", confidence: 0.88, isSensitive: true, context: "Medication" },
          ],
          summary: "Found medical condition and medication",
        },
      } as any);

      const result = await detectNER("Patient diagnosed with Type 2 Diabetes, prescribed Metformin 500mg", "pro");
      expect(result.sensitiveCount).toBe(2);
      expect(result.entityTypes).toEqual(["MEDICAL"]);
    });
  });

  describe("Risk score calculation", () => {
    it("should return 0 for no entities", () => {
      expect(calculateNERRiskScore([])).toBe(0);
    });

    it("should score CREDENTIAL entities highest", () => {
      const entities: NEREntity[] = [
        { text: "sk-abc123", type: "CREDENTIAL", confidence: 1.0, isSensitive: true, context: "API key" },
      ];
      const score = calculateNERRiskScore(entities);
      expect(score).toBe(25); // 25 * 1.0 confidence
    });

    it("should score MEDICAL entities high", () => {
      const entities: NEREntity[] = [
        { text: "Diabetes", type: "MEDICAL", confidence: 0.9, isSensitive: true, context: "Condition" },
      ];
      const score = calculateNERRiskScore(entities);
      expect(score).toBe(18); // 20 * 0.9
    });

    it("should not count non-sensitive entities", () => {
      const entities: NEREntity[] = [
        { text: "Acme Corp", type: "ORG", confidence: 0.9, isSensitive: false, context: "Company" },
        { text: "2024-01-15", type: "DATE", confidence: 0.95, isSensitive: false, context: "Date" },
      ];
      const score = calculateNERRiskScore(entities);
      expect(score).toBe(0);
    });

    it("should cap at 100", () => {
      const entities: NEREntity[] = Array.from({ length: 10 }, (_, i) => ({
        text: `key-${i}`,
        type: "CREDENTIAL" as const,
        confidence: 1.0,
        isSensitive: true,
        context: "API key",
      }));
      const score = calculateNERRiskScore(entities);
      expect(score).toBe(100);
    });

    it("should weight by confidence", () => {
      const highConf: NEREntity[] = [
        { text: "John", type: "PERSON", confidence: 1.0, isSensitive: true, context: "Name" },
      ];
      const lowConf: NEREntity[] = [
        { text: "John", type: "PERSON", confidence: 0.5, isSensitive: true, context: "Name" },
      ];
      expect(calculateNERRiskScore(highConf)).toBeGreaterThan(calculateNERRiskScore(lowConf));
    });
  });

  describe("Error handling", () => {
    it("should handle API errors gracefully", async () => {
      mockGenerateObject.mockRejectedValueOnce(new Error("API timeout"));

      const result = await detectNER("John Smith at 123 Main St", "pro");
      expect(result.scanned).toBe(false);
      expect(result.error).toBe("API timeout");
      expect(result.entities).toHaveLength(0);
    });

    it("should handle missing Forge API config", async () => {
      vi.stubEnv("BUILT_IN_FORGE_API_URL", "");
      vi.stubEnv("BUILT_IN_FORGE_API_KEY", "");

      const result = await detectNER("John Smith at 123 Main St", "pro");
      expect(result.scanned).toBe(false);
      expect(result.error).toContain("Missing");
    });
  });

  describe("Processing time", () => {
    it("should track processing time", async () => {
      mockGenerateObject.mockResolvedValueOnce({
        object: { entities: [], summary: "No entities" },
      } as any);

      const result = await detectNER("Some test content here", "pro");
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});
