/**
 * NER Detector — LLM-Based Named Entity Recognition (Paid Tiers Only)
 *
 * Blueprint Section 5.4 — Uses LLM-based analysis to detect named entities
 * in model outputs that regex-based PII detection misses:
 *
 * Entity types:
 *   - PERSON     — Full names, partial names
 *   - ORG        — Company names, organizations
 *   - LOCATION   — Addresses, cities, countries, coordinates
 *   - DATE       — Dates, timestamps, date ranges
 *   - MONEY      — Currency amounts, financial figures
 *   - MEDICAL    — Medical conditions, medications, procedures
 *   - CREDENTIAL — API keys, tokens, passwords, secrets
 *
 * Free tier: regex-based PII detection only (existing pii-detector.ts)
 * Pro/Team/Enterprise: regex + LLM NER for comprehensive entity detection
 */
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod/v4";
import { createPatchedFetch } from "../_core/patchedFetch";
import { isPaidPlan } from "./llm-scanner";

// ─── Types ──────────────────────────────────────────────────────────

export type NEREntityType =
  | "PERSON"
  | "ORG"
  | "LOCATION"
  | "DATE"
  | "MONEY"
  | "MEDICAL"
  | "CREDENTIAL";

export interface NEREntity {
  /** The entity text as found in the content */
  text: string;
  /** Entity type classification */
  type: NEREntityType;
  /** Confidence score (0-1) */
  confidence: number;
  /** Whether this entity represents sensitive/PII data */
  isSensitive: boolean;
  /** Brief context of why this was flagged */
  context: string;
}

export interface NERResult {
  /** Whether NER analysis was performed */
  scanned: boolean;
  /** Detected entities */
  entities: NEREntity[];
  /** Count of sensitive entities */
  sensitiveCount: number;
  /** Entity types found */
  entityTypes: NEREntityType[];
  /** Risk score based on sensitive entity density (0-100) */
  riskScore: number;
  /** Summary of findings */
  summary: string;
  /** Processing time in ms */
  processingTimeMs: number;
  /** Error message if scan failed */
  error?: string;
}

// ─── LLM NER Schema ────────────────────────────────────────────────

const entitySchema = z.object({
  text: z.string().describe("The exact entity text found in the content"),
  type: z.enum(["PERSON", "ORG", "LOCATION", "DATE", "MONEY", "MEDICAL", "CREDENTIAL"])
    .describe("Entity type classification"),
  confidence: z.number().min(0).max(1).describe("Confidence in the classification"),
  isSensitive: z.boolean().describe("Whether this entity is sensitive/PII that should be protected"),
  context: z.string().describe("Brief explanation of why this was identified"),
});

const nerAnalysisSchema = z.object({
  entities: z.array(entitySchema).describe("List of detected named entities"),
  summary: z.string().describe("One-sentence summary of the NER findings"),
});

// ─── System Prompt ──────────────────────────────────────────────────

const NER_SYSTEM_PROMPT = `You are a Named Entity Recognition (NER) specialist focused on data privacy and security. Analyze the provided text and extract all named entities.

For each entity, determine:
- text: The exact text of the entity
- type: One of PERSON, ORG, LOCATION, DATE, MONEY, MEDICAL, CREDENTIAL
- confidence: How confident you are in the classification (0.0-1.0)
- isSensitive: Whether this entity represents personally identifiable information (PII) or sensitive data
- context: Brief explanation

Entity type guidelines:
- PERSON: Full names, partial names that identify individuals
- ORG: Company names, government agencies, institutions
- LOCATION: Physical addresses, cities, countries, GPS coordinates
- DATE: Specific dates, date ranges, timestamps (not relative dates like "today")
- MONEY: Currency amounts, financial figures, prices
- MEDICAL: Medical conditions, diagnoses, medications, procedures, health data
- CREDENTIAL: API keys, passwords, tokens, secrets, access codes, SSNs, account numbers

Sensitivity guidelines:
- PERSON names are always sensitive
- MEDICAL entities are always sensitive
- CREDENTIAL entities are always sensitive
- LOCATION is sensitive when it's a specific address (not a country/city)
- ORG is usually not sensitive unless in a medical/financial context
- DATE is usually not sensitive unless combined with personal data
- MONEY is sensitive when associated with specific individuals

Be thorough but precise. Do not flag common words or generic terms as entities.`;

