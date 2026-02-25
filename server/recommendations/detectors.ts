/**
 * Pattern Detectors — Rule-based analysis of traces for known anti-patterns.
 *
 * Each detector is a pure function that takes traces + security events + config
 * and returns a DetectorResult if the pattern is detected, or null if not.
 *
 * Detectors run sequentially. Results are deduplicated by detectorId.
 */

import type {
  Detector,
  DetectorResult,
  DetectorConfig,
  TraceWithAnalysis,
  SecurityEventForDetector,
} from "./types";

// ─── Helpers ───

/** Extract overall confidence from the confidenceAnalysis JSON */
function getOverallConfidence(trace: TraceWithAnalysis): number | null {
  const ca = trace.confidenceAnalysis as any;
  if (!ca) return null;
  if (typeof ca.overall_confidence === "number") return ca.overall_confidence;
  if (typeof ca.estimated_confidence === "number") return ca.estimated_confidence;
  return null;
}

/** Extract hallucination risk score from confidenceAnalysis */
function getHallucinationRisk(trace: TraceWithAnalysis): number | null {
  const ca = trace.confidenceAnalysis as any;
  if (!ca) return null;
  if (typeof ca.hallucination_risk_score === "number") return ca.hallucination_risk_score;
  return null;
}

/** Extract decision points from confidenceAnalysis */
function getDecisionPoints(trace: TraceWithAnalysis): Array<{ margin: number }> {
  const ca = trace.confidenceAnalysis as any;
  if (!ca?.decision_points) return [];
  return ca.decision_points.filter((dp: any) => typeof dp.margin === "number");
}

/** Get the first user message from a trace (the prompt) */
function getPromptText(trace: TraceWithAnalysis): string {
  if (!trace.promptMessages) return "";
  const userMsg = trace.promptMessages.find((m) => m.role === "user");
  return userMsg?.content || "";
}

/** Simple keyword extraction: split, lowercase, remove stop words */
const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "dare", "ought",
  "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
  "as", "into", "through", "during", "before", "after", "above", "below",
  "between", "out", "off", "over", "under", "again", "further", "then",
  "once", "here", "there", "when", "where", "why", "how", "all", "each",
  "every", "both", "few", "more", "most", "other", "some", "such", "no",
  "nor", "not", "only", "own", "same", "so", "than", "too", "very",
  "just", "don", "now", "and", "but", "or", "if", "this", "that",
  "these", "those", "i", "me", "my", "we", "our", "you", "your",
  "he", "him", "his", "she", "her", "it", "its", "they", "them", "their",
  "what", "which", "who", "whom", "this", "that", "am", "about", "up",
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/** Sort traces by a metric (worst first) and return top N IDs */
function worstTraceIds(
  traces: TraceWithAnalysis[],
  scoreFn: (t: TraceWithAnalysis) => number | null,
  n: number = 5,
  ascending: boolean = true
): number[] {
  return traces
    .map((t) => ({ id: t.id, score: scoreFn(t) }))
    .filter((x) => x.score !== null)
    .sort((a, b) => (ascending ? a.score! - b.score! : b.score! - a.score!))
    .slice(0, n)
    .map((x) => x.id);
}

// ─── Detector 1: LOW_CONFIDENCE ───

export const detectLowConfidence: Detector = (traces, _secEvents, _config) => {
  const withConfidence = traces
    .map((t) => ({ trace: t, confidence: getOverallConfidence(t) }))
    .filter((x) => x.confidence !== null);

  if (withConfidence.length < _config.minTraces) return null;

  const avgConfidence =
    withConfidence.reduce((sum, x) => sum + x.confidence!, 0) / withConfidence.length;

  if (avgConfidence >= 0.6) return null;

  return {
    detected: true,
    severity: "critical",
    detectorId: "LOW_CONFIDENCE",
    headline: `Average model confidence is ${(avgConfidence * 100).toFixed(0)}% — well below the 60% threshold`,
    evidence: {
      metric: "avg_confidence",
      value: Math.round(avgConfidence * 1000) / 1000,
      threshold: 0.6,
      affectedTraces: withConfidence.filter((x) => x.confidence! < 0.6).length,
      totalTraces: traces.length,
      sampleTraceIds: worstTraceIds(traces, getOverallConfidence, 5, true),
    },
    recommendation:
      "Your model is frequently uncertain. Consider grounding with RAG or reducing temperature.",
  };
};

