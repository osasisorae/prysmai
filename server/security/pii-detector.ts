/**
 * PII (Personally Identifiable Information) Detection & Redaction Engine
 * 
 * Detects and optionally redacts sensitive data in LLM prompts and responses:
 *   - Email addresses
 *   - Phone numbers (US/International)
 *   - Social Security Numbers (US)
 *   - Credit card numbers (Visa, MC, Amex, Discover)
 *   - API keys & secrets (OpenAI, Anthropic, Google, GitHub, AWS, Slack)
 *   - IP addresses
 *   - Private keys (RSA/PEM)
 * 
 * Redaction modes: mask, hash, or block
 */

import { createHash } from "crypto";

export type PIIType =
  | "email"
  | "phone"
  | "ssn"
  | "credit_card"
  | "api_key"
  | "ip_address"
  | "private_key"
  | "date_of_birth";

export type RedactionMode = "mask" | "hash" | "block" | "none";

export interface PIIPattern {
  type: PIIType;
  pattern: RegExp;
  label: string;
  maskText: string;
  validate?: (match: string) => boolean;
}

export interface PIIMatch {
  type: PIIType;
  label: string;
  matchedText: string;
  position: number;
  length: number;
}

export interface PIIDetectionResult {
  hasPII: boolean;
  matches: PIIMatch[];
  types: PIIType[];
  score: number; // 0-100
  redactedText?: string;
}

// ─── PII Pattern Definitions ────────────────────────────────────────

const PII_PATTERNS: PIIPattern[] = [
  // Email addresses
  {
    type: "email",
    pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    label: "Email Address",
    maskText: "[REDACTED_EMAIL]",
  },

  // US Phone numbers
  {
    type: "phone",
    pattern: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
    label: "Phone Number (US)",
    maskText: "[REDACTED_PHONE]",
    validate: (match: string) => {
      const digits = match.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 11;
    },
  },

  // International phone numbers
  {
    type: "phone",
    pattern: /\+[0-9]{1,4}[-.\s]?[0-9]{2,4}[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,4}\b/g,
    label: "Phone Number (International)",
    maskText: "[REDACTED_PHONE]",
    validate: (match: string) => {
      const digits = match.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 15;
    },
  },

  // US Social Security Numbers
  {
    type: "ssn",
    pattern: /\b[0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{4}\b/g,
    label: "Social Security Number",
    maskText: "[REDACTED_SSN]",
    validate: (match: string) => {
      const digits = match.replace(/\D/g, "");
      if (digits.length !== 9) return false;
      // SSNs cannot start with 000, 666, or 900-999
      const area = parseInt(digits.substring(0, 3));
      if (area === 0 || area === 666 || area >= 900) return false;
      // Group and serial cannot be all zeros
      const group = parseInt(digits.substring(3, 5));
      const serial = parseInt(digits.substring(5, 9));
      return group !== 0 && serial !== 0;
    },
  },

  // Credit card numbers (Visa, Mastercard, Amex, Discover)
  {
    type: "credit_card",
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    label: "Credit Card Number",
    maskText: "[REDACTED_CC]",
    validate: (match: string) => luhnCheck(match.replace(/\D/g, "")),
  },

  // Credit card with dashes/spaces
  {
    type: "credit_card",
    pattern: /\b(?:4[0-9]{3}|5[1-5][0-9]{2}|3[47][0-9]{1}|6(?:011|5[0-9]{1}))[-\s]?[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4}\b/g,
    label: "Credit Card Number",
    maskText: "[REDACTED_CC]",
    validate: (match: string) => luhnCheck(match.replace(/\D/g, "")),
  },

  // OpenAI API keys
  {
    type: "api_key",
    pattern: /sk-[a-zA-Z0-9]{20,}/g,
    label: "OpenAI API Key",
    maskText: "[REDACTED_API_KEY]",
  },

  // Anthropic API keys
  {
    type: "api_key",
    pattern: /sk-ant-[a-zA-Z0-9\-]{20,}/g,
    label: "Anthropic API Key",
    maskText: "[REDACTED_API_KEY]",
  },

  // Google API keys
  {
    type: "api_key",
    pattern: /AIza[0-9A-Za-z_\-]{35}/g,
    label: "Google API Key",
    maskText: "[REDACTED_API_KEY]",
  },

  // GitHub tokens
  {
    type: "api_key",
    pattern: /ghp_[a-zA-Z0-9]{36}/g,
    label: "GitHub Token",
    maskText: "[REDACTED_API_KEY]",
  },

  // Slack tokens
  {
    type: "api_key",
    pattern: /xoxb-[0-9]{10,}-[a-zA-Z0-9]{20,}/g,
    label: "Slack Token",
    maskText: "[REDACTED_API_KEY]",
  },

  // AWS Access Keys
  {
    type: "api_key",
    pattern: /(?:AKIA|ASIA)[0-9A-Z]{16}/g,
    label: "AWS Access Key",
    maskText: "[REDACTED_API_KEY]",
  },

  // Private keys (RSA/PEM)
  {
    type: "private_key",
    pattern: /-----BEGIN\s+(?:RSA\s+)?(?:PRIVATE|EC)\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+)?(?:PRIVATE|EC)\s+KEY-----/g,
    label: "Private Key",
    maskText: "[REDACTED_PRIVATE_KEY]",
  },

  // IPv4 addresses
  {
    type: "ip_address",
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    label: "IP Address",
    maskText: "[REDACTED_IP]",
    validate: (match: string) => {
      // Exclude common non-sensitive IPs
      if (match === "0.0.0.0" || match === "127.0.0.1" || match === "255.255.255.255") return false;
      if (match.startsWith("192.168.") || match.startsWith("10.") || match.startsWith("172.")) return true;
      return true;
    },
  },

  // Dates of birth (MM/DD/YYYY or MM-DD-YYYY)
  {
    type: "date_of_birth",
    pattern: /\b(?:0[1-9]|1[0-2])[\/\-](?:0[1-9]|[12][0-9]|3[01])[\/\-](?:19|20)[0-9]{2}\b/g,
    label: "Date of Birth",
    maskText: "[REDACTED_DOB]",
  },
];

