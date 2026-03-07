/**
 * Behavioral Detection Engine — Orchestrator
 *
 * Runs all registered detectors against a session's events and
 * produces an overall assessment. Supports two modes:
 *   - Real-time: runs only real-time-capable detectors (fast, on each check_behavior)
 *   - Post-session: runs all detectors (thorough, on session_end)
 *
 * Results are written to the behavioral_assessments table and
 * optionally update the session's behavioralFlags.
 */

import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { agentSessions } from "../../drizzle/schema";
import {
  getSessionById,
  getSessionEvents,
  insertAssessment,
} from "../mcp/session-manager";
import type {
  Detector,
  DetectorInput,
  DetectorResult,
  AssessmentResult,
} from "./types";
import { EarlyStoppingDetector } from "./detectors/early-stopping";
import { ToolUndertriggeringDetector } from "./detectors/tool-undertriggering";

// ─── Detector Registry ───

const DETECTORS: Detector[] = [
  new EarlyStoppingDetector(),
  new ToolUndertriggeringDetector(),
  // Future detectors:
  // new AgenticLazinessDetector(),
  // new EditAvoidanceDetector(),
  // new InstructionFollowingDetector(),
];

// ─── Engine Entry Point ───

/**
 * Run the detection engine for a session.
 * Called by MCP tool handlers (check_behavior and session_end).
 *
 * @param sessionId - Internal DB ID of the session
 * @param projectId - Project ID for the session
 * @param isRealtime - If true, only runs real-time-capable detectors
 * @returns Assessment result with scores, detector results, and recommendations
 */
export async function runDetection(
  sessionId: number,
  projectId: number,
  isRealtime: boolean
): Promise<AssessmentResult> {
  const startTime = Date.now();

  // Load session and events
  const session = await getSessionById(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  const events = await getSessionEvents(sessionId, { limit: 1000 });

  // Select detectors based on mode
  const activeDetectors = isRealtime
    ? DETECTORS.filter((d) => d.supportsRealtime)
    : DETECTORS;

  // Run all active detectors
  const input: DetectorInput = { session, events, isRealtime };
  const detectorResults: DetectorResult[] = [];

  for (const detector of activeDetectors) {
    try {
      const result = await detector.detect(input);
      detectorResults.push(result);
    } catch (err) {
      console.error(`[Behavioral] Detector ${detector.id} failed:`, err);
      detectorResults.push({
        detectorId: detector.id,
        triggered: false,
        severity: 0,
        evidence: [
          {
            type: "error",
            description: `Detector failed: ${(err as Error).message}`,
          },
        ],
      });
    }
  }

  // Calculate overall score (100 = perfect, 0 = worst)
  const overallScore = calculateOverallScore(detectorResults);

  // Generate recommendations
  const recommendations = generateRecommendations(detectorResults);

  // Build assessment
  const assessment: AssessmentResult = {
    overallScore,
    detectors: detectorResults,
    recommendations,
  };

  const processingMs = Date.now() - startTime;

  // Store assessment in database
  try {
    await insertAssessment({
      sessionId,
      projectId,
      overallScore,
      assessmentType: isRealtime ? "realtime" : "post_session",
      detectors: detectorResults.map(d => ({
        detectorId: d.detectorId,
        triggered: d.triggered,
        severity: d.severity,
        evidence: d.evidence.map(e => ({
          type: e.type,
          description: e.description,
          eventIndex: e.eventIndex,
          data: e.data,
        } as Record<string, unknown>)),
      })),
      summary: null,
      recommendations,
      assessedAt: Date.now(),
      processingMs,
    });
  } catch (err) {
    console.warn("[Behavioral] Failed to store assessment:", err);
  }

  // Update session behavioral flags (for quick dashboard queries)
  try {
    const db = await getDb();
    if (db) {
      await db
        .update(agentSessions)
        .set({
          behaviorScore: overallScore,
          behavioralFlags: detectorResults.map((d) => ({
            detectorId: d.detectorId,
            severity: d.severity,
            triggered: d.triggered,
          })),
        })
        .where(eq(agentSessions.id, sessionId));
    }
  } catch (err) {
    console.warn("[Behavioral] Failed to update session flags:", err);
  }

  return assessment;
}

// ─── Scoring ───

/**
 * Calculate an overall behavior score from detector results.
 * 100 = no issues, 0 = severe issues across all detectors.
 */
function calculateOverallScore(results: DetectorResult[]): number {
  if (results.length === 0) return 100;

  // Weight each detector's severity
  const weights: Record<string, number> = {
    early_stopping: 1.0,
    tool_undertriggering: 0.8,
    agentic_laziness: 0.9,
    edit_avoidance: 0.7,
    instruction_following: 1.2,
  };

  let totalWeightedSeverity = 0;
  let totalWeight = 0;

  for (const result of results) {
    const weight = weights[result.detectorId] ?? 1.0;
    totalWeightedSeverity += result.severity * weight;
    totalWeight += weight;
  }

  const avgSeverity = totalWeight > 0 ? totalWeightedSeverity / totalWeight : 0;

  // Convert severity (0-100 bad) to score (0-100 good)
  return Math.max(0, Math.round(100 - avgSeverity));
}

// ─── Recommendations ───

const RECOMMENDATION_MAP: Record<string, (result: DetectorResult) => string[]> = {
  early_stopping: (result) => {
    if (!result.triggered) return [];
    const count = result.evidence.length;
    return [
      `Agent stated intent to use ${count} tool(s) but did not follow through. Consider adding explicit tool-call verification steps.`,
      "Review agent prompts to ensure tool usage is not just described but executed.",
    ];
  },
  tool_undertriggering: (result) => {
    if (!result.triggered) return [];
    const tools = result.evidence.map((e) => (e.data as any)?.expectedTool).filter(Boolean);
    const unique = Array.from(new Set(tools));
    return [
      `Available tools not used when expected: ${unique.join(", ")}. Consider adding post-generation validation steps.`,
      "Configure your agent to automatically run linters and tests after code generation.",
    ];
  },
};

function generateRecommendations(results: DetectorResult[]): string[] {
  const recommendations: string[] = [];

  for (const result of results) {
    const generator = RECOMMENDATION_MAP[result.detectorId];
    if (generator) {
      recommendations.push(...generator(result));
    }
  }

  if (recommendations.length === 0) {
    recommendations.push("No behavioral issues detected. Agent behavior looks good.");
  }

  return recommendations;
}
