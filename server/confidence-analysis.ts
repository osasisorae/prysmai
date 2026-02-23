/**
 * Confidence Analysis Engine — Layer 3a
 *
 * Processes logprobs data from OpenAI/Google responses to compute:
 * - Per-token confidence, entropy, margin, hallucination risk
 * - Segment-level grouping (high/low confidence runs)
 * - Completion-level metrics (overall confidence, hallucination risk score)
 * - Decision points (where model almost chose a different token)
 *
 * Also provides estimated confidence for Anthropic (no native logprobs).
 */

// ─── Types ───

export interface TokenLogprob {
  token: string;
  logprob: number;
  top_logprobs?: Array<{ token: string; logprob: number }>;
}

export interface TokenMetrics {
  token: string;
  confidence: number;     // exp(logprob), 0.0–1.0
  entropy: number;        // -sum(p * log(p)) for top alternatives
  margin: number;         // confidence - second_best_confidence
  is_hallucination_risk: boolean;  // confidence < 0.3 AND entropy > 2.0
}

export interface HallucinationCandidate {
  text: string;
  start_token_idx: number;
  end_token_idx: number;
  avg_confidence: number;
  avg_entropy: number;
}

export interface DecisionPoint {
  token_idx: number;
  chosen: string;
  alternative: string;
  chosen_confidence: number;
  alternative_confidence: number;
  margin: number;
}

export interface ConfidenceAnalysis {
  overall_confidence: number;
  hallucination_risk_score: number;
  confidence_stability: number;
  total_tokens: number;
  high_confidence_tokens: number;
  low_confidence_tokens: number;
  hallucination_candidates: HallucinationCandidate[];
  decision_points: DecisionPoint[];
  per_token: TokenMetrics[];
  provider: string;
  logprobs_source: "native" | "estimated";
}

// ─── Per-Token Metrics ───

function computeTokenMetrics(token: TokenLogprob): TokenMetrics {
  const confidence = Math.exp(token.logprob);
  const topAlts = token.top_logprobs ?? [];

  // Compute entropy: -sum(p * log(p)) for top alternatives
  let entropy = 0;
  if (topAlts.length > 0) {
    for (const alt of topAlts) {
      const p = Math.exp(alt.logprob);
      if (p > 0) {
        entropy -= p * Math.log(p);
      }
    }
  }

  // Compute margin: difference between chosen and second-best
  let margin = 1.0;
  if (topAlts.length >= 2) {
    // Find second-best (the highest logprob that isn't the chosen token)
    const sorted = [...topAlts].sort((a, b) => b.logprob - a.logprob);
    const secondBest = sorted.find(a => a.token !== token.token) ?? sorted[1];
    if (secondBest) {
      margin = confidence - Math.exp(secondBest.logprob);
    }
  }

  const is_hallucination_risk = confidence < 0.3 && entropy > 2.0;

  return {
    token: token.token,
    confidence: Math.round(confidence * 10000) / 10000,
    entropy: Math.round(entropy * 10000) / 10000,
    margin: Math.round(Math.max(0, margin) * 10000) / 10000,
    is_hallucination_risk,
  };
}

// ─── Segment Detection ───

function detectHallucinationCandidates(
  tokenMetrics: TokenMetrics[],
  tokens: TokenLogprob[],
): HallucinationCandidate[] {
  const candidates: HallucinationCandidate[] = [];
  let segStart = -1;

  for (let i = 0; i <= tokenMetrics.length; i++) {
    const isLow = i < tokenMetrics.length && tokenMetrics[i].confidence < 0.5;

    if (isLow && segStart === -1) {
      segStart = i;
    } else if (!isLow && segStart !== -1) {
      const segLen = i - segStart;
      // 3+ consecutive low-confidence tokens = hallucination candidate
      if (segLen >= 3) {
        const segTokens = tokenMetrics.slice(segStart, i);
        const avgConfidence = segTokens.reduce((s, t) => s + t.confidence, 0) / segLen;
        const avgEntropy = segTokens.reduce((s, t) => s + t.entropy, 0) / segLen;
        const text = tokens.slice(segStart, i).map(t => t.token).join("");

        candidates.push({
          text,
          start_token_idx: segStart,
          end_token_idx: i - 1,
          avg_confidence: Math.round(avgConfidence * 10000) / 10000,
          avg_entropy: Math.round(avgEntropy * 10000) / 10000,
        });
      }
      segStart = -1;
    }
  }

  return candidates;
}

