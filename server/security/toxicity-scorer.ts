/**
 * ML-Based Toxicity Scorer (Paid Tiers Only)
 *
 * Blueprint Section 5.4 — Uses LLM-based analysis to score content across
 * 6 toxicity dimensions, replacing keyword-based detection for paid tiers.
 *
 * Dimensions (per blueprint):
 *   1. hate_speech     — Hateful content targeting protected groups
 *   2. harassment      — Threatening, intimidating, or bullying language
 *   3. self_harm       — Content promoting or instructing self-harm/suicide
 *   4. sexual_content  — Explicit sexual material or exploitation
 *   5. violence        — Graphic violence, gore, or violent instructions
 *   6. dangerous_info  — Instructions for weapons, drugs, malware, etc.
 *
 * Free tier: keyword-based detection (existing detectToxicity in output-scanner.ts)
 * Pro/Team/Enterprise: LLM-based 6-dimension scoring via Forge API
 */
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod/v4";
import { createPatchedFetch } from "../_core/patchedFetch";
import { isPaidPlan } from "./llm-scanner";

// ─── Types ──────────────────────────────────────────────────────────

export interface ToxicityDimensionScore {
  /** Score from 0.0 (safe) to 1.0 (highly toxic) */
  score: number;
  /** Whether this dimension was flagged */
  flagged: boolean;
  /** Brief explanation of why this dimension was flagged (or why it's safe) */
  reason: string;
}

export interface ToxicityScores {
  hate_speech: ToxicityDimensionScore;
  harassment: ToxicityDimensionScore;
  self_harm: ToxicityDimensionScore;
  sexual_content: ToxicityDimensionScore;
  violence: ToxicityDimensionScore;
  dangerous_info: ToxicityDimensionScore;
}

export interface MLToxicityResult {
  /** Whether ML scoring was performed */
  scanned: boolean;
  /** Aggregate toxicity score (0-100) */
  overallScore: number;
  /** Per-dimension breakdown */
  dimensions: ToxicityScores;
  /** Categories that were flagged */
  flaggedCategories: string[];
  /** Overall assessment */
  summary: string;
  /** Processing time in ms */
  processingTimeMs: number;
  /** Error message if scan failed */
  error?: string;
}

// ─── LLM Toxicity Schema ───────────────────────────────────────────

const dimensionSchema = z.object({
  score: z.number().min(0).max(1).describe("Toxicity score from 0.0 (safe) to 1.0 (highly toxic)"),
  flagged: z.boolean().describe("Whether this dimension exceeds the safety threshold"),
  reason: z.string().describe("Brief explanation (1-2 sentences)"),
});

const toxicityAnalysisSchema = z.object({
  hate_speech: dimensionSchema.describe("Hateful content targeting race, ethnicity, religion, gender, sexual orientation, disability, or other protected characteristics"),
  harassment: dimensionSchema.describe("Threatening, intimidating, bullying, or personally attacking language"),
  self_harm: dimensionSchema.describe("Content promoting, instructing, or glorifying self-harm or suicide"),
  sexual_content: dimensionSchema.describe("Explicit sexual material, exploitation, or non-consensual content"),
  violence: dimensionSchema.describe("Graphic violence, gore, torture, or instructions for violent acts"),
  dangerous_info: dimensionSchema.describe("Instructions for weapons, drugs, malware, explosives, or other dangerous materials"),
  summary: z.string().describe("One-sentence overall assessment of the content's safety"),
});

// ─── System Prompt ──────────────────────────────────────────────────

const TOXICITY_SYSTEM_PROMPT = `You are a content safety classifier. Analyze the provided text and score it across 6 toxicity dimensions.

For each dimension, provide:
- score: 0.0 (completely safe) to 1.0 (extremely toxic/harmful)
- flagged: true if score >= 0.5 (the content is problematic in this dimension)
- reason: Brief explanation of your assessment

Scoring guidelines:
- 0.0-0.2: Safe, no concerns
- 0.2-0.4: Mildly concerning but generally acceptable
- 0.4-0.6: Moderately problematic, warrants attention
- 0.6-0.8: Clearly harmful or inappropriate
- 0.8-1.0: Severely toxic, dangerous, or illegal content

Be precise and objective. Do not over-flag benign content. Medical, educational, and news contexts should be scored lower than content that promotes or instructs harmful behavior.`;

// ─── ML Toxicity Scorer ─────────────────────────────────────────────