// ─── Detector 2: HIGH_HALLUCINATION ───

export const detectHighHallucination: Detector = (traces, _secEvents, config) => {
  const withRisk = traces
    .map((t) => ({ trace: t, risk: getHallucinationRisk(t) }))
    .filter((x) => x.risk !== null);

  if (withRisk.length < config.minTraces) return null;

  const highRiskTraces = withRisk.filter((x) => x.risk! > 0.3);
  const rate = highRiskTraces.length / withRisk.length;

  if (rate <= 0.15) return null;

  return {
    detected: true,
    severity: "critical",
    detectorId: "HIGH_HALLUCINATION",
    headline: `${(rate * 100).toFixed(0)}% of traces show hallucination risk — ${highRiskTraces.length} of ${withRisk.length} flagged`,
    evidence: {
      metric: "hallucination_rate",
      value: Math.round(rate * 1000) / 1000,
      threshold: 0.15,
      affectedTraces: highRiskTraces.length,
      totalTraces: traces.length,
      sampleTraceIds: worstTraceIds(traces, getHallucinationRisk, 5, false),
    },
    recommendation:
      "Significant hallucination risk detected. Review the flagged traces and add source grounding.",
  };
};

// ─── Detector 3: CONFIDENCE_DROPPING ───

export const detectConfidenceDropping: Detector = (traces, _secEvents, config) => {
  const withConfidence = traces
    .filter((t) => t.timestamp && getOverallConfidence(t) !== null)
    .sort((a, b) => (a.timestamp!.getTime() - b.timestamp!.getTime()));

  if (withConfidence.length < config.minTraces * 2) return null;

  const now = new Date();
  const lookbackMs = config.lookbackDays * 24 * 60 * 60 * 1000;
  const midpoint = new Date(now.getTime() - lookbackMs / 2);

  const olderTraces = withConfidence.filter((t) => t.timestamp! < midpoint);
  const newerTraces = withConfidence.filter((t) => t.timestamp! >= midpoint);

  if (olderTraces.length < 5 || newerTraces.length < 5) return null;

  const olderAvg =
    olderTraces.reduce((s, t) => s + getOverallConfidence(t)!, 0) / olderTraces.length;
  const newerAvg =
    newerTraces.reduce((s, t) => s + getOverallConfidence(t)!, 0) / newerTraces.length;

  const dropPct = ((olderAvg - newerAvg) / olderAvg) * 100;

  if (dropPct < 10) return null;

  return {
    detected: true,
    severity: "warning",
    detectorId: "CONFIDENCE_DROPPING",
    headline: `Confidence dropped ${dropPct.toFixed(0)}% over the last ${config.lookbackDays} days (${(olderAvg * 100).toFixed(0)}% → ${(newerAvg * 100).toFixed(0)}%)`,
    evidence: {
      metric: "confidence_trend",
      value: Math.round(dropPct * 10) / 10,
      threshold: 10,
      affectedTraces: newerTraces.length,
      totalTraces: traces.length,
      sampleTraceIds: worstTraceIds(newerTraces, getOverallConfidence, 5, true),
      details: { olderAvg, newerAvg, lookbackDays: config.lookbackDays },
    },
    recommendation:
      "Model confidence is declining. Check if recent prompt changes or new query types are causing this.",
  };
};

// ─── Detector 4: MODEL_UNDERPERFORMER ───

