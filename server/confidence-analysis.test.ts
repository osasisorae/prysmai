import { describe, expect, it } from "vitest";
import {
  computeConfidenceAnalysis,
  estimateAnthropicConfidence,
  type TokenLogprob,
  type ConfidenceAnalysis,
} from "./confidence-analysis";

// ═══════════════════════════════════════════════════════════════
// TEST DATA FIXTURES — Provider-specific logprobs formats
// ═══════════════════════════════════════════════════════════════

/**
 * OpenAI-format logprobs: high confidence tokens.
 * Simulates a GPT-4.1 response for "The capital of France is Paris."
 */
function createOpenAIHighConfidenceLogprobs(): { content: TokenLogprob[] } {
  return {
    content: [
      {
        token: "The",
        logprob: -0.0012,
        top_logprobs: [
          { token: "The", logprob: -0.0012 },
          { token: "France", logprob: -6.8 },
          { token: "Paris", logprob: -7.2 },
          { token: "A", logprob: -7.5 },
          { token: "It", logprob: -8.1 },
        ],
      },
      {
        token: " capital",
        logprob: -0.0008,
        top_logprobs: [
          { token: " capital", logprob: -0.0008 },
          { token: " largest", logprob: -7.5 },
          { token: " main", logprob: -8.2 },
          { token: " biggest", logprob: -8.9 },
          { token: " official", logprob: -9.1 },
        ],
      },
      {
        token: " of",
        logprob: -0.0001,
        top_logprobs: [
          { token: " of", logprob: -0.0001 },
          { token: " city", logprob: -9.5 },
          { token: ",", logprob: -10.2 },
        ],
      },
      {
        token: " France",
        logprob: -0.0015,
        top_logprobs: [
          { token: " France", logprob: -0.0015 },
          { token: " the", logprob: -6.9 },
          { token: " Germany", logprob: -8.1 },
          { token: " Spain", logprob: -8.5 },
          { token: " Italy", logprob: -8.8 },
        ],
      },
      {
        token: " is",
        logprob: -0.0003,
        top_logprobs: [
          { token: " is", logprob: -0.0003 },
          { token: ",", logprob: -8.2 },
          { token: " has", logprob: -9.1 },
        ],
      },
      {
        token: " Paris",
        logprob: -0.0005,
        top_logprobs: [
          { token: " Paris", logprob: -0.0005 },
          { token: " Lyon", logprob: -7.8 },
          { token: " Marseille", logprob: -8.5 },
          { token: " Nice", logprob: -9.2 },
          { token: " Bordeaux", logprob: -9.5 },
        ],
      },
      {
        token: ".",
        logprob: -0.0002,
        top_logprobs: [
          { token: ".", logprob: -0.0002 },
          { token: ",", logprob: -8.5 },
        ],
      },
    ],
  };
}

/**
 * OpenAI-format logprobs: mixed confidence with hallucination segments.
 * Simulates a response with some uncertain/fabricated content.
 */
function createOpenAIMixedConfidenceLogprobs(): { content: TokenLogprob[] } {
  return {
    content: [
      // High confidence start
      { token: "The", logprob: -0.001, top_logprobs: [{ token: "The", logprob: -0.001 }, { token: "A", logprob: -7.0 }] },
      { token: " answer", logprob: -0.002, top_logprobs: [{ token: " answer", logprob: -0.002 }, { token: " result", logprob: -6.5 }] },
      { token: " is", logprob: -0.001, top_logprobs: [{ token: " is", logprob: -0.001 }, { token: " was", logprob: -7.0 }] },
      // Low confidence segment (hallucination candidate) — 4 consecutive low-conf tokens
      { token: " approximately", logprob: -1.5, top_logprobs: [{ token: " approximately", logprob: -1.5 }, { token: " about", logprob: -1.6 }, { token: " roughly", logprob: -1.7 }, { token: " around", logprob: -1.8 }, { token: " exactly", logprob: -2.0 }] },
      { token: " 42", logprob: -2.0, top_logprobs: [{ token: " 42", logprob: -2.0 }, { token: " 45", logprob: -2.1 }, { token: " 40", logprob: -2.2 }, { token: " 38", logprob: -2.3 }, { token: " 50", logprob: -2.5 }] },
      { token: " million", logprob: -1.8, top_logprobs: [{ token: " million", logprob: -1.8 }, { token: " thousand", logprob: -1.9 }, { token: " billion", logprob: -2.0 }, { token: " hundred", logprob: -2.5 }, { token: "%", logprob: -3.0 }] },
      { token: " units", logprob: -1.6, top_logprobs: [{ token: " units", logprob: -1.6 }, { token: " people", logprob: -1.7 }, { token: " items", logprob: -1.8 }, { token: " dollars", logprob: -2.0 }, { token: " tons", logprob: -2.5 }] },
      // Back to high confidence
      { token: ".", logprob: -0.003, top_logprobs: [{ token: ".", logprob: -0.003 }, { token: ",", logprob: -5.5 }] },
    ],
  };
}