// ─── Decision Points Detection ───

function detectDecisionPoints(
  tokenMetrics: TokenMetrics[],
  tokens: TokenLogprob[],
): DecisionPoint[] {
  const points: DecisionPoint[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const topAlts = tokens[i].top_logprobs ?? [];
    if (topAlts.length < 2) continue;

    const sorted = [...topAlts].sort((a, b) => b.logprob - a.logprob);
    const best = sorted[0];
    const secondBest = sorted[1];

    if (!best || !secondBest) continue;

    const bestConf = Math.exp(best.logprob);
    const secondConf = Math.exp(secondBest.logprob);
    const margin = bestConf - secondConf;

    // Decision point: top-2 alternatives had < 0.1 margin
    if (margin < 0.1) {
      points.push({
        token_idx: i,
        chosen: best.token,
        alternative: secondBest.token,
        chosen_confidence: Math.round(bestConf * 10000) / 10000,
        alternative_confidence: Math.round(secondConf * 10000) / 10000,
        margin: Math.round(margin * 10000) / 10000,
      });
    }
  }

  return points;
}

// ─── Main Analysis Function ───

/**
 * Compute confidence analysis from native logprobs (OpenAI/Google format).
 * The logprobs object should have a `content` array of TokenLogprob items.
 */
export function computeConfidenceAnalysis(
  logprobs: { content: TokenLogprob[] },
  provider: string = "openai",
): ConfidenceAnalysis {
  const tokens = logprobs.content ?? [];
  if (tokens.length === 0) {
    return {
      overall_confidence: 0,
      hallucination_risk_score: 0,
      confidence_stability: 0,
      total_tokens: 0,
      high_confidence_tokens: 0,
      low_confidence_tokens: 0,
      hallucination_candidates: [],
      decision_points: [],
      per_token: [],
      provider,
      logprobs_source: "native",
    };
  }

  // Per-token metrics
  const perToken = tokens.map(computeTokenMetrics);

  // Completion-level: geometric mean of confidences
  // Use log-space to avoid underflow: exp(mean(log(confidence)))
  const logConfidences = perToken.map(t => Math.log(Math.max(t.confidence, 1e-10)));
  const meanLogConf = logConfidences.reduce((s, v) => s + v, 0) / logConfidences.length;
  const overallConfidence = Math.exp(meanLogConf);

  // Hallucination risk score: fraction of tokens with is_hallucination_risk = true
  const hallucinationCount = perToken.filter(t => t.is_hallucination_risk).length;
  const hallucinationRiskScore = hallucinationCount / perToken.length;

  // Confidence stability: standard deviation of token confidences
  const meanConf = perToken.reduce((s, t) => s + t.confidence, 0) / perToken.length;
  const variance = perToken.reduce((s, t) => s + Math.pow(t.confidence - meanConf, 2), 0) / perToken.length;
  const confidenceStability = Math.sqrt(variance);

  // Token counts
  const highConfidenceTokens = perToken.filter(t => t.confidence > 0.8).length;
  const lowConfidenceTokens = perToken.filter(t => t.confidence < 0.3).length;

  // Segment analysis
  const hallucinationCandidates = detectHallucinationCandidates(perToken, tokens);

  // Decision points
  const decisionPoints = detectDecisionPoints(perToken, tokens);

  return {
    overall_confidence: Math.round(overallConfidence * 10000) / 10000,
    hallucination_risk_score: Math.round(hallucinationRiskScore * 10000) / 10000,
    confidence_stability: Math.round(confidenceStability * 10000) / 10000,
    total_tokens: perToken.length,
    high_confidence_tokens: highConfidenceTokens,
    low_confidence_tokens: lowConfidenceTokens,
    hallucination_candidates: hallucinationCandidates,
    decision_points: decisionPoints,
    per_token: perToken,
    provider,
    logprobs_source: "native",
  };
}