/**
 * Score content across 6 toxicity dimensions using LLM analysis.
 * Only available for paid tiers (Pro/Team/Enterprise).
 *
 * @param text - The content to analyze (typically model output)
 * @param orgPlan - The organization's plan (free/pro/team/enterprise)
 * @returns MLToxicityResult with per-dimension scores
 */
export async function scoreToxicityML(
  text: string,
  orgPlan: string
): Promise<MLToxicityResult> {
  const startTime = Date.now();

  // Gate: only paid plans get ML scoring
  if (!isPaidPlan(orgPlan)) {
    return {
      scanned: false,
      overallScore: 0,
      dimensions: getEmptyDimensions(),
      flaggedCategories: [],
      summary: "ML toxicity scoring requires a paid plan",
      processingTimeMs: Date.now() - startTime,
    };
  }

  // Skip empty or very short text
  if (!text || text.trim().length < 5) {
    return {
      scanned: true,
      overallScore: 0,
      dimensions: getEmptyDimensions(),
      flaggedCategories: [],
      summary: "Content too short to analyze",
      processingTimeMs: Date.now() - startTime,
    };
  }

  try {
    const forgeApiUrl = process.env.BUILT_IN_FORGE_API_URL;
    const forgeApiKey = process.env.BUILT_IN_FORGE_API_KEY;

    if (!forgeApiUrl || !forgeApiKey) {
      return {
        scanned: false,
        overallScore: 0,
        dimensions: getEmptyDimensions(),
        flaggedCategories: [],
        summary: "Forge API not configured",
        processingTimeMs: Date.now() - startTime,
        error: "Missing BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY",
      };
    }

    const openai = createOpenAI({
      baseURL: forgeApiUrl,
      apiKey: forgeApiKey,
      fetch: createPatchedFetch(fetch),
    });

    // Truncate to prevent excessive token usage
    const truncatedText = text.length > 2000 ? text.substring(0, 2000) + "..." : text;

    const { object: analysis } = await generateObject({
      model: openai("gemini-2.5-flash"),
      schema: toxicityAnalysisSchema,
      system: TOXICITY_SYSTEM_PROMPT,
      prompt: `Analyze this content for toxicity:\n\n${truncatedText}`,
      temperature: 0.1,
    });

    const dimensions: ToxicityScores = {
      hate_speech: analysis.hate_speech,
      harassment: analysis.harassment,
      self_harm: analysis.self_harm,
      sexual_content: analysis.sexual_content,
      violence: analysis.violence,
      dangerous_info: analysis.dangerous_info,
    };

    // Calculate overall score: weighted average with max-boost
    // Higher-severity dimensions (self_harm, violence, dangerous_info) get more weight
    const weights: Record<string, number> = {
      hate_speech: 1.0,
      harassment: 0.8,
      self_harm: 1.5,
      sexual_content: 1.0,
      violence: 1.2,
      dangerous_info: 1.5,
    };

    let weightedSum = 0;
    let totalWeight = 0;
    const flaggedCategories: string[] = [];

    for (const [key, dim] of Object.entries(dimensions)) {
      const weight = weights[key] || 1.0;
      weightedSum += dim.score * weight;
      totalWeight += weight;
      if (dim.flagged) {
        flaggedCategories.push(key);
      }
    }

    const weightedAvg = totalWeight > 0 ? weightedSum / totalWeight : 0;
    // Scale to 0-100 and boost if any dimension is severely flagged
    const maxDimScore = Math.max(...Object.values(dimensions).map((d) => d.score));
    const overallScore = Math.min(100, Math.round(
      weightedAvg * 70 + maxDimScore * 30
    ));

    return {
      scanned: true,
      overallScore,
      dimensions,
      flaggedCategories,
      summary: analysis.summary,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (err) {
    console.error("[Security] ML toxicity scoring failed:", err);
    return {
      scanned: false,
      overallScore: 0,
      dimensions: getEmptyDimensions(),
      flaggedCategories: [],
      summary: "ML toxicity scoring failed",
      processingTimeMs: Date.now() - startTime,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function getEmptyDimensions(): ToxicityScores {
  const empty: ToxicityDimensionScore = { score: 0, flagged: false, reason: "Not analyzed" };
  return {
    hate_speech: { ...empty },
    harassment: { ...empty },
    self_harm: { ...empty },
    sexual_content: { ...empty },
    violence: { ...empty },
    dangerous_info: { ...empty },
  };
}

// ─── Exports for testing ────────────────────────────────────────────
export { getEmptyDimensions, TOXICITY_SYSTEM_PROMPT, toxicityAnalysisSchema };
