/**
 * Output Scanner — Response-Side Security
 *
 * Scans LLM completion text for:
 *   1. PII leakage (reuses pii-detector)
 *   2. Toxicity / harmful content (keyword + pattern based)
 *
 * Designed to run AFTER the upstream response is received.
 * For non-streaming: scans the full completion before forwarding.
 * For streaming: scans the accumulated completion after stream ends (log-only, no blocking).
 */

import { detectPII, type PIIDetectionResult, type RedactionMode } from "./pii-detector";
import { getDb } from "../db";
import { securityEvents, securityConfigs } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Types ──────────────────────────────────────────────────────────

export type ToxicityCategory =
  | "hate_speech"
  | "harassment"
  | "self_harm"
  | "sexual_content"
  | "violence"
  | "dangerous_instructions"
  | "profanity";

export interface ToxicityMatch {
  category: ToxicityCategory;
  matchedText: string;
  severity: number; // 1-10
}

export interface OutputScanResult {
  // Composite
  outputThreatScore: number;
  outputThreatLevel: "clean" | "low" | "medium" | "high";
  shouldBlock: boolean;
  summary: string;

  // PII
  piiResult: PIIDetectionResult | null;
  piiScore: number;

  // Toxicity
  toxicityMatches: ToxicityMatch[];
  toxicityScore: number;
  toxicityCategories: ToxicityCategory[];

  // Redacted output (if PII redaction enabled)
  redactedOutput?: string;

  // Timing
  processingTimeMs: number;
}

export interface OutputScanConfig {
  outputScanning: boolean;
  outputPiiDetection: boolean;
  outputToxicityDetection: boolean;
  outputBlockThreats: boolean;
  piiRedactionMode: RedactionMode;
}

// ─── Toxicity Patterns ──────────────────────────────────────────────

interface ToxicityPattern {
  category: ToxicityCategory;
  keywords: string[];
  severity: number;
}

const TOXICITY_PATTERNS: ToxicityPattern[] = [
  {
    category: "hate_speech",
    keywords: [
      "racial slur", "ethnic cleansing", "white supremacy", "kill all",
      "subhuman", "inferior race", "master race",
    ],
    severity: 9,
  },
  {
    category: "harassment",
    keywords: [
      "i will find you", "you deserve to die", "kill yourself",
      "i know where you live", "dox you", "swat you",
    ],
    severity: 8,
  },
  {
    category: "self_harm",
    keywords: [
      "how to commit suicide", "suicide method", "painless way to die",
      "self-harm techniques", "cut yourself", "overdose instructions",
    ],
    severity: 10,
  },
  {
    category: "sexual_content",
    keywords: [
      "explicit sexual", "child exploitation", "sexual abuse",
      "non-consensual", "revenge porn",
    ],
    severity: 9,
  },
  {
    category: "violence",
    keywords: [
      "how to murder", "torture methods", "dismember",
      "bomb making instructions", "mass shooting plan",
    ],
    severity: 10,
  },
  {
    category: "dangerous_instructions",
    keywords: [
      "synthesize methamphetamine", "make ricin", "build pipe bomb",
      "create nerve agent", "manufacture fentanyl", "weaponize anthrax",
      "here is the malware code", "exploit code for",
    ],
    severity: 10,
  },
  {
    category: "profanity",
    keywords: [
      // Intentionally light — profanity alone is low severity
      "fuck you", "piece of shit", "go to hell",
    ],
    severity: 3,
  },
];

// ─── Toxicity Detection ─────────────────────────────────────────────

export function detectToxicity(text: string): {
  matches: ToxicityMatch[];
  score: number;
  categories: ToxicityCategory[];
} {
  const matches: ToxicityMatch[] = [];
  const lowerText = text.toLowerCase();

  for (const pattern of TOXICITY_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matches.push({
          category: pattern.category,
          matchedText: keyword,
          severity: pattern.severity,
        });
        break; // One match per category is enough
      }
    }
  }

  // Score: sum severities, scale to 0-100
  const rawScore = matches.reduce((sum, m) => sum + m.severity * 5, 0);
  const score = Math.min(100, rawScore);
  const categories = Array.from(new Set(matches.map((m) => m.category)));

  return { matches, score, categories };
}

// ─── Threat Level Determination ─────────────────────────────────────

function getOutputThreatLevel(score: number): "clean" | "low" | "medium" | "high" {
  if (score <= 15) return "clean";
  if (score <= 40) return "low";
  if (score <= 65) return "medium";
  return "high";
}

// ─── Main Output Scan Function ──────────────────────────────────────

