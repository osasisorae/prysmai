/**
 * Off-Topic Detection Engine (Blueprint Section 5.2)
 *
 * Detects prompts that fall outside the defined scope of an agent's purpose.
 * Two-tier approach:
 *   - Free tier: keyword-based relevance scoring (fast, zero cost)
 *   - Paid tier: LLM-based semantic relevance analysis (accurate, uses Forge API)
 *
 * Configuration:
 *   - offTopicDescription: natural language description of the agent's purpose
 *   - offTopicKeywords: list of on-topic keywords/phrases
 *   - offTopicThreshold: 0.0–1.0 relevance score below which a prompt is off-topic
 *   - offTopicAction: "log" | "warn" | "block"
 */

import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { createPatchedFetch } from "../_core/patchedFetch";

// ─── Types ──────────────────────────────────────────────────────────

export interface OffTopicConfig {
  enabled: boolean;
  description: string | null; // e.g., "This agent handles customer support for a SaaS product"
  keywords: string[]; // on-topic keywords
  threshold: number; // 0.0–1.0 (default 0.70)
  action: "log" | "warn" | "block";
}

export interface OffTopicResult {
  isOffTopic: boolean;
  relevanceScore: number; // 0.0–1.0 (1.0 = perfectly on-topic)
  confidence: number; // 0.0–1.0
  reason: string;
  method: "keyword" | "llm";
  processingTimeMs: number;
}

// ─── Keyword-Based Detection (Free Tier) ────────────────────────────

/**
 * Fast keyword-based relevance scoring.
 * Checks how many on-topic keywords appear in the prompt.
 * Also uses the description words as implicit keywords.
 */
export function detectOffTopicKeyword(
  text: string,
  config: OffTopicConfig
): OffTopicResult {
  const startTime = Date.now();
  const lowerText = text.toLowerCase();

  // Build keyword set from explicit keywords + description words
  const allKeywords: string[] = [...(config.keywords || [])];

  if (config.description) {
    // Extract meaningful words from description (>3 chars, skip stop words)
    const stopWords = new Set([
      "this", "that", "with", "from", "have", "been", "will", "would",
      "could", "should", "about", "their", "there", "these", "those",
      "which", "where", "when", "what", "does", "into", "also", "just",
      "than", "then", "only", "very", "such", "some", "more", "most",
      "other", "each", "every", "both", "they", "them", "your", "were",
      "being", "here", "after", "before", "between", "under", "over",
      "again", "once", "during", "while", "through", "agent", "handles",
    ]);
    const descWords = config.description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));
    allKeywords.push(...descWords);
  }

  // Deduplicate
  const uniqueKeywords = Array.from(new Set(allKeywords.map((k) => k.toLowerCase())));

  if (uniqueKeywords.length === 0) {
    // No keywords configured — can't determine relevance
    return {
      isOffTopic: false,
      relevanceScore: 1.0,
      confidence: 0.1,
      reason: "No on-topic keywords configured — skipping off-topic check",
      method: "keyword",
      processingTimeMs: Date.now() - startTime,
    };
  }

  // Count keyword matches with weighting
  // Explicit keywords (user-defined) are weighted 2x vs description-derived words
  const explicitKeywords = (config.keywords || []).map((k) => k.toLowerCase());
  const explicitSet = new Set(explicitKeywords);

  let weightedScore = 0;
  let maxWeight = 0;
  const matchedKeywords: string[] = [];

  for (const keyword of uniqueKeywords) {
    const weight = explicitSet.has(keyword) ? 2 : 1;
    maxWeight += weight;
    if (lowerText.includes(keyword)) {
      weightedScore += weight;
      matchedKeywords.push(keyword);
    }
  }

  const matchCount = matchedKeywords.length;

  // Calculate relevance score based on explicit keyword match density
  // The key insight: if a user defines 11 keywords and the prompt matches 2-3,
  // that's a strong on-topic signal. We should NOT dilute by description words.
  let relevanceScore: number;
  if (matchCount === 0) {
    relevanceScore = 0.0;
  } else {
    const explicitMatches = matchedKeywords.filter((k) => explicitSet.has(k)).length;
    const descriptionMatches = matchCount - explicitMatches;

    if (explicitSet.size > 0) {
      // Score primarily based on explicit keyword coverage
      // ANY explicit keyword match is a strong on-topic signal.
      // 1 match = ~0.72+, 2 matches = ~0.85+, 3+ = ~0.95+
      const explicitScore = explicitMatches > 0
        ? Math.min(1.0, 0.55 + explicitMatches * 0.15)
        : 0;
      // Small bonus for description word matches
      const descBonus = Math.min(0.15, descriptionMatches * 0.05);
      relevanceScore = Math.min(1.0, explicitScore + descBonus);
    } else {
      // Only description-derived keywords — lower confidence scoring
      const descRatio = matchCount / uniqueKeywords.length;
      relevanceScore = 0.3 + descRatio * 0.5;
    }
  }

  const isOffTopic = relevanceScore < config.threshold;
  const processingTimeMs = Date.now() - startTime;

  return {
    isOffTopic,
    relevanceScore: Math.round(relevanceScore * 100) / 100,
    confidence: 0.5, // keyword matching has moderate confidence
    reason: isOffTopic
      ? `Prompt appears off-topic (${matchCount}/${uniqueKeywords.length} keywords matched: ${matchedKeywords.join(", ") || "none"})`
      : `Prompt is on-topic (${matchCount}/${uniqueKeywords.length} keywords matched)`,
    method: "keyword",
    processingTimeMs,
  };
}

