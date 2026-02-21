/**
 * Content Policy Enforcement & Threat Scoring Engine
 * 
 * Combines injection detection + PII detection + content policy checks
 * into a unified threat score (0-100) with configurable actions.
 * 
 * Threat levels:
 *   0-20:  Clean  (green)  — pass through
 *   21-50: Low    (yellow) — log only
 *   51-75: Medium (orange) — warn (add header)
 *   76-100: High  (red)    — block (if enabled)
 */

import { detectInjection, type InjectionDetectionResult } from "./injection-detector";
import { detectPII, type PIIDetectionResult, type RedactionMode } from "./pii-detector";

// ─── Types ──────────────────────────────────────────────────────────

export type ThreatLevel = "clean" | "low" | "medium" | "high";
export type ThreatAction = "pass" | "log" | "warn" | "block";

export interface ContentPolicyRule {
  name: string;
  type: "keyword" | "regex" | "topic";
  pattern: string;
  severity: number; // 1-10
  action: "flag" | "block";
  description: string;
}

export interface SecurityConfig {
  injectionDetection: boolean;
  piiDetection: boolean;
  piiRedactionMode: RedactionMode;
  contentPolicies: ContentPolicyRule[];
  blockHighThreats: boolean;
  customKeywords: string[];
}

export interface ContentPolicyMatch {
  ruleName: string;
  ruleType: string;
  matchedText: string;
  severity: number;
  action: string;
}

export interface ThreatAssessment {
  // Composite
  threatScore: number;
  threatLevel: ThreatLevel;
  action: ThreatAction;
  summary: string;

  // Breakdown
  injectionResult: InjectionDetectionResult | null;
  piiResult: PIIDetectionResult | null;
  policyMatches: ContentPolicyMatch[];

  // Scores
  injectionScore: number;
  piiScore: number;
  policyScore: number;

  // Redacted text (if PII redaction enabled)
  redactedText?: string;

  // Timing
  processingTimeMs: number;
}

// ─── Default Content Policies ───────────────────────────────────────

export const DEFAULT_CONTENT_POLICIES: ContentPolicyRule[] = [
  {
    name: "malware_instructions",
    type: "keyword",
    pattern: "write malware|create virus|build ransomware|make trojan|code exploit|write keylogger",
    severity: 10,
    action: "block",
    description: "Requests for malware creation",
  },
  {
    name: "weapon_instructions",
    type: "keyword",
    pattern: "how to make a bomb|build explosive|create weapon|synthesize poison|manufacture drugs",
    severity: 10,
    action: "block",
    description: "Requests for weapon/explosive instructions",
  },
  {
    name: "illegal_activity",
    type: "keyword",
    pattern: "hack into|break into system|steal credentials|phishing attack|social engineer|ddos attack",
    severity: 9,
    action: "block",
    description: "Requests for illegal hacking activities",
  },
  {
    name: "data_exfiltration",
    type: "keyword",
    pattern: "exfiltrate data|steal database|dump credentials|extract passwords|bypass authentication",
    severity: 9,
    action: "flag",
    description: "Data exfiltration language",
  },
  {
    name: "harmful_content",
    type: "keyword",
    pattern: "self-harm|suicide method|how to kill|torture technique",
    severity: 10,
    action: "block",
    description: "Requests for harmful content",
  },
];

// ─── Default Security Config ────────────────────────────────────────

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  injectionDetection: true,
  piiDetection: true,
  piiRedactionMode: "none",
  contentPolicies: DEFAULT_CONTENT_POLICIES,
  blockHighThreats: false, // Default to logging only, user enables blocking
  customKeywords: [],
};

// ─── Content Policy Checker ─────────────────────────────────────────

function checkContentPolicies(
  text: string,
  policies: ContentPolicyRule[],
  customKeywords: string[]
): ContentPolicyMatch[] {
  const matches: ContentPolicyMatch[] = [];
  const lowerText = text.toLowerCase();

  // Check built-in and custom policies
  for (const rule of policies) {
    let matched = false;
    let matchedText = "";

    switch (rule.type) {
      case "keyword": {
        const keywords = rule.pattern.split("|").map((k) => k.trim().toLowerCase());
        for (const keyword of keywords) {
          if (lowerText.includes(keyword)) {
            matched = true;
            matchedText = keyword;
            break;
          }
        }
        break;
      }
      case "regex": {
        try {
          const regex = new RegExp(rule.pattern, "i");
          const match = regex.exec(text);
          if (match) {
            matched = true;
            matchedText = match[0].substring(0, 100);
          }
        } catch {
          // Invalid regex, skip
        }
        break;
      }
      case "topic": {
        // Topic matching uses keyword proximity
        const topicWords = rule.pattern.split("|").map((k) => k.trim().toLowerCase());
        const matchCount = topicWords.filter((w) => lowerText.includes(w)).length;
        if (matchCount >= 2) {
          matched = true;
          matchedText = `topic:${rule.name} (${matchCount} indicators)`;
        }
        break;
      }
    }

    if (matched) {
      matches.push({
        ruleName: rule.name,
        ruleType: rule.type,
        matchedText,
        severity: rule.severity,
        action: rule.action,
      });
    }
  }

  // Check custom keywords
  for (const keyword of customKeywords) {
    if (keyword && lowerText.includes(keyword.toLowerCase())) {
      matches.push({
        ruleName: "custom_keyword",
        ruleType: "keyword",
        matchedText: keyword,
        severity: 5,
        action: "flag",
      });
    }
  }

  return matches;
}