// ─── NER Detector ───────────────────────────────────────────────────

/**
 * Detect named entities in text using LLM analysis.
 * Only available for paid tiers (Pro/Team/Enterprise).
 *
 * @param text - The content to analyze (typically model output)
 * @param orgPlan - The organization's plan
 * @returns NERResult with detected entities
 */
export async function detectNER(
  text: string,
  orgPlan: string
): Promise<NERResult> {
  const startTime = Date.now();

  // Gate: only paid plans get NER
  if (!isPaidPlan(orgPlan)) {
    return {
      scanned: false,
      entities: [],
      sensitiveCount: 0,
      entityTypes: [],
      riskScore: 0,
      summary: "NER detection requires a paid plan",
      processingTimeMs: Date.now() - startTime,
    };
  }

  // Skip empty or very short text
  if (!text || text.trim().length < 10) {
    return {
      scanned: true,
      entities: [],
      sensitiveCount: 0,
      entityTypes: [],
      riskScore: 0,
      summary: "Content too short for NER analysis",
      processingTimeMs: Date.now() - startTime,
    };
  }

  try {
    const forgeApiUrl = process.env.BUILT_IN_FORGE_API_URL;
    const forgeApiKey = process.env.BUILT_IN_FORGE_API_KEY;

    if (!forgeApiUrl || !forgeApiKey) {
      return {
        scanned: false,
        entities: [],
        sensitiveCount: 0,
        entityTypes: [],
        riskScore: 0,
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
    const truncatedText = text.length > 3000 ? text.substring(0, 3000) + "..." : text;

    const { object: analysis } = await generateObject({
      model: openai("gemini-2.5-flash"),
      schema: nerAnalysisSchema,
      system: NER_SYSTEM_PROMPT,
      prompt: `Extract all named entities from this text:\n\n${truncatedText}`,
      temperature: 0.1,
    });

    const entities = analysis.entities;
    const sensitiveCount = entities.filter((e) => e.isSensitive).length;
    const entityTypes = Array.from(new Set(entities.map((e) => e.type))) as NEREntityType[];

    // Risk score: based on sensitive entity density and types
    const riskScore = calculateNERRiskScore(entities);

    return {
      scanned: true,
      entities,
      sensitiveCount,
      entityTypes,
      riskScore,
      summary: analysis.summary,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (err) {
    console.error("[Security] NER detection failed:", err);
    return {
      scanned: false,
      entities: [],
      sensitiveCount: 0,
      entityTypes: [],
      riskScore: 0,
      summary: "NER detection failed",
      processingTimeMs: Date.now() - startTime,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─── Risk Score Calculation ─────────────────────────────────────────

/**
 * Calculate risk score based on sensitive entities found.
 * Higher-risk entity types (CREDENTIAL, MEDICAL, PERSON) contribute more.
 */
export function calculateNERRiskScore(entities: NEREntity[]): number {
  if (entities.length === 0) return 0;

  const typeWeights: Record<string, number> = {
    CREDENTIAL: 25,  // API keys, passwords — highest risk
    MEDICAL: 20,     // Health data — HIPAA sensitive
    PERSON: 15,      // PII — names
    LOCATION: 10,    // Addresses
    MONEY: 8,        // Financial data
    ORG: 3,          // Usually not sensitive
    DATE: 2,         // Usually not sensitive
  };

  let score = 0;
  for (const entity of entities) {
    if (entity.isSensitive) {
      score += (typeWeights[entity.type] || 5) * entity.confidence;
    }
  }

  return Math.min(100, Math.round(score));
}

// ─── Exports for testing ────────────────────────────────────────────
export { NER_SYSTEM_PROMPT, nerAnalysisSchema };