export const detectModelUnderperformer: Detector = (traces, _secEvents, config) => {
  // Group traces by model
  const modelGroups: Record<string, { confidences: number[]; traceIds: number[] }> = {};
  for (const t of traces) {
    const conf = getOverallConfidence(t);
    if (conf === null) continue;
    if (!modelGroups[t.model]) modelGroups[t.model] = { confidences: [], traceIds: [] };
    modelGroups[t.model].confidences.push(conf);
    modelGroups[t.model].traceIds.push(t.id);
  }

  const models = Object.entries(modelGroups).filter(
    ([_, g]) => g.confidences.length >= config.minTraces
  );

  if (models.length < 2) return null;

  // Compute average confidence per model
  const modelAvgs = models.map(([name, g]) => ({
    name,
    avg: g.confidences.reduce((s, c) => s + c, 0) / g.confidences.length,
    count: g.confidences.length,
    traceIds: g.traceIds,
  }));

  modelAvgs.sort((a, b) => b.avg - a.avg);
  const best = modelAvgs[0];
  const worst = modelAvgs[modelAvgs.length - 1];

  const gap = ((best.avg - worst.avg) / best.avg) * 100;

  if (gap < 20) return null;

  return {
    detected: true,
    severity: "warning",
    detectorId: "MODEL_UNDERPERFORMER",
    headline: `${worst.name} underperforms ${best.name} by ${gap.toFixed(0)}% in confidence (${(worst.avg * 100).toFixed(0)}% vs ${(best.avg * 100).toFixed(0)}%)`,
    evidence: {
      metric: "model_confidence_gap",
      value: Math.round(gap * 10) / 10,
      threshold: 20,
      affectedTraces: worst.count,
      totalTraces: traces.length,
      sampleTraceIds: worst.traceIds.slice(0, 5),
      details: { bestModel: best.name, worstModel: worst.name, bestAvg: best.avg, worstAvg: worst.avg },
    },
    recommendation: `${worst.name} is underperforming compared to ${best.name}. Consider routing complex queries to the stronger model.`,
  };
};

// ─── Detector 5: HIGH_ENTROPY_CLUSTER ───

export const detectHighEntropyCluster: Detector = (traces, _secEvents, config) => {
  let totalDecisionPoints = 0;
  let tightMarginPoints = 0;
  const affectedTraceIds: number[] = [];

  for (const t of traces) {
    const dps = getDecisionPoints(t);
    if (dps.length === 0) continue;
    totalDecisionPoints += dps.length;
    const tight = dps.filter((dp) => dp.margin < 0.02);
    tightMarginPoints += tight.length;
    if (tight.length > 0) affectedTraceIds.push(t.id);
  }

  if (totalDecisionPoints < config.minTraces) return null;

  const rate = tightMarginPoints / totalDecisionPoints;

  if (rate <= 0.3) return null;

  return {
    detected: true,
    severity: "warning",
    detectorId: "HIGH_ENTROPY_CLUSTER",
    headline: `${(rate * 100).toFixed(0)}% of decision points have near-zero margins — the model is coin-flipping`,
    evidence: {
      metric: "tight_margin_rate",
      value: Math.round(rate * 1000) / 1000,
      threshold: 0.3,
      affectedTraces: affectedTraceIds.length,
      totalTraces: traces.length,
      sampleTraceIds: affectedTraceIds.slice(0, 5),
      details: { totalDecisionPoints, tightMarginPoints },
    },
    recommendation:
      "Your model is frequently coin-flipping between tokens. Lower temperature or use more constrained prompts.",
  };
};

// ─── Detector 6: TOPIC_HALLUCINATION ───

export const detectTopicHallucination: Detector = (traces, _secEvents, _config) => {
  // Find traces with hallucination risk > 0.3 and extract prompt keywords
  const hallucinatingTraces = traces.filter((t) => {
    const risk = getHallucinationRisk(t);
    return risk !== null && risk > 0.3;
  });

  if (hallucinatingTraces.length < 5) return null;

  // Count keyword frequency across hallucinating traces
  const keywordCounts: Record<string, { count: number; traceIds: number[] }> = {};
  for (const t of hallucinatingTraces) {
    const keywords = extractKeywords(getPromptText(t));
    const seen = new Set<string>();
    for (const kw of keywords) {
      if (seen.has(kw)) continue;
      seen.add(kw);
      if (!keywordCounts[kw]) keywordCounts[kw] = { count: 0, traceIds: [] };
      keywordCounts[kw].count++;
      keywordCounts[kw].traceIds.push(t.id);
    }
  }

  // Find the keyword that appears in the most hallucinating traces
  const sorted = Object.entries(keywordCounts)
    .filter(([_, v]) => v.count >= 5)
    .sort((a, b) => b[1].count - a[1].count);

  if (sorted.length === 0) return null;

  const [topic, data] = sorted[0];
  const rate = data.count / hallucinatingTraces.length;

  return {
    detected: true,
    severity: "critical",
    detectorId: "TOPIC_HALLUCINATION",
    headline: `Hallucinations cluster around "${topic}" — ${data.count} of ${hallucinatingTraces.length} flagged traces mention it`,
    evidence: {
      metric: "topic_hallucination_rate",
      value: Math.round(rate * 1000) / 1000,
      threshold: 0,
      affectedTraces: data.count,
      totalTraces: traces.length,
      sampleTraceIds: data.traceIds.slice(0, 5),
      details: { topic, topKeywords: sorted.slice(0, 5).map(([k, v]) => ({ keyword: k, count: v.count })) },
    },
    recommendation: `Hallucinations concentrate on "${topic}". Add domain-specific context or a knowledge base for this area.`,
  };
};

