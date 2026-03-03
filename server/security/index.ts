/**
 * Security Module — Barrel Export
 * 
 * Layer 2: Security for Prysm AI
 * - Prompt injection detection
 * - PII detection & redaction
 * - Content policy enforcement
 * - Unified threat scoring
 * - LLM deep scanning (paid tiers)
 */

export {
  detectInjection,
  INJECTION_PATTERNS,
  analyzeHeuristics,
  type InjectionDetectionResult,
  type InjectionMatch,
  type InjectionPattern,
} from "./injection-detector";

export {
  detectPII,
  PII_PATTERNS,
  luhnCheck,
  hashValue,
  type PIIDetectionResult,
  type PIIMatch,
  type PIIType,
  type RedactionMode,
} from "./pii-detector";

export {
  assessThreat,
  quickThreatCheck,
  DEFAULT_CONTENT_POLICIES,
  DEFAULT_SECURITY_CONFIG,
  type ThreatAssessment,
  type ThreatLevel,
  type ThreatAction,
  type SecurityConfig,
  type ContentPolicyRule,
  type ContentPolicyMatch,
} from "./threat-scorer";

export {
  deepScanPrompt,
  mergeScanResults,
  createSkippedResult,
  isPaidPlan,
  PAID_PLANS,
  type LLMScanResult,
} from "./llm-scanner";

export {
  detectOffTopic,
  detectOffTopicKeyword,
  detectOffTopicLLM,
  type OffTopicConfig,
  type OffTopicResult,
} from "./off-topic-detector";

export {
  scoreToxicityML,
  getEmptyDimensions,
  type ToxicityScores,
  type MLToxicityResult,
  type ToxicityDimensionScore,
} from "./toxicity-scorer";

export {
  detectNER,
  calculateNERRiskScore,
  type NEREntity,
  type NEREntityType,
  type NERResult,
} from "./ner-detector";
