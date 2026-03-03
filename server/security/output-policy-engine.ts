/**
 * Output Policy Compliance Engine
 *
 * Evaluates LLM output text against the project's content policy rules.
 * Runs as step 5 in the async output scanning pipeline (after PII, toxicity, ML toxicity, NER).
 *
 * Supports three rule types:
 *   - keyword: pipe-delimited keyword matching
 *   - regex: regular expression pattern matching
 *   - topic: multi-keyword proximity matching (≥2 indicators)
 *
 * Each rule can specify an action: log, warn, or block.
 * The engine returns a list of policy violations with severity scores.
 *
 * Blueprint Section 5.4 — Output Policy Compliance
 */

import {
  type ContentPolicyRule,
  type ContentPolicyMatch,
  DEFAULT_CONTENT_POLICIES,
} from "./threat-scorer";

// ─── Types ──────────────────────────────────────────────────────────

export interface OutputPolicyResult {
  /** Whether policy compliance scanning was performed */
  scanned: boolean;
  /** Total number of policy violations found */
  violationCount: number;
  /** Policy violations with details */
  violations: ContentPolicyMatch[];
  /** Composite policy score (0-100) */
  policyScore: number;
  /** Whether any violation requires blocking */
  shouldBlock: boolean;
  /** Whether any violation requires a warning */
  shouldWarn: boolean;
  /** Categories of violated policies */
  violatedPolicies: string[];
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

// ─── Policy Evaluation ──────────────────────────────────────────────

/**
 * Evaluate a single content policy rule against output text.
 * Returns a match if the rule is violated, null otherwise.
 */
export function evaluateRule(
  text: string,
  rule: ContentPolicyRule
): ContentPolicyMatch | null {
  const lowerText = text.toLowerCase();

  switch (rule.type) {
    case "keyword": {
      const keywords = rule.pattern
        .split("|")
        .map((k) => k.trim().toLowerCase());
      for (const keyword of keywords) {
        if (keyword && lowerText.includes(keyword)) {
          return {
            ruleName: rule.name,
            ruleType: rule.type,
            matchedText: keyword,
            severity: rule.severity,
            action: rule.action,
          };
        }
      }
      return null;
    }

    case "regex": {
      try {
        const regex = new RegExp(rule.pattern, "i");
        const match = regex.exec(text);
        if (match) {
          return {
            ruleName: rule.name,
            ruleType: rule.type,
            matchedText: match[0].substring(0, 100),
            severity: rule.severity,
            action: rule.action,
          };
        }
      } catch {
        // Invalid regex — skip silently
      }
      return null;
    }

    case "topic": {
      const topicWords = rule.pattern
        .split("|")
        .map((k) => k.trim().toLowerCase());
      const matchCount = topicWords.filter((w) => w && lowerText.includes(w)).length;
      // Topic rules require ≥2 indicator words to match
      if (matchCount >= 2) {
        return {
          ruleName: rule.name,
          ruleType: rule.type,
          matchedText: `topic:${rule.name} (${matchCount}/${topicWords.length} indicators)`,
          severity: rule.severity,
          action: rule.action,
        };
      }
      return null;
    }

    default:
      return null;
  }
}

/**
 * Evaluate all content policy rules against output text.
 * Uses both the project's custom policies and the default built-in policies.
 */
export function evaluateOutputPolicies(
  completionText: string,
  customPolicies?: ContentPolicyRule[],
  includeDefaults: boolean = true
): OutputPolicyResult {
  const startTime = Date.now();

  if (!completionText.trim()) {
    return {
      scanned: true,
      violationCount: 0,
      violations: [],
      policyScore: 0,
      shouldBlock: false,
      shouldWarn: false,
      violatedPolicies: [],
      processingTimeMs: Date.now() - startTime,
    };
  }

  // Combine default policies with custom policies
  const allPolicies: ContentPolicyRule[] = [];
  if (includeDefaults) {
    allPolicies.push(...DEFAULT_CONTENT_POLICIES);
  }
  if (customPolicies && customPolicies.length > 0) {
    allPolicies.push(...customPolicies);
  }

  const violations: ContentPolicyMatch[] = [];

  for (const rule of allPolicies) {
    const match = evaluateRule(completionText, rule);
    if (match) {
      violations.push(match);
    }
  }

  // Calculate composite policy score (0-100)
  // Each violation contributes its severity * 8 (max 10 * 8 = 80 per violation)
  // Multiple violations stack but cap at 100
  const rawScore = violations.reduce((sum, v) => sum + v.severity * 8, 0);
  const policyScore = Math.min(100, rawScore);

  // Determine actions
  const shouldBlock = violations.some((v) => v.action === "block");
  const shouldWarn = !shouldBlock && violations.some((v) => v.action === "flag");

  // Unique policy names
  const violatedPolicies = Array.from(
    new Set(violations.map((v) => v.ruleName))
  );

  return {
    scanned: true,
    violationCount: violations.length,
    violations,
    policyScore,
    shouldBlock,
    shouldWarn,
    violatedPolicies,
    processingTimeMs: Date.now() - startTime,
  };
}

/**
 * Create a skipped result when policy compliance is disabled.
 */
export function createSkippedPolicyResult(): OutputPolicyResult {
  return {
    scanned: false,
    violationCount: 0,
    violations: [],
    policyScore: 0,
    shouldBlock: false,
    shouldWarn: false,
    violatedPolicies: [],
    processingTimeMs: 0,
  };
}