/**
 * OpenAI-format logprobs: decision points (close margins between alternatives).
 */
function createOpenAIDecisionPointLogprobs(): { content: TokenLogprob[] } {
  return {
    content: [
      { token: "I", logprob: -0.001, top_logprobs: [{ token: "I", logprob: -0.001 }, { token: "The", logprob: -7.0 }] },
      { token: " recommend", logprob: -0.01, top_logprobs: [{ token: " recommend", logprob: -0.01 }, { token: " suggest", logprob: -4.6 }] },
      // Decision point: "Python" vs "JavaScript" — very close
      { token: " Python", logprob: -0.65, top_logprobs: [{ token: " Python", logprob: -0.65 }, { token: " JavaScript", logprob: -0.72 }, { token: " TypeScript", logprob: -1.5 }, { token: " Go", logprob: -2.0 }, { token: " Rust", logprob: -2.5 }] },
      // Decision point: "because" vs "since" — close
      { token: " because", logprob: -0.55, top_logprobs: [{ token: " because", logprob: -0.55 }, { token: " since", logprob: -0.62 }, { token: " as", logprob: -1.8 }] },
      { token: " it", logprob: -0.01, top_logprobs: [{ token: " it", logprob: -0.01 }, { token: " the", logprob: -5.0 }] },
      { token: " is", logprob: -0.005, top_logprobs: [{ token: " is", logprob: -0.005 }, { token: " has", logprob: -5.5 }] },
      // Decision point: "versatile" vs "flexible" — close
      { token: " versatile", logprob: -0.50, top_logprobs: [{ token: " versatile", logprob: -0.50 }, { token: " flexible", logprob: -0.58 }, { token: " powerful", logprob: -1.2 }] },
      { token: ".", logprob: -0.001, top_logprobs: [{ token: ".", logprob: -0.001 }, { token: ",", logprob: -7.0 }] },
    ],
  };
}

/**
 * Google Gemini-format logprobs (already normalized to OpenAI format).
 * High confidence response.
 */
function createGeminiHighConfidenceLogprobs(): { content: TokenLogprob[] } {
  return {
    content: [
      { token: "The", logprob: -0.002, top_logprobs: [{ token: "The", logprob: -0.002 }, { token: "A", logprob: -6.5 }, { token: "One", logprob: -7.0 }, { token: "This", logprob: -7.5 }, { token: "It", logprob: -8.0 }] },
      { token: " Earth", logprob: -0.001, top_logprobs: [{ token: " Earth", logprob: -0.001 }, { token: " planet", logprob: -7.0 }, { token: " world", logprob: -7.5 }, { token: " sun", logprob: -8.0 }, { token: " moon", logprob: -8.5 }] },
      { token: " orbits", logprob: -0.003, top_logprobs: [{ token: " orbits", logprob: -0.003 }, { token: " revolves", logprob: -5.5 }, { token: " circles", logprob: -7.0 }, { token: " goes", logprob: -8.0 }, { token: " travels", logprob: -8.5 }] },
      { token: " the", logprob: -0.0005, top_logprobs: [{ token: " the", logprob: -0.0005 }, { token: " around", logprob: -7.5 }] },
      { token: " Sun", logprob: -0.001, top_logprobs: [{ token: " Sun", logprob: -0.001 }, { token: " sun", logprob: -6.9 }, { token: " star", logprob: -8.0 }] },
      { token: ".", logprob: -0.0001, top_logprobs: [{ token: ".", logprob: -0.0001 }, { token: ",", logprob: -9.0 }] },
    ],
  };
}

/**
 * Google Gemini-format logprobs with mixed confidence.
 */
