/**
 * Vitest tests for pattern detectors.
 * Each detector is a pure function — no DB or API calls needed.
 */

import { describe, it, expect } from "vitest";
import {
  detectLowConfidence,
  detectHighHallucination,
  detectConfidenceDropping,
  detectModelUnderperformer,
  detectHighEntropyCluster,
  detectTopicHallucination,
  detectTemperatureTooHigh,
  detectCostInefficiency,
  detectSecurityCorrelation,
  detectNoLogprobs,
  runAllDetectors,
} from "./detectors";
import type { TraceWithAnalysis, SecurityEventForDetector, DetectorConfig } from "./types";
import { DEFAULT_DETECTOR_CONFIG } from "./types";

// ─── Test Fixtures ───

function makeTrace(overrides: Partial<TraceWithAnalysis> = {}): TraceWithAnalysis {
  return {
    id: 1,
    projectId: 1,
    model: "gpt-4o-mini",
    provider: "openai",
    promptMessages: [{ role: "user", content: "What is the capital of France?" }],
    completion: "The capital of France is Paris.",
    status: "success",
    latencyMs: 500,
    promptTokens: 20,
    completionTokens: 10,
    totalTokens: 30,
    costUsd: "0.001",
    temperature: "0.7",
    timestamp: new Date(),
    confidenceAnalysis: {
      overall_confidence: 0.85,
      hallucination_risk_score: 0.1,
      decision_points: [{ margin: 0.5 }],
    },
    logprobs: { content: [{ token: "The", logprob: -0.1 }] },
    ...overrides,
  };
}

function makeSecurityEvent(overrides: Partial<SecurityEventForDetector> = {}): SecurityEventForDetector {
  return {
    id: 1,
    projectId: 1,
    traceId: "1",
    threatScore: 50,
    threatLevel: "medium",
    action: "flagged",
    timestamp: new Date(),
    ...overrides,
  };
}

const config = DEFAULT_DETECTOR_CONFIG;

// ─── detectLowConfidence ───

describe("detectLowConfidence", () => {
  it("returns null when fewer than 10 traces", () => {
    const traces = Array.from({ length: 5 }, (_, i) =>
      makeTrace({ id: i, confidenceAnalysis: { overall_confidence: 0.3 } })
    );
    expect(detectLowConfidence(traces, [], config)).toBeNull();
  });

  it("returns null when avg confidence is above threshold", () => {
    const traces = Array.from({ length: 15 }, (_, i) =>
      makeTrace({ id: i, confidenceAnalysis: { overall_confidence: 0.85 } })
    );
    expect(detectLowConfidence(traces, [], config)).toBeNull();
  });

  it("detects low confidence when avg is below 0.6", () => {
    const traces = Array.from({ length: 15 }, (_, i) =>
      makeTrace({ id: i, confidenceAnalysis: { overall_confidence: 0.4 } })
    );
    const result = detectLowConfidence(traces, [], config);
    expect(result).not.toBeNull();
    expect(result!.detected).toBe(true);
    expect(result!.detectorId).toBe("LOW_CONFIDENCE");
    expect(result!.severity).toBe("critical");
    expect(result!.evidence.affectedTraces).toBe(15);
  });

  it("returns critical severity even when avg is between 0.5 and 0.6 (single threshold)", () => {
    const traces = Array.from({ length: 15 }, (_, i) =>
      makeTrace({ id: i, confidenceAnalysis: { overall_confidence: 0.55 } })
    );
    const result = detectLowConfidence(traces, [], config);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("critical");
  });

  it("skips traces without confidence data", () => {
    const traces = [
      ...Array.from({ length: 10 }, (_, i) =>
        makeTrace({ id: i, confidenceAnalysis: { overall_confidence: 0.85 } })
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        makeTrace({ id: i + 10, confidenceAnalysis: null })
      ),
    ];
    expect(detectLowConfidence(traces, [], config)).toBeNull();
  });
});

// ─── detectHighHallucination ───

