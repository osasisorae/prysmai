/**
 * Shared types for the Behavioral Detection Engine.
 *
 * All detectors implement the same interface so the engine
 * can orchestrate them uniformly.
 */

import type { SessionEvent, AgentSession } from "../../drizzle/schema";

// ─── Detector Interface ───

export interface DetectorResult {
  detectorId: string;
  triggered: boolean;
  severity: number; // 0-100
  evidence: DetectorEvidence[];
}

export interface DetectorEvidence {
  /** What kind of evidence this is */
  type: string;
  /** Human-readable description */
  description: string;
  /** Index of the event in the session event array (if applicable) */
  eventIndex?: number;
  /** The actual text or data that triggered the detection */
  data?: Record<string, unknown>;
}

export interface DetectorInput {
  session: AgentSession;
  events: SessionEvent[];
  /** Whether this is a real-time check (subset of events) or post-session (all events) */
  isRealtime: boolean;
}

export interface Detector {
  /** Unique identifier for this detector */
  id: string;
  /** Human-readable name */
  name: string;
  /** Whether this detector can run in real-time (on each check_behavior call) */
  supportsRealtime: boolean;
  /** Run the detector and return results */
  detect(input: DetectorInput): Promise<DetectorResult>;
}

// ─── Assessment Result ───

export interface AssessmentResult {
  overallScore: number; // 0-100 (100 = perfect behavior)
  detectors: DetectorResult[];
  summary?: string;
  recommendations: string[];
}

// ─── Detector Configs ───

export interface EarlyStoppingConfig {
  /** How many events to check after an intent signal (default: 5) */
  lookAheadEvents: number;
  /** Regex patterns that indicate tool intent */
  intentPatterns: RegExp[];
  /** Minimum confidence to flag (default: 0.7) */
  minConfidence: number;
}

export interface ToolUndertriggeringConfig {
  /** Mapping of trigger events to expected follow-up tools */
  toolContextMap: ToolContextRule[];
}

export interface ToolContextRule {
  /** Event type that triggers the expectation */
  triggerEventType: string;
  /** Additional condition on the event (e.g., file extension) */
  triggerCondition?: (event: SessionEvent) => boolean;
  /** Tool names that should follow */
  expectedTools: string[];
  /** How many events to wait for the expected tool (default: 10) */
  gracePeriod: number;
}