// ─── Anthropic Estimated Confidence ───

/**
 * Estimate confidence for Anthropic completions (no native logprobs).
 * Uses text-based heuristics: hedging language, self-corrections, uncertainty markers.
 */
export function estimateAnthropicConfidence(completion: string): ConfidenceAnalysis {
  // Hedging patterns that indicate uncertainty
  const hedgingPatterns = [
    /\bI think\b/gi,
    /\bprobably\b/gi,
    /\bit's possible that\b/gi,
    /\bI'm not entirely sure\b/gi,
    /\bI'm not sure\b/gi,
    /\bI believe\b/gi,
    /\bmight be\b/gi,
    /\bcould be\b/gi,
    /\bperhaps\b/gi,
    /\bmaybe\b/gi,
    /\blikely\b/gi,
    /\bunlikely\b/gi,
    /\bpossibly\b/gi,
  ];

  // Self-correction patterns
  const correctionPatterns = [
    /\bactually,? let me reconsider\b/gi,
    /\bwait,? that's not right\b/gi,
    /\bactually\b/gi,
    /\blet me correct\b/gi,
    /\bI should clarify\b/gi,
    /\bon second thought\b/gi,
    /\bI was wrong\b/gi,
    /\blet me rephrase\b/gi,
  ];

  // Uncertainty markers
  const uncertaintyMarkers = [
    /\bapproximately\b/gi,
    /\broughly\b/gi,
    /\baround\b/gi,
    /\bestimated\b/gi,
    /\bunclear\b/gi,
    /\buncertain\b/gi,
    /\bhard to say\b/gi,
    /\bdifficult to determine\b/gi,
  ];

  let hedgingCount = 0;
  let correctionCount = 0;
  let uncertaintyCount = 0;

  for (const p of hedgingPatterns) {
    const matches = completion.match(p);
    hedgingCount += matches?.length ?? 0;
  }
  for (const p of correctionPatterns) {
    const matches = completion.match(p);
    correctionCount += matches?.length ?? 0;
  }
  for (const p of uncertaintyMarkers) {
    const matches = completion.match(p);
    uncertaintyCount += matches?.length ?? 0;
  }

  // Rough word count for normalization
  const wordCount = completion.split(/\s+/).length;
  const normalizedHedging = hedgingCount / Math.max(wordCount / 100, 1);
  const normalizedCorrections = correctionCount / Math.max(wordCount / 100, 1);
  const normalizedUncertainty = uncertaintyCount / Math.max(wordCount / 100, 1);

  // Composite confidence: start at 0.85 (base for Anthropic), subtract for uncertainty signals
  let estimatedConfidence = 0.85;
  estimatedConfidence -= normalizedHedging * 0.05;
  estimatedConfidence -= normalizedCorrections * 0.10;
  estimatedConfidence -= normalizedUncertainty * 0.03;
  estimatedConfidence = Math.max(0.1, Math.min(1.0, estimatedConfidence));

  // Hallucination risk based on correction patterns (strongest signal)
  const hallucinationRisk = Math.min(1.0, (correctionCount * 0.15 + hedgingCount * 0.05));

  return {
    overall_confidence: Math.round(estimatedConfidence * 10000) / 10000,
    hallucination_risk_score: Math.round(hallucinationRisk * 10000) / 10000,
    confidence_stability: 0, // N/A for estimated
    total_tokens: wordCount, // approximate
    high_confidence_tokens: 0,
    low_confidence_tokens: 0,
    hallucination_candidates: [],
    decision_points: [],
    per_token: [], // No per-token data for Anthropic
    provider: "anthropic",
    logprobs_source: "estimated",
  };
}