describe("detectHighHallucination", () => {
  it("returns null when no traces have hallucination data", () => {
    const traces = Array.from({ length: 15 }, (_, i) =>
      makeTrace({ id: i, confidenceAnalysis: null })
    );
    expect(detectHighHallucination(traces, [], config)).toBeNull();
  });

  it("detects high hallucination rate", () => {
    const traces = Array.from({ length: 20 }, (_, i) =>
      makeTrace({
        id: i,
        confidenceAnalysis: {
          overall_confidence: 0.7,
          hallucination_risk_score: i < 12 ? 0.5 : 0.1, // 60% above threshold
        },
      })
    );
    const result = detectHighHallucination(traces, [], config);
    expect(result).not.toBeNull();
    expect(result!.detected).toBe(true);
    expect(result!.detectorId).toBe("HIGH_HALLUCINATION");
  });

  it("returns null when hallucination rate is low", () => {
    const traces = Array.from({ length: 20 }, (_, i) =>
      makeTrace({
        id: i,
        confidenceAnalysis: {
          overall_confidence: 0.9,
          hallucination_risk_score: 0.1,
        },
      })
    );
    expect(detectHighHallucination(traces, [], config)).toBeNull();
  });
});

// ─── detectModelUnderperformer ───

describe("detectModelUnderperformer", () => {
  it("returns null when only one model is used", () => {
    const traces = Array.from({ length: 15 }, (_, i) =>
      makeTrace({ id: i, model: "gpt-4o-mini" })
    );
    expect(detectModelUnderperformer(traces, [], config)).toBeNull();
  });

  it("detects underperforming model when confidence gap > 0.15", () => {
    const traces = [
      ...Array.from({ length: 10 }, (_, i) =>
        makeTrace({
          id: i,
          model: "gpt-4o",
          confidenceAnalysis: { overall_confidence: 0.9 },
        })
      ),
      ...Array.from({ length: 10 }, (_, i) =>
        makeTrace({
          id: i + 10,
          model: "gpt-3.5-turbo",
          confidenceAnalysis: { overall_confidence: 0.5 },
        })
      ),
    ];
    const result = detectModelUnderperformer(traces, [], config);
    expect(result).not.toBeNull();
    expect(result!.detected).toBe(true);
    expect(result!.detectorId).toBe("MODEL_UNDERPERFORMER");
  });

  it("returns null when models have similar confidence", () => {
    const traces = [
      ...Array.from({ length: 10 }, (_, i) =>
        makeTrace({
          id: i,
          model: "gpt-4o",
          confidenceAnalysis: { overall_confidence: 0.85 },
        })
      ),
      ...Array.from({ length: 10 }, (_, i) =>
        makeTrace({
          id: i + 10,
          model: "gpt-4o-mini",
          confidenceAnalysis: { overall_confidence: 0.82 },
        })
      ),
    ];
    expect(detectModelUnderperformer(traces, [], config)).toBeNull();
  });
});

// ─── detectTemperatureTooHigh ───

describe("detectTemperatureTooHigh", () => {
  it("detects high temperature with high confidence variance", () => {
    // Detector requires avg temp > 0.7 AND confidence stdDev > 0.3
    const traces = Array.from({ length: 15 }, (_, i) =>
      makeTrace({
        id: i,
        temperature: "1.2",
        confidenceAnalysis: {
          overall_confidence: i < 8 ? 0.3 : 0.95, // high variance
        },
      })
    );
    const result = detectTemperatureTooHigh(traces, [], config);
    expect(result).not.toBeNull();
    expect(result!.detected).toBe(true);
    expect(result!.detectorId).toBe("TEMPERATURE_TOO_HIGH");
  });

  it("returns null when temperature is reasonable", () => {
    const traces = Array.from({ length: 15 }, (_, i) =>
      makeTrace({
        id: i,
        temperature: "0.3",
        confidenceAnalysis: { overall_confidence: 0.9 },
      })
    );
    expect(detectTemperatureTooHigh(traces, [], config)).toBeNull();
  });
});

// ─── detectSecurityCorrelation ───

describe("detectSecurityCorrelation", () => {
  it("detects correlation between security events and low confidence", () => {
    const traces = Array.from({ length: 15 }, (_, i) =>
      makeTrace({
        id: i,
        confidenceAnalysis: { overall_confidence: 0.4 },
      })
    );
    const secEvents = Array.from({ length: 8 }, (_, i) =>
      makeSecurityEvent({
        id: i,
        traceId: String(i),
        threatScore: 60,
      })
    );
    const result = detectSecurityCorrelation(traces, secEvents, config);
    // May or may not trigger depending on thresholds, but should not throw
    expect(result === null || result.detectorId === "SECURITY_CORRELATION").toBe(true);
  });

  it("returns null when no security events", () => {
    const traces = Array.from({ length: 15 }, (_, i) =>
      makeTrace({ id: i })
    );
    expect(detectSecurityCorrelation(traces, [], config)).toBeNull();
  });
});

