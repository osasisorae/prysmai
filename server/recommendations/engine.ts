/**
 * Recommendations Engine — Orchestrates the full pipeline:
 *   1. Fetch recent traces + security events
 *   2. Run all 10 pattern detectors
 *   3. Call LLM Advisor for human-readable recommendations
 *   4. Persist recommendations + playbooks + steps to DB
 *   5. Take baseline metric snapshot
 */

import { getDb } from "../db";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import {
  traces,
  securityEvents,
  projects,
  recommendations,
  playbooks,
  playbookSteps,
  recommendationSnapshots,
} from "../../drizzle/schema";
import { runAllDetectors } from "./detectors";
import { generateAdvisorRecommendations } from "./llm-advisor";
import type {
  DetectorConfig,
  DetectorResult,
  TraceWithAnalysis,
  SecurityEventForDetector,
  PlaybookContent,
  BaselineMetrics,
  AdvisorInput,
} from "./types";
import { DEFAULT_DETECTOR_CONFIG } from "./types";

// ─── Data Fetching ───

async function fetchRecentTraces(
  projectId: number,
  limit: number = 200
): Promise<TraceWithAnalysis[]> {
  const db = (await getDb())!;
  const rows = await db
    .select({
      id: traces.id,
      projectId: traces.projectId,
      model: traces.model,
      provider: traces.provider,
      promptMessages: traces.promptMessages,
      completion: traces.completion,
      status: traces.status,
      latencyMs: traces.latencyMs,
      promptTokens: traces.promptTokens,
      completionTokens: traces.completionTokens,
      totalTokens: traces.totalTokens,
      costUsd: traces.costUsd,
      temperature: traces.temperature,
      timestamp: traces.timestamp,
      confidenceAnalysis: traces.confidenceAnalysis,
      logprobs: traces.logprobs,
    })
    .from(traces)
    .where(eq(traces.projectId, projectId))
    .orderBy(desc(traces.timestamp))
    .limit(limit);

  return rows as TraceWithAnalysis[];
}

async function fetchSecurityEvents(
  projectId: number,
  lookbackDays: number = 7
): Promise<SecurityEventForDetector[]> {
  const db = (await getDb())!;
  const cutoff = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      id: securityEvents.id,
      projectId: securityEvents.projectId,
      traceId: securityEvents.traceId,
      threatScore: securityEvents.threatScore,
      threatLevel: securityEvents.threatLevel,
      action: securityEvents.action,
      timestamp: securityEvents.timestamp,
    })
    .from(securityEvents)
    .where(
      and(
        eq(securityEvents.projectId, projectId),
        gte(securityEvents.timestamp, cutoff)
      )
    );

  return rows as SecurityEventForDetector[];
}

async function fetchProjectConfig(projectId: number) {
  const db = (await getDb())!;
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  return project;
}

// ─── Baseline Metrics Calculation ───

function computeBaselineMetrics(traceData: TraceWithAnalysis[]): BaselineMetrics {
  if (traceData.length === 0) {
    return { avgConfidence: 0, hallucinationRate: 0, avgLatency: 0, traceCount: 0 };
  }

  let confSum = 0;
  let confCount = 0;
  let hallucinationCount = 0;
  let hallucinationTotal = 0;
  let latencySum = 0;
  let latencyCount = 0;

  for (const t of traceData) {
    const ca = t.confidenceAnalysis as any;
    if (ca) {
      const conf = ca.overall_confidence ?? ca.estimated_confidence;
      if (typeof conf === "number") {
        confSum += conf;
        confCount++;
      }
      const risk = ca.hallucination_risk_score;
      if (typeof risk === "number") {
        hallucinationTotal++;
        if (risk > 0.3) hallucinationCount++;
      }
    }
    if (t.latencyMs) {
      latencySum += t.latencyMs;
      latencyCount++;
    }
  }

  return {
    avgConfidence: confCount > 0 ? Math.round((confSum / confCount) * 1000) / 1000 : 0,
    hallucinationRate:
      hallucinationTotal > 0
        ? Math.round((hallucinationCount / hallucinationTotal) * 1000) / 1000
        : 0,
    avgLatency: latencyCount > 0 ? Math.round(latencySum / latencyCount) : 0,
    traceCount: traceData.length,
  };
}

