/**
 * Detector 1: Early Stopping
 *
 * Detects when an agent states it will perform an action but does not
 * execute the corresponding tool call. This is a common failure mode
 * where the agent "talks about" doing something instead of doing it.
 *
 * Algorithm:
 * 1. Scan llm_call events for intent signals ("I'll use", "Let me", "Running", etc.)
 * 2. Extract the implied tool/action from the intent signal
 * 3. Check if a corresponding tool_call event follows within N events
 * 4. If no matching tool call is found, flag as early stopping
 */

import type {
  Detector,
  DetectorInput,
  DetectorResult,
  DetectorEvidence,
  EarlyStoppingConfig,
} from "../types";
import type { SessionEvent } from "../../../drizzle/schema";

// ─── Default Configuration ───

const DEFAULT_CONFIG: EarlyStoppingConfig = {
  lookAheadEvents: 5,
  intentPatterns: [
    // Direct action intent
    /(?:I'll|I will|Let me|I'm going to|I am going to)\s+(?:use|run|execute|call|invoke|trigger)\s+(?:the\s+)?(\w[\w\s]*?)(?:\s+tool|\s+function|\s+command|\s+to\b|\.|\s*$)/i,
    // Running/executing statements
    /(?:Running|Executing|Calling|Invoking|Using)\s+(?:the\s+)?(\w[\w\s]*?)(?:\s+tool|\s+function|\s+now|\s+to\b|\.|\.\.\.|…|\s*$)/i,
    // "Let me search/read/write/check" patterns
    /(?:Let me|I'll|I will)\s+(search|read|write|check|test|lint|scan|build|deploy|format|validate|compile|analyze)\b/i,
    // "I need to use X" patterns
    /(?:I need to|I should|I must)\s+(?:use|run|execute|call)\s+(?:the\s+)?(\w[\w\s]*?)(?:\s+tool|\s+function|\.|\s*$)/i,
  ],
  minConfidence: 0.7,
};

// ─── Tool Name Extraction ───

/**
 * Extract the implied tool name from an intent match.
 * Returns a normalized tool name or null if extraction fails.
 */
function extractToolName(match: RegExpMatchArray): string | null {
  // Try capture groups first
  for (let i = 1; i < match.length; i++) {
    if (match[i]) {
      return normalizeToolName(match[i].trim());
    }
  }
  return null;
}

/**
 * Normalize a tool name for comparison.
 * "the file_write tool" → "file_write"
 * "search" → "search"
 */
function normalizeToolName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+tool$/i, "")
    .replace(/\s+function$/i, "")
    .replace(/\s+/g, "_")
    .trim();
}

/**
 * Check if a tool call event matches an expected tool name.
 * Uses fuzzy matching: "file_write" matches "write_file", "fileWrite", etc.
 */
function toolMatches(toolCallName: string | null, expectedTool: string): boolean {
  if (!toolCallName) return false;

  const normalizedCall = normalizeToolName(toolCallName);
  const normalizedExpected = expectedTool.toLowerCase();

  // Exact match
  if (normalizedCall === normalizedExpected) return true;

  // Substring match (e.g., "search" matches "web_search")
  if (normalizedCall.includes(normalizedExpected) || normalizedExpected.includes(normalizedCall)) return true;

  // Word-level overlap (e.g., "file_write" matches "write_file")
  const callWords = new Set(normalizedCall.split("_"));
  const expectedWords = normalizedExpected.split("_");
  const overlap = expectedWords.filter((w) => callWords.has(w));
  if (overlap.length > 0 && overlap.length >= expectedWords.length * 0.5) return true;

  return false;
}

// ─── Detector Implementation ───

export class EarlyStoppingDetector implements Detector {
  id = "early_stopping";
  name = "Early Stopping";
  supportsRealtime = true;

  private config: EarlyStoppingConfig;

  constructor(config?: Partial<EarlyStoppingConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async detect(input: DetectorInput): Promise<DetectorResult> {
    const { events } = input;
    const evidence: DetectorEvidence[] = [];

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      // Only scan llm_call events for intent signals
      if (event.eventType !== "llm_call") continue;

      // Extract text from the LLM response
      const responseText = extractLlmResponseText(event);
      if (!responseText) continue;

      // Check each intent pattern
      for (const pattern of this.config.intentPatterns) {
        const match = responseText.match(pattern);
        if (!match) continue;

        const expectedTool = extractToolName(match);
        if (!expectedTool) continue;

        // Look ahead for a matching tool call
        const lookAheadEnd = Math.min(i + this.config.lookAheadEvents + 1, events.length);
        let found = false;

        for (let j = i + 1; j < lookAheadEnd; j++) {
          const futureEvent = events[j];
          if (
            futureEvent.eventType === "tool_call" &&
            toolMatches(futureEvent.toolName, expectedTool)
          ) {
            found = true;
            break;
          }
          // Also check tool_result events (some agents report results directly)
          if (
            futureEvent.eventType === "tool_result" &&
            toolMatches(futureEvent.toolName, expectedTool)
          ) {
            found = true;
            break;
          }
        }

        if (!found) {
          evidence.push({
            type: "unfollowed_intent",
            description: `Agent stated intent "${match[0].slice(0, 100)}" but no matching tool call for "${expectedTool}" found in next ${this.config.lookAheadEvents} events`,
            eventIndex: i,
            data: {
              intentText: match[0].slice(0, 200),
              expectedTool,
              pattern: pattern.source,
              sequenceNumber: event.sequenceNumber,
            },
          });
        }
      }
    }

    // Calculate severity based on evidence count and session context
    const severity = calculateSeverity(evidence, events);
    const triggered = severity >= this.config.minConfidence * 100;

    return {
      detectorId: this.id,
      triggered,
      severity,
      evidence,
    };
  }
}

// ─── Helpers ───

/**
 * Extract the LLM response text from a session event.
 * Handles various data formats from different agent types.
 */
function extractLlmResponseText(event: SessionEvent): string | null {
  const data = event.eventData as Record<string, unknown>;

  // Common field names for LLM response text
  const candidates = [
    data.response,
    data.completion,
    data.output,
    data.content,
    data.text,
    data.assistant_message,
    data.message,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
    // Handle message objects with content field
    if (candidate && typeof candidate === "object" && "content" in (candidate as any)) {
      const content = (candidate as any).content;
      if (typeof content === "string") return content;
    }
  }

  return null;
}

/**
 * Calculate severity score (0-100) based on evidence.
 */
function calculateSeverity(evidence: DetectorEvidence[], events: SessionEvent[]): number {
  if (evidence.length === 0) return 0;

  // Base severity: each unfollowed intent contributes
  const baseSeverity = Math.min(evidence.length * 25, 80);

  // Ratio factor: what fraction of LLM calls had unfollowed intents?
  const llmCallCount = events.filter((e) => e.eventType === "llm_call").length;
  const ratioFactor = llmCallCount > 0 ? evidence.length / llmCallCount : 0;

  // Combined score
  const score = baseSeverity + ratioFactor * 20;

  return Math.min(Math.round(score), 100);
}
