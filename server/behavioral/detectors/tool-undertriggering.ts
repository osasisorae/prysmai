/**
 * Detector 3: Tool Undertriggering
 *
 * Detects available tools that should have been used but were not.
 * For example, if the agent generates code but never runs the linter
 * or test runner, this detector flags the omission.
 *
 * Algorithm:
 * 1. Load available_tools from the session
 * 2. Scan events for trigger events (code_generated, file_write)
 * 3. Check if expected follow-up tools were invoked within a grace period
 * 4. Flag tools that were available and contextually appropriate but never used
 */

import type {
  Detector,
  DetectorInput,
  DetectorResult,
  DetectorEvidence,
  ToolUndertriggeringConfig,
  ToolContextRule,
} from "../types";
import type { SessionEvent } from "../../../drizzle/schema";

// ─── Default Tool-Context Mapping ───

const DEFAULT_TOOL_CONTEXT_MAP: ToolContextRule[] = [
  {
    triggerEventType: "code_generated",
    expectedTools: ["test_runner", "test", "pytest", "vitest", "jest", "mocha", "run_tests"],
    gracePeriod: 10,
  },
  {
    triggerEventType: "code_generated",
    expectedTools: ["linter", "lint", "eslint", "pylint", "ruff", "flake8", "run_linter"],
    gracePeriod: 10,
  },
  {
    triggerEventType: "code_generated",
    expectedTools: ["type_checker", "typecheck", "tsc", "mypy", "pyright"],
    gracePeriod: 10,
  },
  {
    triggerEventType: "file_write",
    triggerCondition: (event: SessionEvent) => {
      const path = event.codeFilePath ?? (event.eventData as any)?.path ?? "";
      // Config files that should be validated
      return /\.(json|ya?ml|toml|ini|env|config\.\w+)$/i.test(path);
    },
    expectedTools: ["validator", "validate", "lint", "linter"],
    gracePeriod: 5,
  },
  {
    triggerEventType: "code_generated",
    triggerCondition: (event: SessionEvent) => {
      // Security-sensitive code patterns
      const code = event.codeContent ?? (event.eventData as any)?.code ?? "";
      return /(?:password|secret|token|api_key|auth|crypto|encrypt|hash|sql|exec|eval|subprocess)/i.test(code);
    },
    expectedTools: ["security_scanner", "security_scan", "scan", "bandit", "semgrep"],
    gracePeriod: 10,
  },
  {
    triggerEventType: "file_write",
    triggerCondition: (event: SessionEvent) => {
      const path = event.codeFilePath ?? (event.eventData as any)?.path ?? "";
      // Secret/env files
      return /\.env|secret|credential|key/i.test(path);
    },
    expectedTools: ["secret_scanner", "secret_scan", "gitleaks", "trufflehog"],
    gracePeriod: 3,
  },
];

// ─── Detector Implementation ───

export class ToolUndertriggeringDetector implements Detector {
  id = "tool_undertriggering";
  name = "Tool Undertriggering";
  supportsRealtime = true;

  private config: ToolUndertriggeringConfig;

  constructor(config?: Partial<ToolUndertriggeringConfig>) {
    this.config = {
      toolContextMap: config?.toolContextMap ?? DEFAULT_TOOL_CONTEXT_MAP,
    };
  }

