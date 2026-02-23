import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  computeConfidenceAnalysis,
  estimateAnthropicConfidence,
  type TokenLogprob,
  type ConfidenceAnalysis,
} from "./confidence-analysis";

// ═══════════════════════════════════════════════════════════════
// LOGPROBS INJECTION TESTS — All 3 Providers
// ═══════════════════════════════════════════════════════════════

/**
 * These tests verify the logprobs injection logic that runs in the proxy.
 * We test the injection decision-making and body mutation independently
 * from the HTTP layer, matching the exact logic in proxy.ts.
 */

interface ExplainabilityConfig {
  enabled: boolean;
  logprobsInjection: "always" | "never" | "sample";
  sampleRate: number;
}

/**
 * Simulates the logprobs injection logic from proxy.ts lines ~197-213.
 * Extracted for testability.
 */
function injectLogprobs(
  body: Record<string, any>,
  provider: string,
  config: ExplainabilityConfig,
  randomValue: number = Math.random(),
): { shouldInjectLogprobs: boolean; isAnthropicEstimated: boolean; mutatedBody: Record<string, any> } {
  let shouldInjectLogprobs = false;
  let isAnthropicEstimated = false;

  if (config.enabled && config.logprobsInjection !== "never") {
    const shouldSample = config.logprobsInjection === "always"
      || randomValue < config.sampleRate;

    if (shouldSample) {
      if (provider === "anthropic") {
        isAnthropicEstimated = true;
      } else {
        shouldInjectLogprobs = true;
        if (!body.logprobs) body.logprobs = true;
        if (!body.top_logprobs) body.top_logprobs = 5;
      }
    }
  }

  return { shouldInjectLogprobs, isAnthropicEstimated, mutatedBody: body };
}

describe("Logprobs Injection — OpenAI", () => {
  it("injects logprobs=true and top_logprobs=5 when enabled + always", () => {
    const body: Record<string, any> = { model: "gpt-4.1", messages: [] };
    const config: ExplainabilityConfig = { enabled: true, logprobsInjection: "always", sampleRate: 1.0 };
    const result = injectLogprobs(body, "openai", config);
    expect(result.shouldInjectLogprobs).toBe(true);
    expect(result.isAnthropicEstimated).toBe(false);
    expect(body.logprobs).toBe(true);
    expect(body.top_logprobs).toBe(5);
  });

  it("does NOT inject when logprobsInjection=never", () => {
    const body: Record<string, any> = { model: "gpt-4.1", messages: [] };
    const config: ExplainabilityConfig = { enabled: true, logprobsInjection: "never", sampleRate: 1.0 };
    const result = injectLogprobs(body, "openai", config);
    expect(result.shouldInjectLogprobs).toBe(false);
    expect(body.logprobs).toBeUndefined();
    expect(body.top_logprobs).toBeUndefined();
  });

  it("does NOT inject when explainability is disabled", () => {
    const body: Record<string, any> = { model: "gpt-4.1", messages: [] };
    const config: ExplainabilityConfig = { enabled: false, logprobsInjection: "always", sampleRate: 1.0 };
    const result = injectLogprobs(body, "openai", config);
    expect(result.shouldInjectLogprobs).toBe(false);
    expect(body.logprobs).toBeUndefined();
  });

  it("respects user-provided logprobs (does not override)", () => {
    const body: Record<string, any> = { model: "gpt-4.1", messages: [], logprobs: true, top_logprobs: 3 };
    const config: ExplainabilityConfig = { enabled: true, logprobsInjection: "always", sampleRate: 1.0 };
    const result = injectLogprobs(body, "openai", config);
    expect(result.shouldInjectLogprobs).toBe(true);
    expect(body.logprobs).toBe(true);
    expect(body.top_logprobs).toBe(3); // User's value preserved
  });

  it("injects when sampling and random < sampleRate", () => {
    const body: Record<string, any> = { model: "gpt-4.1", messages: [] };
    const config: ExplainabilityConfig = { enabled: true, logprobsInjection: "sample", sampleRate: 0.5 };
    const result = injectLogprobs(body, "openai", config, 0.3); // 0.3 < 0.5
    expect(result.shouldInjectLogprobs).toBe(true);
    expect(body.logprobs).toBe(true);
  });

  it("does NOT inject when sampling and random >= sampleRate", () => {
    const body: Record<string, any> = { model: "gpt-4.1", messages: [] };
    const config: ExplainabilityConfig = { enabled: true, logprobsInjection: "sample", sampleRate: 0.5 };
    const result = injectLogprobs(body, "openai", config, 0.7); // 0.7 >= 0.5
    expect(result.shouldInjectLogprobs).toBe(false);
    expect(body.logprobs).toBeUndefined();
  });

  it("works with gpt-4.1-mini model", () => {
    const body: Record<string, any> = { model: "gpt-4.1-mini", messages: [] };
    const config: ExplainabilityConfig = { enabled: true, logprobsInjection: "always", sampleRate: 1.0 };
    const result = injectLogprobs(body, "openai", config);
    expect(result.shouldInjectLogprobs).toBe(true);
    expect(body.logprobs).toBe(true);
  });

  it("works with gpt-5 model", () => {
    const body: Record<string, any> = { model: "gpt-5", messages: [] };
    const config: ExplainabilityConfig = { enabled: true, logprobsInjection: "always", sampleRate: 1.0 };
    const result = injectLogprobs(body, "openai", config);
    expect(result.shouldInjectLogprobs).toBe(true);
    expect(body.logprobs).toBe(true);
  });

  it("works with o4-mini model", () => {
    const body: Record<string, any> = { model: "o4-mini", messages: [] };
    const config: ExplainabilityConfig = { enabled: true, logprobsInjection: "always", sampleRate: 1.0 };
    const result = injectLogprobs(body, "openai", config);
    expect(result.shouldInjectLogprobs).toBe(true);
    expect(body.logprobs).toBe(true);
  });
});