// ─── Threat Level Determination ─────────────────────────────────────

function getThreatLevel(score: number): ThreatLevel {
  if (score <= 20) return "clean";
  if (score <= 50) return "low";
  if (score <= 75) return "medium";
  return "high";
}

function getAction(
  level: ThreatLevel,
  blockHighThreats: boolean,
  hasBlockPolicy: boolean
): ThreatAction {
  if (hasBlockPolicy) return "block";
  if (level === "clean") return "pass";
  if (level === "low") return "log";
  if (level === "medium") return "warn";
  // High
  return blockHighThreats ? "block" : "warn";
}

function buildSummary(
  injectionResult: InjectionDetectionResult | null,
  piiResult: PIIDetectionResult | null,
  policyMatches: ContentPolicyMatch[]
): string {
  const parts: string[] = [];

  if (injectionResult && injectionResult.isInjection) {
    const categories = Array.from(
      new Set(injectionResult.matches.map((m) => m.category))
    );
    parts.push(
      `Injection detected (${injectionResult.riskLevel}): ${categories.join(", ")}`
    );
  }

  if (piiResult && piiResult.hasPII) {
    const types = piiResult.types;
    parts.push(`PII found: ${types.join(", ")} (${piiResult.matches.length} instances)`);
  }

  if (policyMatches.length > 0) {
    const ruleNames = policyMatches.map((m) => m.ruleName);
    parts.push(`Policy violations: ${ruleNames.join(", ")}`);
  }

  if (parts.length === 0) return "No threats detected";
  return parts.join("; ");
}

// ─── Main Assessment Function ───────────────────────────────────────

export function assessThreat(
  text: string,
  config: Partial<SecurityConfig> = {}
): ThreatAssessment {
  const startTime = Date.now();
  const fullConfig: SecurityConfig = { ...DEFAULT_SECURITY_CONFIG, ...config };

  // Run injection detection
  let injectionResult: InjectionDetectionResult | null = null;
  let injectionScore = 0;
  if (fullConfig.injectionDetection) {
    injectionResult = detectInjection(text);
    // Scale injection score to 0-40 range
    injectionScore = Math.min(40, Math.round(injectionResult.score * 0.4));
  }

  // Run PII detection
  let piiResult: PIIDetectionResult | null = null;
  let piiScore = 0;
  if (fullConfig.piiDetection) {
    piiResult = detectPII(text, fullConfig.piiRedactionMode);
    // Scale PII score to 0-30 range
    piiScore = Math.min(30, Math.round(piiResult.score * 0.3));
  }

  // Run content policy checks
  const policyMatches = checkContentPolicies(
    text,
    fullConfig.contentPolicies,
    fullConfig.customKeywords
  );
  // Scale policy score to 0-30 range
  const policyScore = Math.min(
    30,
    policyMatches.reduce((sum, m) => sum + m.severity * 3, 0)
  );

  // Calculate composite threat score
  const threatScore = Math.min(100, injectionScore + piiScore + policyScore);
  const threatLevel = getThreatLevel(threatScore);

  // Check if any policy match has "block" action
  const hasBlockPolicy = policyMatches.some((m) => m.action === "block");
  const action = getAction(threatLevel, fullConfig.blockHighThreats, hasBlockPolicy);

  const processingTimeMs = Date.now() - startTime;

  return {
    threatScore,
    threatLevel,
    action,
    summary: buildSummary(injectionResult, piiResult, policyMatches),
    injectionResult,
    piiResult,
    policyMatches,
    injectionScore,
    piiScore,
    policyScore,
    redactedText: piiResult?.redactedText,
    processingTimeMs,
  };
}

// ─── Quick Check (lightweight, for high-throughput) ─────────────────

export function quickThreatCheck(text: string): {
  threatLevel: ThreatLevel;
  shouldBlock: boolean;
} {
  const result = assessThreat(text, {
    piiDetection: false, // Skip PII for speed
    contentPolicies: DEFAULT_CONTENT_POLICIES,
  });
  return {
    threatLevel: result.threatLevel,
    shouldBlock: result.action === "block",
  };
}
