/**
 * Shared types for the Recommendations Engine (Direction 2) and Improvement Playbooks (Direction 3)
 */

// ─── Detector Types ───

export interface DetectorEvidence {
  metric: string; // e.g., "avg_confidence"
  value: number; // e.g., 0.52
  threshold: number; // e.g., 0.6
  affectedTraces: number;
  totalTraces: number;
  sampleTraceIds: number[]; // up to 5 worst examples
  details?: Record<string, unknown>; // extra context per detector
}

export interface DetectorResult {
  detected: boolean;
  severity: "critical" | "warning" | "info";
  detectorId: DetectorId;
  headline: string;
  evidence: DetectorEvidence;
  recommendation: string; // template text
}

export type DetectorId =
  | "LOW_CONFIDENCE"
  | "HIGH_HALLUCINATION"
  | "CONFIDENCE_DROPPING"
  | "MODEL_UNDERPERFORMER"
  | "HIGH_ENTROPY_CLUSTER"
  | "TOPIC_HALLUCINATION"
  | "TEMPERATURE_TOO_HIGH"
  | "COST_INEFFICIENCY"
  | "SECURITY_CORRELATION"
  | "NO_LOGPROBS";

// ─── Trace shape used by detectors ───

export interface TraceWithAnalysis {
  id: number;
  projectId: number;
  model: string;
  provider: string;
  promptMessages: Array<{ role: string; content: string }> | null;
  completion: string | null;
  status: string;
  latencyMs: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  costUsd: string | null;
  temperature: string | null;
  timestamp: Date | null;
  confidenceAnalysis: Record<string, unknown> | null;
  logprobs: Record<string, unknown> | null;
}

export interface SecurityEventForDetector {
  id: number;
  projectId: number;
  traceId: string | null;
  threatScore: number;
  threatLevel: string;
  action: string;
  timestamp: Date | null;
}

// ─── Detector config ───

export interface DetectorConfig {
  minTraces: number; // minimum traces needed to run detection (default: 10)
  lookbackDays: number; // how far back to look for trend detection (default: 7)
}

export const DEFAULT_DETECTOR_CONFIG: DetectorConfig = {
  minTraces: 10,
  lookbackDays: 7,
};

// ─── Detector function signature ───

export type Detector = (
  traces: TraceWithAnalysis[],
  securityEvents: SecurityEventForDetector[],
  config: DetectorConfig
) => DetectorResult | null;

// ─── LLM Advisor Types ───

export interface PlaybookContent {
  detectorId: DetectorId;
  title: string;
  problem: string; // LLM-generated, specific to user's data
  rootCause: string; // LLM-generated
  fixSteps: {
    title: string;
    description: string;
    codeExample?: string;
    expectedImpact?: string;
  }[];
  verification: string;
}

export interface AdvisorInput {
  detectorResults: DetectorResult[];
  sampleTraces: Record<string, TraceWithAnalysis[]>; // keyed by detectorId
  userConfig: {
    models: string[];
    avgTemperature: number | null;
    explainabilityEnabled: boolean;
    logprobsInjection: string;
  };
}

// ─── Insight (what the frontend displays) ───

export interface Insight {
  id: number; // recommendation ID
  severity: "critical" | "warning" | "info";
  detectorId: DetectorId;
  headline: string;
  impactText: string; // "Affects 23% of traces (34 of 148)"
  evidenceSnippet: string; // worst example text
  playbookId: number | null; // for "View Playbook →" link
}

// ─── Baseline Metrics ───

export interface BaselineMetrics {
  avgConfidence: number;
  hallucinationRate: number;
  avgLatency: number;
  traceCount: number;
}