  async detect(input: DetectorInput): Promise<DetectorResult> {
    const { session, events } = input;
    const evidence: DetectorEvidence[] = [];

    // Get the set of tools available to this agent
    const availableTools = new Set(
      (session.availableTools ?? []).map((t) => t.toLowerCase())
    );

    // If no tools are declared, we can't detect undertriggering
    if (availableTools.size === 0) {
      return {
        detectorId: this.id,
        triggered: false,
        severity: 0,
        evidence: [],
      };
    }

    // Collect all tool calls made during the session
    const toolCallsMade = new Set<string>();
    for (const event of events) {
      if (event.eventType === "tool_call" && event.toolName) {
        toolCallsMade.add(event.toolName.toLowerCase());
      }
      if (event.eventType === "tool_result" && event.toolName) {
        toolCallsMade.add(event.toolName.toLowerCase());
      }
    }

    // Check each rule against the event stream
    for (const rule of this.config.toolContextMap) {
      // Find trigger events
      for (let i = 0; i < events.length; i++) {
        const event = events[i];

        // Check if this event matches the trigger
        if (event.eventType !== rule.triggerEventType) continue;
        if (rule.triggerCondition && !rule.triggerCondition(event)) continue;

        // Check which expected tools are available to this agent
        const relevantExpectedTools = rule.expectedTools.filter((tool) =>
          hasMatchingTool(availableTools, tool)
        );

        if (relevantExpectedTools.length === 0) continue;

        // Look ahead for expected tool calls
        const lookAheadEnd = Math.min(i + rule.gracePeriod + 1, events.length);
        const toolsFoundInWindow = new Set<string>();

        for (let j = i + 1; j < lookAheadEnd; j++) {
          const futureEvent = events[j];
          if (
            (futureEvent.eventType === "tool_call" || futureEvent.eventType === "tool_result") &&
            futureEvent.toolName
          ) {
            toolsFoundInWindow.add(futureEvent.toolName.toLowerCase());
          }
        }

        // Check which expected tools were NOT called
        for (const expectedTool of relevantExpectedTools) {
          const wasCalled = hasMatchingToolInSet(toolsFoundInWindow, expectedTool);

          if (!wasCalled) {
            // Also check if the tool was called at ANY point in the session
            // (less severe if it was used elsewhere, just not in the expected window)
            const usedElsewhere = hasMatchingToolInSet(toolCallsMade, expectedTool);

            evidence.push({
              type: "missing_tool_call",
              description: usedElsewhere
                ? `Tool "${expectedTool}" was available and expected after ${event.eventType} (event #${event.sequenceNumber}) but was not called within ${rule.gracePeriod} events (used elsewhere in session)`
                : `Tool "${expectedTool}" was available and expected after ${event.eventType} (event #${event.sequenceNumber}) but was never called in the session`,
              eventIndex: i,
              data: {
                expectedTool,
                triggerEventType: rule.triggerEventType,
                triggerSequenceNumber: event.sequenceNumber,
                gracePeriod: rule.gracePeriod,
                usedElsewhere,
                filePath: event.codeFilePath ?? (event.eventData as any)?.path,
              },
            });
          }
        }
      }
    }

    // Deduplicate evidence (same tool missing after multiple triggers)
    const deduped = deduplicateEvidence(evidence);

    // Calculate severity
    const severity = calculateSeverity(deduped, availableTools.size);
    const triggered = severity >= 30; // Lower threshold — undertriggering is common

    return {
      detectorId: this.id,
      triggered,
      severity,
      evidence: deduped,
    };
  }
}

// ─── Helpers ───

/**
 * Check if any tool in the available set matches the expected tool name.
 * Uses fuzzy matching to handle naming variations.
 */
function hasMatchingTool(availableTools: Set<string>, expectedTool: string): boolean {
  const normalized = expectedTool.toLowerCase();
  for (const tool of Array.from(availableTools)) {
    if (tool === normalized) return true;
    if (tool.includes(normalized) || normalized.includes(tool)) return true;
    // Word overlap
    const toolWords = new Set(tool.split(/[_\-\s]/));
    const expectedWords = normalized.split(/[_\-\s]/);
    const overlap = expectedWords.filter((w) => toolWords.has(w));
    if (overlap.length > 0) return true;
  }
  return false;
}

function hasMatchingToolInSet(toolSet: Set<string>, expectedTool: string): boolean {
  const normalized = expectedTool.toLowerCase();
  for (const tool of Array.from(toolSet)) {
    if (tool === normalized) return true;
    if (tool.includes(normalized) || normalized.includes(tool)) return true;
    const toolWords = new Set(tool.split(/[_\-\s]/));
    const expectedWords = normalized.split(/[_\-\s]/);
    const overlap = expectedWords.filter((w) => toolWords.has(w));
    if (overlap.length > 0) return true;
  }
  return false;
}

/**
 * Deduplicate evidence entries for the same missing tool.
 * Keeps the first occurrence and counts total occurrences.
 */
function deduplicateEvidence(evidence: DetectorEvidence[]): DetectorEvidence[] {
  const seen = new Map<string, DetectorEvidence>();

  for (const e of evidence) {
    const key = `${(e.data as any)?.expectedTool}_${(e.data as any)?.usedElsewhere}`;
    if (!seen.has(key)) {
      seen.set(key, e);
    }
  }

  return Array.from(seen.values());
}

/**
 * Calculate severity score (0-100) based on evidence.
 */
function calculateSeverity(evidence: DetectorEvidence[], availableToolCount: number): number {
  if (evidence.length === 0) return 0;

  // Count how many unique tools were missed
  const missedTools = new Set(evidence.map((e) => (e.data as any)?.expectedTool));
  const neverUsed = evidence.filter((e) => !(e.data as any)?.usedElsewhere);

  // Base severity from count of missed tools
  const baseSeverity = Math.min(missedTools.size * 20, 60);

  // Bonus for tools that were never used at all (more severe)
  const neverUsedBonus = neverUsed.length * 10;

  // Ratio factor: missed tools vs available tools
  const ratioFactor = availableToolCount > 0 ? (missedTools.size / availableToolCount) * 20 : 0;

  return Math.min(Math.round(baseSeverity + neverUsedBonus + ratioFactor), 100);
}