export function scanOutput(
  completionText: string,
  config: OutputScanConfig
): OutputScanResult {
  const startTime = Date.now();

  if (!config.outputScanning || !completionText.trim()) {
    return {
      outputThreatScore: 0,
      outputThreatLevel: "clean",
      shouldBlock: false,
      summary: "Output scanning disabled or empty output",
      piiResult: null,
      piiScore: 0,
      toxicityMatches: [],
      toxicityScore: 0,
      toxicityCategories: [],
      processingTimeMs: Date.now() - startTime,
    };
  }

  // 1. PII detection on output
  let piiResult: PIIDetectionResult | null = null;
  let piiScore = 0;
  if (config.outputPiiDetection) {
    piiResult = detectPII(completionText, config.piiRedactionMode);
    // Scale to 0-50 range (output PII is more serious — model is leaking data)
    piiScore = Math.min(50, Math.round(piiResult.score * 0.5));
  }

  // 2. Toxicity detection on output
  let toxicityResult = { matches: [] as ToxicityMatch[], score: 0, categories: [] as ToxicityCategory[] };
  let toxicityScore = 0;
  if (config.outputToxicityDetection) {
    toxicityResult = detectToxicity(completionText);
    // Scale to 0-50 range
    toxicityScore = Math.min(50, Math.round(toxicityResult.score * 0.5));
  }

  // 3. Composite score
  const outputThreatScore = Math.min(100, piiScore + toxicityScore);
  const outputThreatLevel = getOutputThreatLevel(outputThreatScore);

  // 4. Blocking decision
  const shouldBlock = config.outputBlockThreats && outputThreatLevel === "high";

  // 5. Summary
  const parts: string[] = [];
  if (piiResult && piiResult.hasPII) {
    parts.push(`Output PII: ${piiResult.types.join(", ")} (${piiResult.matches.length} instances)`);
  }
  if (toxicityResult.matches.length > 0) {
    parts.push(`Toxicity: ${toxicityResult.categories.join(", ")}`);
  }
  const summary = parts.length > 0 ? parts.join("; ") : "Output clean";

  const processingTimeMs = Date.now() - startTime;

  return {
    outputThreatScore,
    outputThreatLevel,
    shouldBlock,
    summary,
    piiResult,
    piiScore,
    toxicityMatches: toxicityResult.matches,
    toxicityScore,
    toxicityCategories: toxicityResult.categories,
    redactedOutput: piiResult?.redactedText,
    processingTimeMs,
  };
}

// ─── Log Output Security Event ──────────────────────────────────────

export async function logOutputSecurityEvent(
  projectId: number,
  traceId: string | undefined,
  model: string,
  result: OutputScanResult,
  completionText: string
): Promise<void> {
  try {
    // Only log non-clean events
    if (result.outputThreatLevel === "clean") return;

    const db = await getDb();
    if (!db) return;

    await db.insert(securityEvents).values({
      projectId,
      traceId,
      threatScore: result.outputThreatScore,
      threatLevel: result.outputThreatLevel,
      action: result.shouldBlock ? "block" : result.outputThreatLevel === "medium" ? "warn" : "log",
      summary: result.summary,
      source: "output",
      injectionScore: 0,
      piiScore: result.piiScore,
      policyScore: 0,
      toxicityScore: result.toxicityScore,
      piiTypes: result.piiResult?.types ?? null,
      toxicityCategories: result.toxicityCategories.length > 0 ? result.toxicityCategories : null,
      model,
      outputPreview: completionText.substring(0, 200),
      processingTimeMs: result.processingTimeMs,
    });
  } catch (err) {
    console.error("[Security] Failed to log output security event:", err);
  }
}

// ─── Config Cache for Output Scanning ───────────────────────────────

const outputConfigCache = new Map<number, { config: OutputScanConfig; expiry: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export const DEFAULT_OUTPUT_SCAN_CONFIG: OutputScanConfig = {
  outputScanning: false,
  outputPiiDetection: true,
  outputToxicityDetection: true,
  outputBlockThreats: false,
  piiRedactionMode: "none",
};

export async function getOutputScanConfig(projectId: number): Promise<OutputScanConfig> {
  const cached = outputConfigCache.get(projectId);
  if (cached && Date.now() < cached.expiry) {
    return cached.config;
  }

  try {
    const db = await getDb();
    if (!db) return DEFAULT_OUTPUT_SCAN_CONFIG;

    const rows = await db
      .select()
      .from(securityConfigs)
      .where(eq(securityConfigs.projectId, projectId))
      .limit(1);

    if (rows.length === 0) {
      outputConfigCache.set(projectId, { config: DEFAULT_OUTPUT_SCAN_CONFIG, expiry: Date.now() + CACHE_TTL_MS });
      return DEFAULT_OUTPUT_SCAN_CONFIG;
    }

    const row = rows[0];
    const config: OutputScanConfig = {
      outputScanning: row.outputScanning ?? false,
      outputPiiDetection: row.outputPiiDetection ?? true,
      outputToxicityDetection: row.outputToxicityDetection ?? true,
      outputBlockThreats: row.outputBlockThreats ?? false,
      piiRedactionMode: (row.piiRedactionMode as RedactionMode) ?? "none",
    };

    outputConfigCache.set(projectId, { config, expiry: Date.now() + CACHE_TTL_MS });
    return config;
  } catch (err) {
    console.error("[Security] Failed to load output scan config:", err);
    return DEFAULT_OUTPUT_SCAN_CONFIG;
  }
}

// ─── Exports for testing ────────────────────────────────────────────

export { TOXICITY_PATTERNS, outputConfigCache };