// ─── Luhn Check for Credit Cards ────────────────────────────────────

function luhnCheck(num: string): boolean {
  if (num.length < 13 || num.length > 19) return false;
  let sum = 0;
  let alternate = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

// ─── Hash Function for Redaction ────────────────────────────────────

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex").substring(0, 12);
}

// ─── PII Severity Weights ───────────────────────────────────────────

const PII_SEVERITY: Record<PIIType, number> = {
  credit_card: 15,
  ssn: 15,
  private_key: 15,
  api_key: 12,
  email: 5,
  phone: 5,
  ip_address: 3,
  date_of_birth: 5,
};

// ─── Main Detection Function ────────────────────────────────────────

export function detectPII(
  text: string,
  redactionMode: RedactionMode = "none"
): PIIDetectionResult {
  const matches: PIIMatch[] = [];
  let redactedText = text;

  // Collect all matches with deduplication
  const seenPositions = new Set<string>();

  for (const piiPattern of PII_PATTERNS) {
    // Reset regex lastIndex for global patterns
    piiPattern.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = piiPattern.pattern.exec(text)) !== null) {
      const posKey = `${match.index}:${match[0].length}`;

      // Skip if we've already matched this position
      if (seenPositions.has(posKey)) continue;

      // Run validation if available
      if (piiPattern.validate && !piiPattern.validate(match[0])) continue;

      seenPositions.add(posKey);

      matches.push({
        type: piiPattern.type,
        label: piiPattern.label,
        matchedText: match[0],
        position: match.index,
        length: match[0].length,
      });
    }
  }

  // Sort matches by position (descending) for safe replacement
  const sortedMatches = [...matches].sort((a, b) => b.position - a.position);

  // Apply redaction if requested
  if (redactionMode !== "none" && matches.length > 0) {
    for (const m of sortedMatches) {
      let replacement: string;
      switch (redactionMode) {
        case "mask":
          replacement = PII_PATTERNS.find(
            (p) => p.type === m.type
          )!.maskText;
          break;
        case "hash":
          replacement = `[HASH:${hashValue(m.matchedText)}]`;
          break;
        case "block":
          replacement = "[BLOCKED]";
          break;
        default:
          replacement = m.matchedText;
      }
      redactedText =
        redactedText.substring(0, m.position) +
        replacement +
        redactedText.substring(m.position + m.length);
    }
  }

  // Calculate score based on PII types and counts
  const score = Math.min(
    100,
    matches.reduce((sum, m) => sum + (PII_SEVERITY[m.type] || 5), 0)
  );

  // Get unique PII types
  const types = Array.from(new Set(matches.map((m) => m.type)));

  return {
    hasPII: matches.length > 0,
    matches,
    types,
    score,
    redactedText: redactionMode !== "none" ? redactedText : undefined,
  };
}

// ─── Exports for testing ────────────────────────────────────────────

export { PII_PATTERNS, luhnCheck, hashValue };