function createGeminiMixedConfidenceLogprobs(): { content: TokenLogprob[] } {
  return {
    content: [
      { token: "Water", logprob: -0.005, top_logprobs: [{ token: "Water", logprob: -0.005 }, { token: "The", logprob: -5.5 }] },
      { token: " boils", logprob: -0.01, top_logprobs: [{ token: " boils", logprob: -0.01 }, { token: " evaporates", logprob: -4.0 }] },
      { token: " at", logprob: -0.001, top_logprobs: [{ token: " at", logprob: -0.001 }, { token: " when", logprob: -6.0 }] },
      // Low confidence segment — uncertain about temperature
      { token: " approximately", logprob: -1.2, top_logprobs: [{ token: " approximately", logprob: -1.2 }, { token: " about", logprob: -1.3 }, { token: " exactly", logprob: -1.5 }, { token: " around", logprob: -1.6 }, { token: " roughly", logprob: -1.8 }] },
      { token: " 212", logprob: -1.5, top_logprobs: [{ token: " 212", logprob: -1.5 }, { token: " 100", logprob: -1.6 }, { token: " 200", logprob: -2.5 }, { token: " 180", logprob: -3.0 }, { token: " 220", logprob: -3.5 }] },
      { token: " degrees", logprob: -1.3, top_logprobs: [{ token: " degrees", logprob: -1.3 }, { token: "°", logprob: -1.5 }, { token: " F", logprob: -2.0 }, { token: " Celsius", logprob: -2.5 }, { token: " C", logprob: -3.0 }] },
      { token: " Fahrenheit", logprob: -1.4, top_logprobs: [{ token: " Fahrenheit", logprob: -1.4 }, { token: " Celsius", logprob: -1.5 }, { token: ".", logprob: -2.0 }] },
      { token: ".", logprob: -0.002, top_logprobs: [{ token: ".", logprob: -0.002 }, { token: ",", logprob: -6.0 }] },
    ],
  };
}

// ═══════════════════════════════════════════════════════════════
// TESTS: OpenAI Provider
// ═══════════════════════════════════════════════════════════════