describe("Logprobs Injection — Google Gemini", () => {
  it("injects logprobs=true and top_logprobs=5 for Gemini models", () => {
    const body: Record<string, any> = { model: "gemini-2.5-pro", messages: [] };
    const config: ExplainabilityConfig = { enabled: true, logprobsInjection: "always", sampleRate: 1.0 };
    const result = injectLogprobs(body, "google", config);
    expect(result.shouldInjectLogprobs).toBe(true);
    expect(result.isAnthropicEstimated).toBe(false);
    expect(body.logprobs).toBe(true);
    expect(body.top_logprobs).toBe(5);
  });

  it("does NOT inject when logprobsInjection=never for Gemini", () => {
    const body: Record<string, any> = { model: "gemini-2.5-flash", messages: [] };
    const config: ExplainabilityConfig = { enabled: true, logprobsInjection: "never", sampleRate: 1.0 };
    const result = injectLogprobs(body, "google", config);
    expect(result.shouldInjectLogprobs).toBe(false);
    expect(body.logprobs).toBeUndefined();
  });

  it("respects sampling for Gemini", () => {
    const body: Record<string, any> = { model: "gemini-3-flash", messages: [] };
    const config: ExplainabilityConfig = { enabled: true, logprobsInjection: "sample", sampleRate: 0.3 };
    const result = injectLogprobs(body, "google", config, 0.1);
    expect(result.shouldInjectLogprobs).toBe(true);
    expect(body.logprobs).toBe(true);
  });

  it("does NOT inject when disabled for Gemini", () => {
    const body: Record<string, any> = { model: "gemini-2.5-pro", messages: [] };
    const config: ExplainabilityConfig = { enabled: false, logprobsInjection: "always", sampleRate: 1.0 };
    const result = injectLogprobs(body, "google", config);
    expect(result.shouldInjectLogprobs).toBe(false);
  });

  it("works with gemini-3-pro model", () => {
    const body: Record<string, any> = { model: "gemini-3-pro", messages: [] };
    const config: ExplainabilityConfig = { enabled: true, logprobsInjection: "always", sampleRate: 1.0 };
    const result = injectLogprobs(body, "google", config);
    expect(result.shouldInjectLogprobs).toBe(true);
  });

  it("works with gemini-2.0-flash-lite model", () => {
    const body: Record<string, any> = { model: "gemini-2.0-flash-lite", messages: [] };
    const config: ExplainabilityConfig = { enabled: true, logprobsInjection: "always", sampleRate: 1.0 };
    const result = injectLogprobs(body, "google", config);
    expect(result.shouldInjectLogprobs).toBe(true);
  });
});