// ─── Sample Trace Selection ───

function selectSampleTraces(
  allTraces: TraceWithAnalysis[],
  detectorResults: DetectorResult[]
): Record<string, TraceWithAnalysis[]> {
  const samples: Record<string, TraceWithAnalysis[]> = {};
  const traceMap = new Map(allTraces.map((t) => [t.id, t]));

  for (const result of detectorResults) {
    const sampleIds = result.evidence.sampleTraceIds.slice(0, 3);
    samples[result.detectorId] = sampleIds
      .map((id) => traceMap.get(id))
      .filter((t): t is TraceWithAnalysis => t !== undefined);
  }

  return samples;
}

// ─── Persistence ───

async function persistResults(
  projectId: number,
  detectorResults: DetectorResult[],
  playbookContents: PlaybookContent[],
  baseline: BaselineMetrics
) {
  const db = (await getDb())!;
  // Build a map from detectorId to PlaybookContent
  const contentMap = new Map(playbookContents.map((p) => [p.detectorId, p]));

  // Clear old active recommendations for this project
  await db
    .update(recommendations)
    .set({ status: "dismissed", dismissedAt: new Date() })
    .where(
      and(
        eq(recommendations.projectId, projectId),
        eq(recommendations.status, "active")
      )
    );

  // Insert new recommendations and playbooks
  for (const result of detectorResults) {
    const content = contentMap.get(result.detectorId);

    // Insert recommendation
    const [rec] = await db
      .insert(recommendations)
      .values({
        projectId,
        detectorId: result.detectorId,
        severity: result.severity,
        headline: result.headline,
        problem: content?.problem || result.headline,
        rootCause: content?.rootCause || result.recommendation,
        evidence: result.evidence,
        status: "active",
      })
      .$returningId();

    const recId = rec.id;

    // Insert playbook
    const [pb] = await db
      .insert(playbooks)
      .values({
        projectId,
        recommendationId: recId,
        title: content?.title || `Fix: ${result.headline.slice(0, 80)}`,
        priority:
          result.severity === "critical"
            ? "p1"
            : result.severity === "warning"
              ? "p2"
              : "p3",
        status: "not_started",
        problem: content?.problem || result.headline,
        rootCause: content?.rootCause || result.recommendation,
        verification:
          content?.verification ||
          `After applying fixes, verify that ${result.evidence.metric} improves past ${result.evidence.threshold}.`,
        baselineMetrics: baseline,
      })
      .$returningId();

    const pbId = pb.id;

    // Insert playbook steps
    const steps = content?.fixSteps || [
      {
        title: "Review flagged traces",
        description: `Examine the ${result.evidence.affectedTraces} affected traces.`,
      },
      { title: "Apply fix", description: result.recommendation },
    ];

    for (let i = 0; i < steps.length; i++) {
      await db.insert(playbookSteps).values({
        playbookId: pbId,
        stepOrder: i + 1,
        title: steps[i].title,
        description: steps[i].description,
        codeExample: steps[i].codeExample || null,
        expectedImpact: steps[i].expectedImpact || null,
        completed: false,
      });
    }
  }

  // Take baseline snapshot
  await db.insert(recommendationSnapshots).values({
    projectId,
    avgConfidence: String(baseline.avgConfidence) as any,
    hallucinationRate: String(baseline.hallucinationRate) as any,
    avgLatency: baseline.avgLatency,
    traceCount: baseline.traceCount,
  });
}

// ─── Cache Check ───

