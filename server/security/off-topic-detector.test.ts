import { describe, it, expect } from "vitest";
import {
  detectOffTopicKeyword,
  type OffTopicConfig,
} from "./off-topic-detector";

// ─── Test Configs ───────────────────────────────────────────────────

const customerSupportConfig: OffTopicConfig = {
  enabled: true,
  description: "This agent handles customer support for a SaaS product. It answers billing questions, troubleshoots technical issues, and manages account settings.",
  keywords: ["billing", "invoice", "payment", "subscription", "account", "login", "password", "bug", "error", "feature", "pricing"],
  threshold: 0.70,
  action: "log",
};

const codingAssistantConfig: OffTopicConfig = {
  enabled: true,
  description: "This agent is a coding assistant that helps with Python, JavaScript, and TypeScript programming.",
  keywords: ["python", "javascript", "typescript", "code", "function", "variable", "debug", "error", "class", "import", "module"],
  threshold: 0.70,
  action: "warn",
};

const disabledConfig: OffTopicConfig = {
  enabled: false,
  description: null,
  keywords: [],
  threshold: 0.70,
  action: "log",
};

const noKeywordsConfig: OffTopicConfig = {
  enabled: true,
  description: null,
  keywords: [],
  threshold: 0.70,
  action: "log",
};

const descriptionOnlyConfig: OffTopicConfig = {
  enabled: true,
  description: "This agent manages restaurant reservations and food orders for an Italian restaurant.",
  keywords: [],
  threshold: 0.70,
  action: "block",
};

// ─── Keyword-Based Detection Tests ──────────────────────────────────