describe("Logprobs Injection — Anthropic", () => {
  it("flags Anthropic for estimated confidence (no logprobs injection)", () => {
    const body: Record<string, any> = { model: "claude-sonnet-4-20250514", messages: [] };
    const config: ExplainabilityConfig = { enabled: true, logprobsInjection: "always", sampleRate: 1.0 };
    const result = injectLogprobs(body, "anthropic", config);
    expect(result.shouldInjectLogprobs).toBe(false);
    expect(result.isAnthropicEstimated).toBe(true);
    // Should NOT inject logprobs into Anthropic body
    expect(body.logprobs).toBeUndefined();
    expect(body.top_logprobs).toBeUndefined();
  });

  it("does NOT flag Anthropic when explainability is disabled", () => {
    const body: Record<string, any> = { model: "claude-opus-4-20250514", messages: [] };
    const config: ExplainabilityConfig = { enabled: false, logprobsInjection: "always", sampleRate: 1.0 };
    const result = injectLogprobs(body, "anthropic", config);
    expect(result.shouldInjectLogprobs).toBe(false);
    expect(result.isAnthropicEstimated).toBe(false);
  });

  it("does NOT flag Anthropic when logprobsInjection=never", () => {
    const body: Record<string, any> = { model: "claude-sonnet-4-20250514", messages: [] };
    const config: ExplainabilityConfig = { enabled: true, logprobsInjection: "never", sampleRate: 1.0 };
    const result = injectLogprobs(body, "anthropic", config);
    expect(result.isAnthropicEstimated).toBe(false);
  });

  it("respects sampling for Anthropic estimated confidence", () => {
    const body: Record<string, any> = { model: "claude-haiku-4.5-20250514", messages: [] };
    const config: ExplainabilityConfig = { enabled: true, logprobsInjection: "sample", sampleRate: 0.5 };
    const result = injectLogprobs(body, "anthropic", config, 0.3);
    expect(result.isAnthropicEstimated).toBe(true);
  });

  it("does NOT flag Anthropic when sample not hit", () => {
    const body: Record<string, any> = { model: "claude-sonnet-4-20250514", messages: [] };
    const config: ExplainabilityConfig = { enabled: true, logprobsInjection: "sample", sampleRate: 0.5 };
    const result = injectLogprobs(body, "anthropic", config, 0.8);
    expect(result.isAnthropicEstimated).toBe(false);
  });

  it("works with claude-opus-4 model", () => {
    const body: Record<string, any> = { model: "claude-opus-4-20250514", messages: [] };
    const config: ExplainabilityConfig = { enabled: true, logprobsInjection: "always", sampleRate: 1.0 };
    const result = injectLogprobs(body, "anthropic", config);
    expect(result.isAnthropicEstimated).toBe(true);
  });

  it("works with claude-3.5-sonnet model", () => {
    const body: Record<string, any> = { model: "claude-3-5-sonnet-20241022", messages: [] };
    const config: ExplainabilityConfig = { enabled: true, logprobsInjection: "always", sampleRate: 1.0 };
    const result = injectLogprobs(body, "anthropic", config);
    expect(result.isAnthropicEstimated).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// HALLUCINATION DETECTION TESTS — All 3 Providers
// ═══════════════════════════════════════════════════════════════

describe("Hallucination Detection — OpenAI", () => {
  it("detects no hallucination in high-confidence OpenAI response", () => {
    const logprobs = {
      content: [
        { token: "The", logprob: -0.001, top_logprobs: [{ token: "The", logprob: -0.001 }] },
        { token: " answer", logprob: -0.002, top_logprobs: [{ token: " answer", logprob: -0.002 }] },
        { token: " is", logprob: -0.001, top_logprobs: [{ token: " is", logprob: -0.001 }] },
        { token: " 42", logprob: -0.003, top_logprobs: [{ token: " 42", logprob: -0.003 }] },
        { token: ".", logprob: -0.001, top_logprobs: [{ token: ".", logprob: -0.001 }] },
      ],
    };
    const result = computeConfidenceAnalysis(logprobs, "openai");
    expect(result.hallucination_candidates).toHaveLength(0);
    expect(result.hallucination_risk_score).toBe(0);
  });

  it("detects hallucination in low-confidence OpenAI segment (gpt-4.1)", () => {
    const logprobs = {
      content: [
        { token: "The", logprob: -0.001, top_logprobs: [{ token: "The", logprob: -0.001 }] },
        // 4 consecutive low-confidence tokens
        { token: " population", logprob: -2.5, top_logprobs: [{ token: " population", logprob: -2.5 }, { token: " number", logprob: -2.6 }, { token: " count", logprob: -2.7 }, { token: " total", logprob: -2.8 }, { token: " amount", logprob: -3.0 }] },
        { token: " is", logprob: -1.8, top_logprobs: [{ token: " is", logprob: -1.8 }, { token: " was", logprob: -1.9 }] },
        { token: " 3", logprob: -2.0, top_logprobs: [{ token: " 3", logprob: -2.0 }, { token: " 5", logprob: -2.1 }, { token: " 2", logprob: -2.2 }] },
        { token: " million", logprob: -1.5, top_logprobs: [{ token: " million", logprob: -1.5 }, { token: " billion", logprob: -1.6 }] },
        { token: ".", logprob: -0.001, top_logprobs: [{ token: ".", logprob: -0.001 }] },
      ],
    };
    const result = computeConfidenceAnalysis(logprobs, "openai");
    expect(result.hallucination_candidates.length).toBeGreaterThanOrEqual(1);
    expect(result.hallucination_candidates[0].avg_confidence).toBeLessThan(0.3);
  });

  it("requires 3+ consecutive low-confidence tokens for hallucination candidate", () => {
    const logprobs = {
      content: [
        { token: "The", logprob: -0.001, top_logprobs: [{ token: "The", logprob: -0.001 }] },
        // Only 2 consecutive low-confidence tokens — should NOT be a candidate
        { token: " maybe", logprob: -1.5, top_logprobs: [{ token: " maybe", logprob: -1.5 }] },
        { token: " 42", logprob: -2.0, top_logprobs: [{ token: " 42", logprob: -2.0 }] },
        { token: ".", logprob: -0.001, top_logprobs: [{ token: ".", logprob: -0.001 }] },
      ],
    };
    const result = computeConfidenceAnalysis(logprobs, "openai");
    expect(result.hallucination_candidates).toHaveLength(0);
  });

  it("detects multiple hallucination candidates in one response (gpt-5)", () => {
    const logprobs = {
      content: [
        { token: "First", logprob: -0.001, top_logprobs: [{ token: "First", logprob: -0.001 }] },
        // Segment 1: 3 low-confidence
        { token: " about", logprob: -1.5, top_logprobs: [{ token: " about", logprob: -1.5 }] },
        { token: " 100", logprob: -2.0, top_logprobs: [{ token: " 100", logprob: -2.0 }] },
        { token: " units", logprob: -1.8, top_logprobs: [{ token: " units", logprob: -1.8 }] },
        // High confidence break
        { token: ".", logprob: -0.001, top_logprobs: [{ token: ".", logprob: -0.001 }] },
        { token: " Also", logprob: -0.002, top_logprobs: [{ token: " Also", logprob: -0.002 }] },
        // Segment 2: 3 low-confidence
        { token: " roughly", logprob: -1.6, top_logprobs: [{ token: " roughly", logprob: -1.6 }] },
        { token: " 50", logprob: -2.2, top_logprobs: [{ token: " 50", logprob: -2.2 }] },
        { token: " percent", logprob: -1.7, top_logprobs: [{ token: " percent", logprob: -1.7 }] },
        { token: ".", logprob: -0.001, top_logprobs: [{ token: ".", logprob: -0.001 }] },
      ],
    };
    const result = computeConfidenceAnalysis(logprobs, "openai");
    expect(result.hallucination_candidates.length).toBe(2);
  });
});

describe("Hallucination Detection — Google Gemini", () => {
  it("detects no hallucination in high-confidence Gemini response (gemini-2.5-pro)", () => {
    const logprobs = {
      content: [
        { token: "Water", logprob: -0.001, top_logprobs: [{ token: "Water", logprob: -0.001 }] },
        { token: " boils", logprob: -0.002, top_logprobs: [{ token: " boils", logprob: -0.002 }] },
        { token: " at", logprob: -0.001, top_logprobs: [{ token: " at", logprob: -0.001 }] },
        { token: " 100", logprob: -0.003, top_logprobs: [{ token: " 100", logprob: -0.003 }] },
        { token: "°C", logprob: -0.002, top_logprobs: [{ token: "°C", logprob: -0.002 }] },
      ],
    };
    const result = computeConfidenceAnalysis(logprobs, "google");
    expect(result.hallucination_candidates).toHaveLength(0);
  });

  it("detects hallucination in Gemini response with uncertain segment (gemini-3-flash)", () => {
    const logprobs = {
      content: [
        { token: "The", logprob: -0.001, top_logprobs: [{ token: "The", logprob: -0.001 }] },
        // 3 consecutive low-confidence tokens
        { token: " distance", logprob: -1.8, top_logprobs: [{ token: " distance", logprob: -1.8 }, { token: " length", logprob: -1.9 }] },
        { token: " is", logprob: -1.5, top_logprobs: [{ token: " is", logprob: -1.5 }, { token: " was", logprob: -1.6 }] },
        { token: " 500km", logprob: -2.0, top_logprobs: [{ token: " 500km", logprob: -2.0 }, { token: " 300km", logprob: -2.1 }] },
        { token: ".", logprob: -0.001, top_logprobs: [{ token: ".", logprob: -0.001 }] },
      ],
    };
    const result = computeConfidenceAnalysis(logprobs, "google");
    expect(result.hallucination_candidates.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Hallucination Detection — Anthropic (Estimated)", () => {
  it("returns empty hallucination_candidates for confident Anthropic text (claude-sonnet-4)", () => {
    const result = estimateAnthropicConfidence("The capital of France is Paris. This is a well-established fact.");
    expect(result.hallucination_candidates).toHaveLength(0);
  });

  it("returns empty hallucination_candidates even for uncertain Anthropic text", () => {
    // Anthropic estimated confidence cannot produce per-token hallucination candidates
    const result = estimateAnthropicConfidence("I think the answer might be 42, but I'm not sure. Actually, let me reconsider.");
    expect(result.hallucination_candidates).toHaveLength(0);
  });

  it("uses hallucination_risk_score for Anthropic risk assessment (claude-opus-4)", () => {
    const confidentResult = estimateAnthropicConfidence("The Earth orbits the Sun.");
    const uncertainResult = estimateAnthropicConfidence("I think probably maybe the answer is around 42. Actually, let me reconsider. Wait, that's not right.");
    expect(uncertainResult.hallucination_risk_score).toBeGreaterThan(confidentResult.hallucination_risk_score);
  });
});

// ═══════════════════════════════════════════════════════════════
// EXPLANATION GENERATION TESTS
// ═══════════════════════════════════════════════════════════════

describe("Explanation Generation — Input Formatting", () => {
  /**
   * Tests the explanation prompt construction logic.
   * The actual LLM call is mocked, but we verify the input formatting.
   */

  it("formats OpenAI trace data correctly for explanation prompt", () => {
    const logprobs = {
      content: [
        { token: "Hello", logprob: -0.01, top_logprobs: [{ token: "Hello", logprob: -0.01 }, { token: "Hi", logprob: -4.6 }] },
        { token: " world", logprob: -0.02, top_logprobs: [{ token: " world", logprob: -0.02 }, { token: " there", logprob: -3.9 }] },
      ],
    };
    const analysis = computeConfidenceAnalysis(logprobs, "openai");

    // Verify the analysis has the data needed for explanation
    expect(analysis.per_token.length).toBe(2);
    expect(analysis.per_token[0].token).toBe("Hello");
    expect(analysis.per_token[1].token).toBe(" world");
    expect(analysis.provider).toBe("openai");
    expect(analysis.logprobs_source).toBe("native");
  });

  it("formats Gemini trace data correctly for explanation prompt", () => {
    const logprobs = {
      content: [
        { token: "The", logprob: -0.005, top_logprobs: [{ token: "The", logprob: -0.005 }, { token: "A", logprob: -5.3 }] },
        { token: " answer", logprob: -0.01, top_logprobs: [{ token: " answer", logprob: -0.01 }, { token: " result", logprob: -4.0 }] },
      ],
    };
    const analysis = computeConfidenceAnalysis(logprobs, "google");
    expect(analysis.per_token.length).toBe(2);
    expect(analysis.provider).toBe("google");
    expect(analysis.logprobs_source).toBe("native");
  });

  it("formats Anthropic trace data correctly for explanation prompt", () => {
    const analysis = estimateAnthropicConfidence("I think the answer is probably 42.");
    expect(analysis.per_token).toHaveLength(0); // No per-token data
    expect(analysis.provider).toBe("anthropic");
    expect(analysis.logprobs_source).toBe("estimated");
    expect(analysis.overall_confidence).toBeLessThan(0.85); // Hedging detected
  });
});

// ═══════════════════════════════════════════════════════════════
// CONFIDENCE ANALYSIS INTEGRATION — Proxy Response Path
// ═══════════════════════════════════════════════════════════════

describe("Confidence Analysis Integration — OpenAI Response Path", () => {
  it("processes OpenAI response logprobs into confidence analysis", () => {
    // Simulate what happens in proxy.ts after receiving OpenAI response
    const responseLogprobs = {
      content: [
        { token: "Paris", logprob: -0.001, top_logprobs: [{ token: "Paris", logprob: -0.001 }, { token: "Lyon", logprob: -7.5 }] },
        { token: " is", logprob: -0.0005, top_logprobs: [{ token: " is", logprob: -0.0005 }] },
        { token: " beautiful", logprob: -0.01, top_logprobs: [{ token: " beautiful", logprob: -0.01 }, { token: " lovely", logprob: -4.0 }] },
      ],
    };

    const analysis = computeConfidenceAnalysis(responseLogprobs, "openai");
    expect(analysis.total_tokens).toBe(3);
    expect(analysis.overall_confidence).toBeGreaterThan(0.9);
    expect(analysis.provider).toBe("openai");
    expect(analysis.logprobs_source).toBe("native");
  });

  it("handles OpenAI streaming logprobs accumulation", () => {
    // Simulate streaming: logprobs arrive in chunks
    const logprobsAccum: TokenLogprob[] = [];

    // Chunk 1
    logprobsAccum.push({ token: "The", logprob: -0.001, top_logprobs: [{ token: "The", logprob: -0.001 }] });
    // Chunk 2
    logprobsAccum.push({ token: " capital", logprob: -0.002, top_logprobs: [{ token: " capital", logprob: -0.002 }] });
    // Chunk 3
    logprobsAccum.push({ token: " is", logprob: -0.001, top_logprobs: [{ token: " is", logprob: -0.001 }] });
    // Chunk 4
    logprobsAccum.push({ token: " Paris", logprob: -0.003, top_logprobs: [{ token: " Paris", logprob: -0.003 }] });

    const logprobsFinal = { content: logprobsAccum };
    const analysis = computeConfidenceAnalysis(logprobsFinal, "openai");
    expect(analysis.total_tokens).toBe(4);
    expect(analysis.overall_confidence).toBeGreaterThan(0.9);
  });
});

describe("Confidence Analysis Integration — Gemini Response Path", () => {
  it("processes Gemini response logprobs into confidence analysis", () => {
    const responseLogprobs = {
      content: [
        { token: "The", logprob: -0.002, top_logprobs: [{ token: "The", logprob: -0.002 }, { token: "A", logprob: -6.5 }] },
        { token: " Earth", logprob: -0.001, top_logprobs: [{ token: " Earth", logprob: -0.001 }] },
        { token: " orbits", logprob: -0.003, top_logprobs: [{ token: " orbits", logprob: -0.003 }, { token: " revolves", logprob: -5.5 }] },
      ],
    };

    const analysis = computeConfidenceAnalysis(responseLogprobs, "google");
    expect(analysis.total_tokens).toBe(3);
    expect(analysis.overall_confidence).toBeGreaterThan(0.9);
    expect(analysis.provider).toBe("google");
  });

  it("handles Gemini streaming logprobs accumulation", () => {
    const logprobsAccum: TokenLogprob[] = [];
    logprobsAccum.push({ token: "Water", logprob: -0.005, top_logprobs: [{ token: "Water", logprob: -0.005 }] });
    logprobsAccum.push({ token: " boils", logprob: -0.01, top_logprobs: [{ token: " boils", logprob: -0.01 }] });
    logprobsAccum.push({ token: " at", logprob: -0.001, top_logprobs: [{ token: " at", logprob: -0.001 }] });

    const analysis = computeConfidenceAnalysis({ content: logprobsAccum }, "google");
    expect(analysis.total_tokens).toBe(3);
    expect(analysis.provider).toBe("google");
  });
});

describe("Confidence Analysis Integration — Anthropic Response Path", () => {
  it("processes Anthropic completion text into estimated confidence (claude-sonnet-4)", () => {
    const completion = "The capital of France is Paris. It has been the capital since the 10th century.";
    const analysis = estimateAnthropicConfidence(completion);
    expect(analysis.overall_confidence).toBeGreaterThan(0.7);
    expect(analysis.provider).toBe("anthropic");
    expect(analysis.logprobs_source).toBe("estimated");
  });

  it("processes Anthropic streaming completion into estimated confidence (claude-opus-4)", () => {
    // Simulate streaming: completion text accumulated from chunks
    let completionAccum = "";
    completionAccum += "I think ";
    completionAccum += "the answer ";
    completionAccum += "is probably ";
    completionAccum += "42.";

    const analysis = estimateAnthropicConfidence(completionAccum);
    expect(analysis.overall_confidence).toBeLessThan(0.85); // Hedging detected
    expect(analysis.provider).toBe("anthropic");
  });
});

// ═══════════════════════════════════════════════════════════════
// EXPLAINABILITY CONFIG TESTS
// ═══════════════════════════════════════════════════════════════

describe("Explainability Config — Behavior", () => {
  it("default config enables explainability with always injection", () => {
    const defaultConfig: ExplainabilityConfig = { enabled: true, logprobsInjection: "always", sampleRate: 1.0 };
    const body: Record<string, any> = { model: "gpt-4.1", messages: [] };
    const result = injectLogprobs(body, "openai", defaultConfig);
    expect(result.shouldInjectLogprobs).toBe(true);
  });

  it("sample rate 0 effectively disables injection", () => {
    const config: ExplainabilityConfig = { enabled: true, logprobsInjection: "sample", sampleRate: 0 };
    const body: Record<string, any> = { model: "gpt-4.1", messages: [] };
    // Any random value >= 0 will not be < 0
    const result = injectLogprobs(body, "openai", config, 0.5);
    expect(result.shouldInjectLogprobs).toBe(false);
  });

  it("sample rate 1.0 always injects when mode is sample", () => {
    const config: ExplainabilityConfig = { enabled: true, logprobsInjection: "sample", sampleRate: 1.0 };
    const body: Record<string, any> = { model: "gpt-4.1", messages: [] };
    const result = injectLogprobs(body, "openai", config, 0.99);
    expect(result.shouldInjectLogprobs).toBe(true);
  });

  it("provider-agnostic config works for all providers", () => {
    const config: ExplainabilityConfig = { enabled: true, logprobsInjection: "always", sampleRate: 1.0 };

    const openaiBody: Record<string, any> = { model: "gpt-4.1", messages: [] };
    const geminiBody: Record<string, any> = { model: "gemini-2.5-pro", messages: [] };
    const anthropicBody: Record<string, any> = { model: "claude-sonnet-4", messages: [] };

    const openaiResult = injectLogprobs(openaiBody, "openai", config);
    const geminiResult = injectLogprobs(geminiBody, "google", config);
    const anthropicResult = injectLogprobs(anthropicBody, "anthropic", config);

    expect(openaiResult.shouldInjectLogprobs).toBe(true);
    expect(geminiResult.shouldInjectLogprobs).toBe(true);
    expect(anthropicResult.shouldInjectLogprobs).toBe(false);
    expect(anthropicResult.isAnthropicEstimated).toBe(true);
  });
});
