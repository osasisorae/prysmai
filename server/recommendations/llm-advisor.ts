/**
 * LLM Advisor — Takes raw detector results + sample traces and generates
 * human-readable, specific recommendations via the Forge API.
 *
 * Uses generateText (non-streaming) since this is a background operation.
 */

import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createPatchedFetch } from "../_core/patchedFetch";
import type {
  DetectorResult,
  TraceWithAnalysis,
  PlaybookContent,
  AdvisorInput,
} from "./types";

// ─── Model Setup ───

function getModel() {
  const openai = createOpenAI({
    apiKey: process.env.BUILT_IN_FORGE_API_KEY,
    baseURL: `${process.env.BUILT_IN_FORGE_API_URL}/v1`,
    fetch: createPatchedFetch(globalThis.fetch),
  });
  return openai.chat("gemini-2.5-flash");
}

// ─── Prompt Construction ───

function buildSystemPrompt(): string {
  return `You are an AI observability expert working inside PrysmAI, an LLM monitoring platform. Your job is to analyze detected issues in a user's AI system and provide specific, actionable improvement recommendations.

RULES:
- Be specific. Reference actual data from the traces (model names, confidence values, token counts, topics).
- Never give generic advice like "improve your prompts." Say exactly WHAT to change and HOW.
- Each fix step must include a concrete action the user can take today.
- If you suggest a code change, provide the actual code snippet.
- Keep language direct and professional. No filler, no fluff.
- Focus on the highest-impact changes first.
- When suggesting model changes, name specific models (e.g., "Switch from gpt-4o-mini to claude-sonnet-4 for reasoning tasks").
- When suggesting temperature changes, give the exact value.
- When suggesting prompt changes, write the actual prompt text.

OUTPUT FORMAT:
Return a JSON array of PlaybookContent objects. Each object must have:
{
  "detectorId": string,        // Must match the input detector ID
  "title": string,             // Short, action-oriented title (e.g., "Ground pricing queries with RAG")
  "problem": string,           // 2-3 sentences describing the specific problem, referencing actual data
  "rootCause": string,         // 2-3 sentences explaining WHY this is happening
  "fixSteps": [                // 2-4 ordered steps
    {
      "title": string,         // Short step title
      "description": string,   // Detailed instruction (2-4 sentences)
      "codeExample": string?,  // Optional code/config snippet
      "expectedImpact": string? // e.g., "Should improve confidence by ~15%"
    }
  ],
  "verification": string       // How to confirm the fix worked (1-2 sentences)
}

Return ONLY the JSON array. No markdown, no explanation, no wrapping.`;
}

function buildUserPrompt(input: AdvisorInput): string {
  const issueDescriptions = input.detectorResults.map((r, i) => {
    const samples = input.sampleTraces[r.detectorId] || [];
    const sampleText = samples
      .slice(0, 2)
      .map((t) => {
        const prompt = t.promptMessages?.[0]?.content?.slice(0, 200) || "(no prompt)";
        const completion = t.completion?.slice(0, 200) || "(no completion)";
        const conf =
          (t.confidenceAnalysis as any)?.overall_confidence ??
          (t.confidenceAnalysis as any)?.estimated_confidence ??
          "N/A";
        return `  - Trace #${t.id}: model=${t.model}, confidence=${conf}, prompt="${prompt}...", completion="${completion}..."`;
      })
      .join("\n");

    return `ISSUE ${i + 1} [${r.severity.toUpperCase()}] — ${r.detectorId}
Headline: ${r.headline}
Evidence: ${r.evidence.metric}=${r.evidence.value} (threshold: ${r.evidence.threshold})
Affected: ${r.evidence.affectedTraces} of ${r.evidence.totalTraces} traces
Sample traces:
${sampleText || "  (no samples available)"}`;
  });

  const modelsInUse = input.userConfig.models.join(", ") || "unknown";

  return `DETECTED ISSUES:
${issueDescriptions.join("\n\n")}

USER'S CONFIGURATION:
- Models in use: ${modelsInUse}
- Average temperature: ${input.userConfig.avgTemperature ?? "unknown"}
- Explainability: ${input.userConfig.explainabilityEnabled ? "enabled" : "disabled"}
- Logprobs injection: ${input.userConfig.logprobsInjection}

Generate a PlaybookContent JSON array with one entry per detected issue. Be specific to THIS user's data.`;
}

// ─── Response Parsing ───

function parseAdvisorResponse(text: string): PlaybookContent[] {
  // Try to extract JSON from the response
  let jsonStr = text.trim();

  // Remove markdown code fences if present
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      console.error("[LLM Advisor] Response is not an array:", typeof parsed);
      return [];
    }

    // Validate and sanitize each entry
    return parsed
      .filter((entry: any) => {
        return (
          entry.detectorId &&
          entry.title &&
          entry.problem &&
          entry.rootCause &&
          Array.isArray(entry.fixSteps) &&
          entry.fixSteps.length > 0 &&
          entry.verification
        );
      })
      .map((entry: any) => ({
        detectorId: entry.detectorId,
        title: entry.title,
        problem: entry.problem,
        rootCause: entry.rootCause,
        fixSteps: entry.fixSteps.map((step: any) => ({
          title: step.title || "Untitled step",
          description: step.description || "",
          codeExample: step.codeExample || undefined,
          expectedImpact: step.expectedImpact || undefined,
        })),
        verification: entry.verification,
      }));
  } catch (err) {
    console.error("[LLM Advisor] Failed to parse response:", err);
    console.error("[LLM Advisor] Raw response:", text.slice(0, 500));
    return [];
  }
}

// ─── Fallback Generation ───

/**
 * If the LLM fails, generate basic playbooks from the detector results alone.
 * These won't be as specific but ensure the user always gets something.
 */
function generateFallbackPlaybooks(
  detectorResults: DetectorResult[]
): PlaybookContent[] {
  return detectorResults.map((r) => ({
    detectorId: r.detectorId,
    title: `Fix: ${r.headline.slice(0, 80)}`,
    problem: r.headline,
    rootCause: r.recommendation,
    fixSteps: [
      {
        title: "Review flagged traces",
        description: `Examine the ${r.evidence.affectedTraces} affected traces in the Request Explorer. Look for patterns in the prompts and completions that correlate with the issue.`,
      },
      {
        title: "Apply recommended fix",
        description: r.recommendation,
      },
    ],
    verification: `After applying the fix, run at least 50 new traces and check if the ${r.evidence.metric} metric improves past the ${r.evidence.threshold} threshold.`,
  }));
}

// ─── Main Export ───

export async function generateAdvisorRecommendations(
  input: AdvisorInput
): Promise<PlaybookContent[]> {
  if (input.detectorResults.length === 0) return [];

  try {
    const model = getModel();
    const { text } = await generateText({
      model,
      system: buildSystemPrompt(),
      messages: [{ role: "user", content: buildUserPrompt(input) }],
      temperature: 0.3, // Low temperature for consistent, factual output
      maxOutputTokens: 4000,
    });

    const playbooks = parseAdvisorResponse(text);

    if (playbooks.length === 0) {
      console.warn("[LLM Advisor] No valid playbooks parsed, using fallback");
      return generateFallbackPlaybooks(input.detectorResults);
    }

    return playbooks;
  } catch (err) {
    console.error("[LLM Advisor] Generation failed:", err);
    return generateFallbackPlaybooks(input.detectorResults);
  }
}

// Export for testing
export { buildSystemPrompt, buildUserPrompt, parseAdvisorResponse, generateFallbackPlaybooks };