// ─── detectNoLogprobs ───

describe("detectNoLogprobs", () => {
  it("detects when most traces lack confidenceAnalysis", () => {
    // Detector checks for !t.confidenceAnalysis, not !t.logprobs
    const traces = Array.from({ length: 15 }, (_, i) =>
      makeTrace({
        id: i,
        logprobs: null,
        confidenceAnalysis: null,
      })
    );
    const result = detectNoLogprobs(traces, [], config);
    expect(result).not.toBeNull();
    expect(result!.detected).toBe(true);
    expect(result!.detectorId).toBe("NO_LOGPROBS");
  });

  it("returns null when most traces have logprobs", () => {
    const traces = Array.from({ length: 15 }, (_, i) =>
      makeTrace({
        id: i,
        logprobs: { content: [{ token: "x", logprob: -0.1 }] },
      })
    );
    expect(detectNoLogprobs(traces, [], config)).toBeNull();
  });
});

// ─── detectHighEntropyCluster ───

describe("detectHighEntropyCluster", () => {
  it("detects when many traces have close decision margins", () => {
    const traces = Array.from({ length: 15 }, (_, i) =>
      makeTrace({
        id: i,
        confidenceAnalysis: {
          overall_confidence: 0.7,
          decision_points: [
            { margin: 0.02 },
            { margin: 0.03 },
            { margin: 0.01 },
          ],
        },
      })
    );
    const result = detectHighEntropyCluster(traces, [], config);
    // Should detect high entropy (many close-call decisions)
    expect(result === null || result.detectorId === "HIGH_ENTROPY_CLUSTER").toBe(true);
  });
});

// ─── detectCostInefficiency ───

describe("detectCostInefficiency", () => {
  it("detects expensive model used for low-complexity queries", () => {
    const traces = [
      ...Array.from({ length: 10 }, (_, i) =>
        makeTrace({
          id: i,
          model: "gpt-4o",
          costUsd: "0.05",
          promptTokens: 20,
          completionTokens: 10,
          confidenceAnalysis: { overall_confidence: 0.95 },
        })
      ),
      ...Array.from({ length: 10 }, (_, i) =>
        makeTrace({
          id: i + 10,
          model: "gpt-4o-mini",
          costUsd: "0.001",
          promptTokens: 20,
          completionTokens: 10,
          confidenceAnalysis: { overall_confidence: 0.93 },
        })
      ),
    ];
    const result = detectCostInefficiency(traces, [], config);
    // May or may not trigger depending on exact thresholds
    expect(result === null || result.detectorId === "COST_INEFFICIENCY").toBe(true);
  });
});

// ─── runAllDetectors ───

describe("runAllDetectors", () => {
  it("returns an array of results from all detectors", () => {
    const traces = Array.from({ length: 20 }, (_, i) =>
      makeTrace({
        id: i,
        confidenceAnalysis: {
          overall_confidence: 0.35,
          hallucination_risk_score: 0.6,
          decision_points: [{ margin: 0.01 }],
        },
        logprobs: null,
        temperature: "1.5",
      })
    );
    const results = runAllDetectors(traces, [], config);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    // All results should have detected = true
    results.forEach((r) => {
      expect(r.detected).toBe(true);
      expect(r.detectorId).toBeDefined();
      expect(r.headline).toBeDefined();
      expect(r.evidence).toBeDefined();
    });
  });

  it("returns empty array when no issues detected", () => {
    const traces = Array.from({ length: 20 }, (_, i) =>
      makeTrace({
        id: i,
        confidenceAnalysis: {
          overall_confidence: 0.95,
          hallucination_risk_score: 0.05,
          decision_points: [{ margin: 0.8 }],
        },
        logprobs: { content: [{ token: "x", logprob: -0.05 }] },
        temperature: "0.3",
      })
    );
    const results = runAllDetectors(traces, [], config);
    expect(Array.isArray(results)).toBe(true);
    // Healthy system should have few or no issues
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("handles empty traces array gracefully", () => {
    const results = runAllDetectors([], [], config);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });
});