// ─── Detector 7: TEMPERATURE_TOO_HIGH ───

export const detectTemperatureTooHigh: Detector = (traces, _secEvents, config) => {
  const withTemp = traces.filter(
    (t) => t.temperature !== null && parseFloat(t.temperature) > 0
  );

  if (withTemp.length < config.minTraces) return null;

  const avgTemp =
    withTemp.reduce((s, t) => s + parseFloat(t.temperature!), 0) / withTemp.length;

  if (avgTemp <= 0.7) return null;

  // Check confidence stability (std dev of confidence)
  const confidences = traces
    .map(getOverallConfidence)
    .filter((c): c is number => c !== null);

  if (confidences.length < config.minTraces) return null;

  const avgConf = confidences.reduce((s, c) => s + c, 0) / confidences.length;
  const variance =
    confidences.reduce((s, c) => s + (c - avgConf) ** 2, 0) / confidences.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev <= 0.3) return null;

  return {
    detected: true,
    severity: "info",
    detectorId: "TEMPERATURE_TOO_HIGH",
    headline: `Average temperature is ${avgTemp.toFixed(1)} with high confidence variance (σ=${stdDev.toFixed(2)})`,
    evidence: {
      metric: "avg_temperature",
      value: Math.round(avgTemp * 100) / 100,
      threshold: 0.7,
      affectedTraces: withTemp.filter((t) => parseFloat(t.temperature!) > 0.7).length,
      totalTraces: traces.length,
      sampleTraceIds: worstTraceIds(traces, getOverallConfidence, 5, true),
      details: { avgTemp, stdDev, avgConfidence: avgConf },
    },
    recommendation:
      "High temperature is causing inconsistent outputs. For factual tasks, try temperature 0.1–0.3.",
  };
};

// ─── Detector 8: COST_INEFFICIENCY ───

export const detectCostInefficiency: Detector = (traces, _secEvents, config) => {
  const withCost = traces.filter(
    (t) => t.costUsd !== null && parseFloat(t.costUsd) > 0
  );

  if (withCost.length < config.minTraces) return null;

  const avgCost =
    withCost.reduce((s, t) => s + parseFloat(t.costUsd!), 0) / withCost.length;

  if (avgCost <= 0.01) return null; // not expensive enough to flag

  // Check if confidence is low for these expensive traces
  const expensiveWithConf = withCost
    .map((t) => ({ trace: t, conf: getOverallConfidence(t), cost: parseFloat(t.costUsd!) }))
    .filter((x) => x.conf !== null && x.cost > 0.01);

  if (expensiveWithConf.length < 5) return null;

  const avgConfOfExpensive =
    expensiveWithConf.reduce((s, x) => s + x.conf!, 0) / expensiveWithConf.length;

  if (avgConfOfExpensive >= 0.7) return null;

  return {
    detected: true,
    severity: "info",
    detectorId: "COST_INEFFICIENCY",
    headline: `Expensive traces (avg $${avgCost.toFixed(3)}/req) have low confidence (${(avgConfOfExpensive * 100).toFixed(0)}%)`,
    evidence: {
      metric: "cost_confidence_ratio",
      value: Math.round(avgConfOfExpensive * 1000) / 1000,
      threshold: 0.7,
      affectedTraces: expensiveWithConf.length,
      totalTraces: traces.length,
      sampleTraceIds: expensiveWithConf
        .sort((a, b) => a.conf! - b.conf!)
        .slice(0, 5)
        .map((x) => x.trace.id),
      details: { avgCost, avgConfOfExpensive },
    },
    recommendation:
      "You're paying premium rates for uncertain outputs. A smaller model may perform equally well here.",
  };
};