// ─── LLM-Based Detection (Paid Tier) ───────────────────────────────

const offTopicSchema = z.object({
  relevanceScore: z.number().min(0).max(1).describe("How relevant the prompt is to the agent's purpose (0.0 = completely off-topic, 1.0 = perfectly on-topic)"),
  confidence: z.number().min(0).max(1).describe("Confidence in the assessment"),
  reason: z.string().describe("Brief explanation of why the prompt is or isn't on-topic"),
});

let _openai: ReturnType<typeof createOpenAI> | null = null;

function getOpenAI() {
  if (!_openai) {
    const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
    const baseURL = process.env.BUILT_IN_FORGE_API_URL;
    if (!apiKey || !baseURL) {
      throw new Error("Forge API credentials not configured");
    }
    _openai = createOpenAI({
      apiKey,
      baseURL: `${baseURL}/v1`,
      fetch: createPatchedFetch(fetch),
    });
  }
  return _openai;
}

/**
 * LLM-based semantic relevance analysis.
 * Uses Forge API (gemini-2.5-flash) for accurate off-topic detection.
 * Only called for paid tier users.
 */
export async function detectOffTopicLLM(
  text: string,
  config: OffTopicConfig,
  timeoutMs: number = 6000
): Promise<OffTopicResult> {
  const startTime = Date.now();

  // Skip very short prompts
  if (text.trim().length < 5) {
    return {
      isOffTopic: false,
      relevanceScore: 1.0,
      confidence: 0.5,
      reason: "Prompt too short to assess topic relevance",
      method: "llm",
      processingTimeMs: Date.now() - startTime,
    };
  }

  const truncatedPrompt = text.length > 3000
    ? text.substring(0, 3000) + "\n[...truncated]"
    : text;

  const systemPrompt = `You are a topic relevance classifier for an AI agent. Your job is to determine whether a user's prompt is relevant to the agent's defined purpose.

Agent Purpose: ${config.description || "General-purpose assistant"}
${config.keywords?.length ? `On-Topic Keywords: ${config.keywords.join(", ")}` : ""}

Score the relevance from 0.0 (completely off-topic) to 1.0 (perfectly on-topic).

Guidelines:
- Prompts that are tangentially related should score 0.4–0.6
- Prompts that are clearly within scope should score 0.7–1.0
- Prompts that have nothing to do with the agent's purpose should score 0.0–0.3
- Be generous with ambiguous prompts — only flag clearly off-topic content
- Greetings, meta-questions about the agent, and clarification requests are always on-topic (1.0)`;

  try {
    const openai = getOpenAI();
    const model = openai.chat("gemini-2.5-flash");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const { object } = await generateObject({
      model,
      schema: offTopicSchema,
      system: systemPrompt,
      prompt: `Assess the topic relevance of this prompt:\n\n---\n${truncatedPrompt}\n---`,
      temperature: 0.1,
      abortSignal: controller.signal,
    });

    clearTimeout(timeout);
    const processingTimeMs = Date.now() - startTime;

    return {
      isOffTopic: object.relevanceScore < config.threshold,
      relevanceScore: Math.round(object.relevanceScore * 100) / 100,
      confidence: Math.round(object.confidence * 100) / 100,
      reason: object.reason,
      method: "llm",
      processingTimeMs,
    };
  } catch (err: any) {
    const processingTimeMs = Date.now() - startTime;
    console.error("[Off-Topic] LLM detection failed:", err.message);

    // Fallback to keyword-based on LLM failure
    const fallback = detectOffTopicKeyword(text, config);
    return {
      ...fallback,
      reason: `LLM analysis failed, keyword fallback: ${fallback.reason}`,
      processingTimeMs,
    };
  }
}

// ─── Main Entry Point ───────────────────────────────────────────────

/**
 * Detect off-topic prompts using the appropriate tier.
 *
 * @param text - The prompt text to analyze
 * @param config - Off-topic detection configuration
 * @param isPaid - Whether the user is on a paid plan (enables LLM analysis)
 */
export async function detectOffTopic(
  text: string,
  config: OffTopicConfig,
  isPaid: boolean = false
): Promise<OffTopicResult> {
  if (!config.enabled) {
    return {
      isOffTopic: false,
      relevanceScore: 1.0,
      confidence: 1.0,
      reason: "Off-topic detection disabled",
      method: "keyword",
      processingTimeMs: 0,
    };
  }

  if (isPaid) {
    return detectOffTopicLLM(text, config);
  }

  return detectOffTopicKeyword(text, config);
}

// ─── Exports for testing ────────────────────────────────────────────
export { getOpenAI as _getOpenAI };