describe("Confidence Analysis — OpenAI Provider", () => {
  describe("computeConfidenceAnalysis with high confidence logprobs", () => {
    it("returns native logprobs_source and openai provider", () => {
      const result = computeConfidenceAnalysis(createOpenAIHighConfidenceLogprobs(), "openai");
      expect(result.provider).toBe("openai");
      expect(result.logprobs_source).toBe("native");
    });

    it("computes high overall confidence for confident tokens", () => {
      const result = computeConfidenceAnalysis(createOpenAIHighConfidenceLogprobs(), "openai");
      expect(result.overall_confidence).toBeGreaterThan(0.9);
    });

    it("counts all tokens correctly", () => {
      const logprobs = createOpenAIHighConfidenceLogprobs();
      const result = computeConfidenceAnalysis(logprobs, "openai");
      expect(result.total_tokens).toBe(logprobs.content.length);
    });

    it("marks most tokens as high confidence", () => {
      const result = computeConfidenceAnalysis(createOpenAIHighConfidenceLogprobs(), "openai");
      expect(result.high_confidence_tokens).toBe(result.total_tokens);
      expect(result.low_confidence_tokens).toBe(0);
    });

    it("finds no hallucination candidates in confident text", () => {
      const result = computeConfidenceAnalysis(createOpenAIHighConfidenceLogprobs(), "openai");
      expect(result.hallucination_candidates).toHaveLength(0);
    });

    it("has low hallucination risk score", () => {
      const result = computeConfidenceAnalysis(createOpenAIHighConfidenceLogprobs(), "openai");
      expect(result.hallucination_risk_score).toBeLessThan(0.05);
    });

    it("generates per-token metrics for every token", () => {
      const logprobs = createOpenAIHighConfidenceLogprobs();
      const result = computeConfidenceAnalysis(logprobs, "openai");
      expect(result.per_token).toHaveLength(logprobs.content.length);
      for (const t of result.per_token) {
        expect(t.confidence).toBeGreaterThanOrEqual(0);
        expect(t.confidence).toBeLessThanOrEqual(1);
        expect(t.entropy).toBeGreaterThanOrEqual(0);
        expect(t.margin).toBeGreaterThanOrEqual(0);
      }
    });

    it("computes correct confidence from logprob", () => {
      const result = computeConfidenceAnalysis(createOpenAIHighConfidenceLogprobs(), "openai");
      // "The" has logprob -0.0012, so confidence = exp(-0.0012) ≈ 0.9988
      const theToken = result.per_token[0];
      expect(theToken.token).toBe("The");
      expect(theToken.confidence).toBeCloseTo(Math.exp(-0.0012), 3);
    });
  });

  describe("computeConfidenceAnalysis with mixed confidence logprobs", () => {
    it("detects hallucination candidates in low-confidence segments", () => {
      const result = computeConfidenceAnalysis(createOpenAIMixedConfidenceLogprobs(), "openai");
      expect(result.hallucination_candidates.length).toBeGreaterThanOrEqual(1);
    });

    it("hallucination candidate spans the correct token range", () => {
      const result = computeConfidenceAnalysis(createOpenAIMixedConfidenceLogprobs(), "openai");
      const candidate = result.hallucination_candidates[0];
      expect(candidate).toBeDefined();
      // The low-confidence segment starts at index 3 ("approximately") and runs through index 6 ("units")
      expect(candidate.start_token_idx).toBe(3);
      expect(candidate.end_token_idx).toBe(6);
    });

    it("hallucination candidate text is correct", () => {
      const result = computeConfidenceAnalysis(createOpenAIMixedConfidenceLogprobs(), "openai");
      const candidate = result.hallucination_candidates[0];
      expect(candidate.text).toBe(" approximately 42 million units");
    });

    it("hallucination candidate has low average confidence", () => {
      const result = computeConfidenceAnalysis(createOpenAIMixedConfidenceLogprobs(), "openai");
      const candidate = result.hallucination_candidates[0];
      expect(candidate.avg_confidence).toBeLessThan(0.3);
    });

    it("overall confidence is lower than pure high-confidence response", () => {
      const highConf = computeConfidenceAnalysis(createOpenAIHighConfidenceLogprobs(), "openai");
      const mixedConf = computeConfidenceAnalysis(createOpenAIMixedConfidenceLogprobs(), "openai");
      expect(mixedConf.overall_confidence).toBeLessThan(highConf.overall_confidence);
    });

    it("has some low confidence tokens", () => {
      const result = computeConfidenceAnalysis(createOpenAIMixedConfidenceLogprobs(), "openai");
      expect(result.low_confidence_tokens).toBeGreaterThanOrEqual(1);
    });
  });

  describe("computeConfidenceAnalysis with decision points", () => {
    it("detects decision points where margin is small", () => {
      const result = computeConfidenceAnalysis(createOpenAIDecisionPointLogprobs(), "openai");
      expect(result.decision_points.length).toBeGreaterThanOrEqual(2);
    });

    it("decision points have correct chosen and alternative tokens", () => {
      const result = computeConfidenceAnalysis(createOpenAIDecisionPointLogprobs(), "openai");
      // "Python" vs "JavaScript" should be a decision point
      const pythonDP = result.decision_points.find(dp => dp.chosen === " Python" || dp.alternative === " Python");
      expect(pythonDP).toBeDefined();
      expect(pythonDP!.margin).toBeLessThan(0.1);
    });

    it("decision points have valid confidence values", () => {
      const result = computeConfidenceAnalysis(createOpenAIDecisionPointLogprobs(), "openai");
      for (const dp of result.decision_points) {
        expect(dp.chosen_confidence).toBeGreaterThan(0);
        expect(dp.chosen_confidence).toBeLessThanOrEqual(1);
        expect(dp.alternative_confidence).toBeGreaterThan(0);
        expect(dp.alternative_confidence).toBeLessThanOrEqual(1);
        expect(dp.margin).toBeGreaterThanOrEqual(0);
        expect(dp.margin).toBeLessThan(0.1);
      }
    });
  });

  describe("edge cases — OpenAI", () => {
    it("handles empty logprobs content", () => {
      const result = computeConfidenceAnalysis({ content: [] }, "openai");
      expect(result.total_tokens).toBe(0);
      expect(result.overall_confidence).toBe(0);
      expect(result.hallucination_risk_score).toBe(0);
      expect(result.per_token).toHaveLength(0);
      expect(result.hallucination_candidates).toHaveLength(0);
      expect(result.decision_points).toHaveLength(0);
    });

    it("handles single token", () => {
      const result = computeConfidenceAnalysis({
        content: [{ token: "Hello", logprob: -0.01, top_logprobs: [{ token: "Hello", logprob: -0.01 }] }],
      }, "openai");
      expect(result.total_tokens).toBe(1);
      expect(result.overall_confidence).toBeGreaterThan(0.9);
    });

    it("handles tokens without top_logprobs", () => {
      const result = computeConfidenceAnalysis({
        content: [
          { token: "Hello", logprob: -0.01 },
          { token: " world", logprob: -0.02 },
        ],
      }, "openai");
      expect(result.total_tokens).toBe(2);
      expect(result.per_token[0].entropy).toBe(0);
      expect(result.per_token[0].margin).toBe(1.0);
    });

    it("handles extremely low logprobs", () => {
      const result = computeConfidenceAnalysis({
        content: [{ token: "xyz", logprob: -20, top_logprobs: [{ token: "xyz", logprob: -20 }, { token: "abc", logprob: -20.5 }] }],
      }, "openai");
      // exp(-20) ≈ 2.06e-9, which rounds to 0 at 4 decimal places
      expect(result.per_token[0].confidence).toBeGreaterThanOrEqual(0);
      expect(result.per_token[0].confidence).toBeLessThan(0.001);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// TESTS: Google Gemini Provider
// ═══════════════════════════════════════════════════════════════

describe("Confidence Analysis — Google Gemini Provider", () => {
  describe("computeConfidenceAnalysis with high confidence Gemini logprobs", () => {
    it("returns native logprobs_source and google provider", () => {
      const result = computeConfidenceAnalysis(createGeminiHighConfidenceLogprobs(), "google");
      expect(result.provider).toBe("google");
      expect(result.logprobs_source).toBe("native");
    });

    it("computes high overall confidence", () => {
      const result = computeConfidenceAnalysis(createGeminiHighConfidenceLogprobs(), "google");
      expect(result.overall_confidence).toBeGreaterThan(0.9);
    });

    it("counts all tokens correctly", () => {
      const logprobs = createGeminiHighConfidenceLogprobs();
      const result = computeConfidenceAnalysis(logprobs, "google");
      expect(result.total_tokens).toBe(logprobs.content.length);
    });

    it("finds no hallucination candidates", () => {
      const result = computeConfidenceAnalysis(createGeminiHighConfidenceLogprobs(), "google");
      expect(result.hallucination_candidates).toHaveLength(0);
    });

    it("generates per-token metrics", () => {
      const logprobs = createGeminiHighConfidenceLogprobs();
      const result = computeConfidenceAnalysis(logprobs, "google");
      expect(result.per_token).toHaveLength(logprobs.content.length);
      for (const t of result.per_token) {
        expect(t.confidence).toBeGreaterThan(0.9);
      }
    });
  });

  describe("computeConfidenceAnalysis with mixed confidence Gemini logprobs", () => {
    it("detects hallucination candidates", () => {
      const result = computeConfidenceAnalysis(createGeminiMixedConfidenceLogprobs(), "google");
      expect(result.hallucination_candidates.length).toBeGreaterThanOrEqual(1);
    });

    it("hallucination candidate covers the uncertain segment", () => {
      const result = computeConfidenceAnalysis(createGeminiMixedConfidenceLogprobs(), "google");
      const candidate = result.hallucination_candidates[0];
      expect(candidate).toBeDefined();
      // Tokens 3-6 are low confidence
      expect(candidate.start_token_idx).toBe(3);
      expect(candidate.end_token_idx).toBe(6);
    });

    it("overall confidence is moderate", () => {
      const result = computeConfidenceAnalysis(createGeminiMixedConfidenceLogprobs(), "google");
      expect(result.overall_confidence).toBeGreaterThan(0.1);
      expect(result.overall_confidence).toBeLessThan(0.9);
    });

    it("detects decision points in uncertain tokens", () => {
      const result = computeConfidenceAnalysis(createGeminiMixedConfidenceLogprobs(), "google");
      // The temperature tokens should have close alternatives
      expect(result.decision_points.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("edge cases — Gemini", () => {
    it("handles Gemini logprobs with only 2 alternatives", () => {
      const result = computeConfidenceAnalysis({
        content: [
          { token: "Yes", logprob: -0.5, top_logprobs: [{ token: "Yes", logprob: -0.5 }, { token: "No", logprob: -0.9 }] },
        ],
      }, "google");
      expect(result.total_tokens).toBe(1);
      expect(result.per_token[0].margin).toBeGreaterThan(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// TESTS: Anthropic Provider (Estimated Confidence)
// ═══════════════════════════════════════════════════════════════

describe("Confidence Analysis — Anthropic Provider (Estimated)", () => {
  describe("estimateAnthropicConfidence with confident text", () => {
    const confidentText = "The capital of France is Paris. It has been the capital since the 10th century. The city is located in the north-central part of the country.";

    it("returns estimated logprobs_source and anthropic provider", () => {
      const result = estimateAnthropicConfidence(confidentText);
      expect(result.provider).toBe("anthropic");
      expect(result.logprobs_source).toBe("estimated");
    });

    it("returns high confidence for definitive statements", () => {
      const result = estimateAnthropicConfidence(confidentText);
      expect(result.overall_confidence).toBeGreaterThan(0.7);
    });

    it("returns low hallucination risk for confident text", () => {
      const result = estimateAnthropicConfidence(confidentText);
      expect(result.hallucination_risk_score).toBeLessThan(0.2);
    });

    it("returns empty per_token array (no native logprobs)", () => {
      const result = estimateAnthropicConfidence(confidentText);
      expect(result.per_token).toHaveLength(0);
    });

    it("returns empty hallucination_candidates", () => {
      const result = estimateAnthropicConfidence(confidentText);
      expect(result.hallucination_candidates).toHaveLength(0);
    });

    it("returns empty decision_points", () => {
      const result = estimateAnthropicConfidence(confidentText);
      expect(result.decision_points).toHaveLength(0);
    });

    it("uses word count as approximate total_tokens", () => {
      const result = estimateAnthropicConfidence(confidentText);
      const wordCount = confidentText.split(/\s+/).length;
      expect(result.total_tokens).toBe(wordCount);
    });
  });

  describe("estimateAnthropicConfidence with hedging language", () => {
    const hedgingText = "I think the answer is probably around 42, but I'm not entirely sure. It could be higher, maybe 50 or perhaps even 60. I believe the most likely answer is somewhere in that range.";

    it("returns lower confidence than definitive text", () => {
      const confidentResult = estimateAnthropicConfidence("The answer is 42.");
      const hedgingResult = estimateAnthropicConfidence(hedgingText);
      expect(hedgingResult.overall_confidence).toBeLessThan(confidentResult.overall_confidence);
    });

    it("detects hedging patterns and lowers confidence", () => {
      const result = estimateAnthropicConfidence(hedgingText);
      expect(result.overall_confidence).toBeLessThan(0.85); // Below base
    });
  });

  describe("estimateAnthropicConfidence with self-corrections", () => {
    const correctionText = "The population is 5 million. Actually, let me reconsider. Wait, that's not right. Let me correct that — the population is closer to 3 million. I was wrong about the initial figure.";

    it("returns lower confidence for self-correcting text", () => {
      const result = estimateAnthropicConfidence(correctionText);
      expect(result.overall_confidence).toBeLessThan(0.75);
    });

    it("returns higher hallucination risk for self-correcting text", () => {
      const result = estimateAnthropicConfidence(correctionText);
      expect(result.hallucination_risk_score).toBeGreaterThan(0.1);
    });
  });

  describe("estimateAnthropicConfidence with uncertainty markers", () => {
    const uncertainText = "The distance is approximately 100 miles, roughly speaking. The estimated time is around 2 hours, though it's unclear whether traffic will affect this. It's uncertain and hard to say exactly.";

    it("detects uncertainty markers", () => {
      const result = estimateAnthropicConfidence(uncertainText);
      expect(result.overall_confidence).toBeLessThan(0.85);
    });
  });

  describe("edge cases — Anthropic", () => {
    it("handles empty string", () => {
      const result = estimateAnthropicConfidence("");
      expect(result.overall_confidence).toBeGreaterThan(0);
      expect(result.provider).toBe("anthropic");
      expect(result.logprobs_source).toBe("estimated");
    });

    it("handles very short text", () => {
      const result = estimateAnthropicConfidence("Yes.");
      expect(result.overall_confidence).toBeGreaterThan(0.8);
    });

    it("handles very long text without hedging", () => {
      const longText = "The Earth revolves around the Sun. ".repeat(100);
      const result = estimateAnthropicConfidence(longText);
      // Long text gets normalized by word count, "around" matches uncertainty pattern
      // so confidence drops; verify it stays above minimum
      expect(result.overall_confidence).toBeGreaterThanOrEqual(0.1);
      expect(result.overall_confidence).toBeLessThanOrEqual(1.0);
    });

    it("confidence never goes below 0.1", () => {
      // Text with maximum hedging/correction/uncertainty
      const maxUncertain = "I think probably maybe I'm not sure. Actually, let me reconsider. Wait, that's not right. I was wrong. Perhaps approximately roughly around estimated unclear uncertain hard to say. " .repeat(5);
      const result = estimateAnthropicConfidence(maxUncertain);
      expect(result.overall_confidence).toBeGreaterThanOrEqual(0.1);
    });

    it("confidence never exceeds 1.0", () => {
      const result = estimateAnthropicConfidence("The answer is 42.");
      expect(result.overall_confidence).toBeLessThanOrEqual(1.0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// TESTS: Cross-Provider Consistency
// ═══════════════════════════════════════════════════════════════

describe("Confidence Analysis — Cross-Provider Consistency", () => {
  it("all providers return the same ConfidenceAnalysis shape", () => {
    const openai = computeConfidenceAnalysis(createOpenAIHighConfidenceLogprobs(), "openai");
    const gemini = computeConfidenceAnalysis(createGeminiHighConfidenceLogprobs(), "google");
    const anthropic = estimateAnthropicConfidence("The capital of France is Paris.");

    const expectedKeys: (keyof ConfidenceAnalysis)[] = [
      "overall_confidence",
      "hallucination_risk_score",
      "confidence_stability",
      "total_tokens",
      "high_confidence_tokens",
      "low_confidence_tokens",
      "hallucination_candidates",
      "decision_points",
      "per_token",
      "provider",
      "logprobs_source",
    ];

    for (const key of expectedKeys) {
      expect(openai).toHaveProperty(key);
      expect(gemini).toHaveProperty(key);
      expect(anthropic).toHaveProperty(key);
    }
  });

  it("OpenAI and Gemini both use native logprobs_source", () => {
    const openai = computeConfidenceAnalysis(createOpenAIHighConfidenceLogprobs(), "openai");
    const gemini = computeConfidenceAnalysis(createGeminiHighConfidenceLogprobs(), "google");
    expect(openai.logprobs_source).toBe("native");
    expect(gemini.logprobs_source).toBe("native");
  });

  it("Anthropic uses estimated logprobs_source", () => {
    const anthropic = estimateAnthropicConfidence("Test text");
    expect(anthropic.logprobs_source).toBe("estimated");
  });

  it("high confidence text produces similar overall_confidence across OpenAI and Gemini", () => {
    const openai = computeConfidenceAnalysis(createOpenAIHighConfidenceLogprobs(), "openai");
    const gemini = computeConfidenceAnalysis(createGeminiHighConfidenceLogprobs(), "google");
    // Both should be > 0.9 for high-confidence responses
    expect(openai.overall_confidence).toBeGreaterThan(0.9);
    expect(gemini.overall_confidence).toBeGreaterThan(0.9);
  });

  it("mixed confidence text produces hallucination candidates for both OpenAI and Gemini", () => {
    const openai = computeConfidenceAnalysis(createOpenAIMixedConfidenceLogprobs(), "openai");
    const gemini = computeConfidenceAnalysis(createGeminiMixedConfidenceLogprobs(), "google");
    expect(openai.hallucination_candidates.length).toBeGreaterThanOrEqual(1);
    expect(gemini.hallucination_candidates.length).toBeGreaterThanOrEqual(1);
  });

  it("all numeric fields are properly rounded to 4 decimal places", () => {
    const result = computeConfidenceAnalysis(createOpenAIHighConfidenceLogprobs(), "openai");
    // Check that values are rounded (no floating point noise beyond 4 decimals)
    const checkRounded = (val: number) => {
      const rounded = Math.round(val * 10000) / 10000;
      expect(val).toBe(rounded);
    };
    checkRounded(result.overall_confidence);
    checkRounded(result.hallucination_risk_score);
    checkRounded(result.confidence_stability);
    for (const t of result.per_token) {
      checkRounded(t.confidence);
      checkRounded(t.entropy);
      checkRounded(t.margin);
    }
  });
});