describe("Off-Topic Detection — Keyword-Based", () => {
  describe("On-topic prompts", () => {
    it("should detect customer support prompt as on-topic", () => {
      const result = detectOffTopicKeyword(
        "I can't log into my account and I need to update my billing information",
        customerSupportConfig
      );
      expect(result.isOffTopic).toBe(false);
      expect(result.relevanceScore).toBeGreaterThanOrEqual(0.3);
      expect(result.method).toBe("keyword");
    });

    it("should detect coding question as on-topic for coding assistant", () => {
      const result = detectOffTopicKeyword(
        "How do I write a Python function that sorts a list of dictionaries by a key?",
        codingAssistantConfig
      );
      expect(result.isOffTopic).toBe(false);
      expect(result.relevanceScore).toBeGreaterThanOrEqual(0.3);
    });

    it("should detect subscription question as on-topic for support", () => {
      const result = detectOffTopicKeyword(
        "How do I cancel my subscription?",
        customerSupportConfig
      );
      expect(result.isOffTopic).toBe(false);
    });
  });

  describe("Off-topic prompts", () => {
    it("should detect recipe question as off-topic for customer support", () => {
      const result = detectOffTopicKeyword(
        "What is the best recipe for chocolate cake?",
        customerSupportConfig
      );
      expect(result.isOffTopic).toBe(true);
      expect(result.relevanceScore).toBeLessThan(0.70);
    });

    it("should detect weather question as off-topic for coding assistant", () => {
      const result = detectOffTopicKeyword(
        "What's the weather like in Paris today?",
        codingAssistantConfig
      );
      expect(result.isOffTopic).toBe(true);
      expect(result.relevanceScore).toBeLessThan(0.70);
    });

    it("should detect philosophy question as off-topic for support", () => {
      const result = detectOffTopicKeyword(
        "What is the meaning of life and consciousness?",
        customerSupportConfig
      );
      expect(result.isOffTopic).toBe(true);
    });
  });

  describe("Edge cases", () => {
    it("should return on-topic when detection is disabled", () => {
      const result = detectOffTopicKeyword(
        "Completely random text about dinosaurs",
        disabledConfig
      );
      // Note: detectOffTopicKeyword doesn't check enabled flag — that's the main entry point's job
      // With no keywords and no description, it should return on-topic with low confidence
      expect(result.relevanceScore).toBe(1.0);
      expect(result.confidence).toBe(0.1);
    });

    it("should handle empty keyword list with description", () => {
      const result = detectOffTopicKeyword(
        "I'd like to make a reservation for dinner tonight at the Italian place",
        descriptionOnlyConfig
      );
      // Should extract keywords from description
      expect(result.method).toBe("keyword");
      expect(result.relevanceScore).toBeGreaterThan(0);
    });

    it("should handle no keywords and no description", () => {
      const result = detectOffTopicKeyword(
        "Any random text here",
        noKeywordsConfig
      );
      expect(result.isOffTopic).toBe(false);
      expect(result.relevanceScore).toBe(1.0);
      expect(result.confidence).toBe(0.1);
      expect(result.reason).toContain("No on-topic keywords configured");
    });

    it("should be case-insensitive", () => {
      const result = detectOffTopicKeyword(
        "I need help with my BILLING and PAYMENT issues",
        customerSupportConfig
      );
      expect(result.isOffTopic).toBe(false);
    });

    it("should handle very short prompts", () => {
      const result = detectOffTopicKeyword("hi", customerSupportConfig);
      expect(result.method).toBe("keyword");
      // "hi" won't match any keywords
      expect(result.relevanceScore).toBeLessThan(0.70);
    });
  });

  describe("Scoring accuracy", () => {
    it("should give higher score for more keyword matches", () => {
      const singleMatch = detectOffTopicKeyword(
        "Tell me about billing",
        customerSupportConfig
      );
      const multiMatch = detectOffTopicKeyword(
        "I have a billing issue with my subscription payment and my account login keeps showing an error",
        customerSupportConfig
      );
      expect(multiMatch.relevanceScore).toBeGreaterThan(singleMatch.relevanceScore);
    });

    it("should return processing time", () => {
      const result = detectOffTopicKeyword(
        "Test prompt",
        customerSupportConfig
      );
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.processingTimeMs).toBeLessThan(100); // keyword matching should be fast
    });
  });

  describe("Threshold behavior", () => {
    it("should respect custom threshold", () => {
      const lowThreshold: OffTopicConfig = {
        ...customerSupportConfig,
        threshold: 0.1, // very low — almost everything is on-topic
      };
      const result = detectOffTopicKeyword(
        "Tell me about billing",
        lowThreshold
      );
      expect(result.isOffTopic).toBe(false);
    });

    it("should flag with high threshold", () => {
      const highThreshold: OffTopicConfig = {
        ...customerSupportConfig,
        threshold: 0.99, // very high — almost everything is off-topic
      };
      const result = detectOffTopicKeyword(
        "Tell me about billing",
        highThreshold
      );
      expect(result.isOffTopic).toBe(true);
    });
  });
});

// ─── Integration with proxy middleware types ─────────────────────────

describe("Off-Topic Detection — Type Safety", () => {
  it("should return all required fields in OffTopicResult", () => {
    const result = detectOffTopicKeyword(
      "Test prompt about billing",
      customerSupportConfig
    );
    expect(result).toHaveProperty("isOffTopic");
    expect(result).toHaveProperty("relevanceScore");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("reason");
    expect(result).toHaveProperty("method");
    expect(result).toHaveProperty("processingTimeMs");
    expect(typeof result.isOffTopic).toBe("boolean");
    expect(typeof result.relevanceScore).toBe("number");
    expect(typeof result.confidence).toBe("number");
    expect(typeof result.reason).toBe("string");
    expect(typeof result.method).toBe("string");
    expect(typeof result.processingTimeMs).toBe("number");
  });

  it("should keep relevanceScore between 0 and 1", () => {
    const prompts = [
      "billing payment subscription account login",
      "random dinosaur space exploration quantum physics",
      "",
      "a",
      "billing ".repeat(100),
    ];
    for (const prompt of prompts) {
      const result = detectOffTopicKeyword(prompt, customerSupportConfig);
      expect(result.relevanceScore).toBeGreaterThanOrEqual(0);
      expect(result.relevanceScore).toBeLessThanOrEqual(1);
    }
  });
});