async function getLastGeneratedAt(projectId: number): Promise<Date | null> {
  const db = (await getDb())!;
  const [latest] = await db
    .select({ generatedAt: recommendations.generatedAt })
    .from(recommendations)
    .where(eq(recommendations.projectId, projectId))
    .orderBy(desc(recommendations.generatedAt))
    .limit(1);

  return latest?.generatedAt || null;
}

// ─── Main Orchestrator ───

export interface EngineResult {
  detectorResults: DetectorResult[];
  playbookContents: PlaybookContent[];
  baseline: BaselineMetrics;
  fromCache: boolean;
}

export async function generateRecommendations(
  projectId: number,
  force: boolean = false,
  config: DetectorConfig = DEFAULT_DETECTOR_CONFIG
): Promise<EngineResult> {
  const db = (await getDb())!;

  // Check cache (1 hour TTL)
  if (!force) {
    const lastGenerated = await getLastGeneratedAt(projectId);
    if (lastGenerated) {
      const ageMs = Date.now() - lastGenerated.getTime();
      if (ageMs < 60 * 60 * 1000) {
        // Return cached results
        const cachedRecs = await db
          .select()
          .from(recommendations)
          .where(
            and(
              eq(recommendations.projectId, projectId),
              eq(recommendations.status, "active")
            )
          );

        return {
          detectorResults: cachedRecs.map((r: any) => ({
            detected: true,
            severity: r.severity,
            detectorId: r.detectorId as any,
            headline: r.headline,
            evidence: r.evidence as any,
            recommendation: r.rootCause,
          })),
          playbookContents: [],
          baseline: { avgConfidence: 0, hallucinationRate: 0, avgLatency: 0, traceCount: 0 },
          fromCache: true,
        };
      }
    }
  }

  // Step 1: Fetch data
  const [traceData, secEvents, projectConfig] = await Promise.all([
    fetchRecentTraces(projectId),
    fetchSecurityEvents(projectId, config.lookbackDays),
    fetchProjectConfig(projectId),
  ]);

  if (traceData.length === 0) {
    return {
      detectorResults: [],
      playbookContents: [],
      baseline: computeBaselineMetrics([]),
      fromCache: false,
    };
  }

  // Step 2: Run detectors
  const detectorResults = runAllDetectors(traceData, secEvents, config);

  if (detectorResults.length === 0) {
    return {
      detectorResults: [],
      playbookContents: [],
      baseline: computeBaselineMetrics(traceData),
      fromCache: false,
    };
  }

  // Step 3: Select sample traces for LLM context
  const sampleTraces = selectSampleTraces(traceData, detectorResults);

  // Step 4: Build advisor input
  const models: string[] = Array.from(new Set(traceData.map((t: TraceWithAnalysis) => t.model)));
  const temps: number[] = traceData
    .filter((t: TraceWithAnalysis) => t.temperature)
    .map((t: TraceWithAnalysis) => parseFloat(t.temperature!));
  const avgTemp = temps.length > 0 ? temps.reduce((s: number, t: number) => s + t, 0) / temps.length : null;

  const advisorInput: AdvisorInput = {
    detectorResults,
    sampleTraces,
    userConfig: {
      models,
      avgTemperature: avgTemp,
      explainabilityEnabled: projectConfig?.explainabilityEnabled ?? false,
      logprobsInjection: projectConfig?.logprobsInjection ?? "never",
    },
  };

  // Step 5: Call LLM Advisor
  const playbookContents = await generateAdvisorRecommendations(advisorInput);

  // Step 6: Compute baseline
  const baseline = computeBaselineMetrics(traceData);

  // Step 7: Persist everything
  await persistResults(projectId, detectorResults, playbookContents, baseline);

  return {
    detectorResults,
    playbookContents,
    baseline,
    fromCache: false,
  };
}

// Export for testing
export {
  fetchRecentTraces,
  fetchSecurityEvents,
  computeBaselineMetrics,
  selectSampleTraces,
};