// ─── Detector 9: SECURITY_CORRELATION ───

export const detectSecurityCorrelation: Detector = (traces, securityEvents, config) => {
  if (securityEvents.length < 5) return null;

  // Get trace IDs that have security events
  const securityTraceIds = new Set(
    securityEvents.filter((e) => e.traceId).map((e) => e.traceId!)
  );

  const secTraces = traces.filter((t) => securityTraceIds.has(String(t.id)));
  const nonSecTraces = traces.filter((t) => !securityTraceIds.has(String(t.id)));

  const secConfs = secTraces
    .map(getOverallConfidence)
    .filter((c): c is number => c !== null);
  const nonSecConfs = nonSecTraces
    .map(getOverallConfidence)
    .filter((c): c is number => c !== null);

  if (secConfs.length < 5 || nonSecConfs.length < 5) return null;

  const secAvg = secConfs.reduce((s, c) => s + c, 0) / secConfs.length;
  const nonSecAvg = nonSecConfs.reduce((s, c) => s + c, 0) / nonSecConfs.length;

  const dropPct = ((nonSecAvg - secAvg) / nonSecAvg) * 100;

  if (dropPct < 20) return null;

  return {
    detected: true,
    severity: "warning",
    detectorId: "SECURITY_CORRELATION",
    headline: `Traces with security events have ${dropPct.toFixed(0)}% lower confidence (${(secAvg * 100).toFixed(0)}% vs ${(nonSecAvg * 100).toFixed(0)}%)`,
    evidence: {
      metric: "security_confidence_gap",
      value: Math.round(dropPct * 10) / 10,
      threshold: 20,
      affectedTraces: secTraces.length,
      totalTraces: traces.length,
      sampleTraceIds: secTraces.slice(0, 5).map((t) => t.id),
      details: { secAvg, nonSecAvg, securityEventCount: securityEvents.length },
    },
    recommendation:
      "Adversarial inputs are destabilizing your model. Strengthen input validation and consider prompt hardening.",
  };
};

// ─── Detector 10: NO_LOGPROBS ───

export const detectNoLogprobs: Detector = (traces, _secEvents, config) => {
  if (traces.length < config.minTraces) return null;

  const withoutAnalysis = traces.filter((t) => !t.confidenceAnalysis);
  const rate = withoutAnalysis.length / traces.length;

  if (rate <= 0.5) return null;

  return {
    detected: true,
    severity: "info",
    detectorId: "NO_LOGPROBS",
    headline: `${(rate * 100).toFixed(0)}% of traces lack explainability data (${withoutAnalysis.length} of ${traces.length})`,
    evidence: {
      metric: "missing_analysis_rate",
      value: Math.round(rate * 1000) / 1000,
      threshold: 0.5,
      affectedTraces: withoutAnalysis.length,
      totalTraces: traces.length,
      sampleTraceIds: withoutAnalysis.slice(0, 5).map((t) => t.id),
    },
    recommendation:
      "Most traces don't have explainability data. Enable logprobs injection in Settings → Explainability.",
  };
};

// ─── Run All Detectors ───

const ALL_DETECTORS: Detector[] = [
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
];

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 };

export function runAllDetectors(
  traces: TraceWithAnalysis[],
  securityEvents: SecurityEventForDetector[],
  config: DetectorConfig
): DetectorResult[] {
  const results: DetectorResult[] = [];

  for (const detector of ALL_DETECTORS) {
    try {
      const result = detector(traces, securityEvents, config);
      if (result && result.detected) {
        results.push(result);
      }
    } catch (err) {
      console.error("[Detectors] Detector failed:", err);
      // Continue with other detectors
    }
  }

  // Sort by severity (critical first), then by affected trace count
  results.sort((a, b) => {
    const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return b.evidence.affectedTraces - a.evidence.affectedTraces;
  });

  // Take top 5 to avoid overwhelming the user
  return results.slice(0, 5);
}
