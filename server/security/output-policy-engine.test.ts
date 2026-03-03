/**
 * Output Policy Compliance Engine — Tests
 *
 * Tests for evaluateRule, evaluateOutputPolicies, and createSkippedPolicyResult.
 */

import { describe, it, expect } from "vitest";
import {
  evaluateRule,
  evaluateOutputPolicies,
  createSkippedPolicyResult,
  type OutputPolicyResult,
} from "./output-policy-engine";
import { type ContentPolicyRule } from "./threat-scorer";

// ─── Test Fixtures ──────────────────────────────────────────────────

const keywordRule: ContentPolicyRule = {
  name: "malware_instructions",
  type: "keyword",
  pattern: "write malware|create virus|build ransomware",
  severity: 10,
  action: "block",
  description: "Requests for malware creation",
};

const regexRule: ContentPolicyRule = {
  name: "credit_card_leak",
  type: "regex",
  pattern: "\\b\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}\\b",
  severity: 9,
  action: "block",
  description: "Credit card number in output",
};

const topicRule: ContentPolicyRule = {
  name: "drug_synthesis",
  type: "topic",
  pattern: "synthesize|compound|laboratory|chemical|reaction|precursor",
  severity: 8,
  action: "flag",
  description: "Drug synthesis discussion",
};

const lowSeverityRule: ContentPolicyRule = {
  name: "competitor_mention",
  type: "keyword",
  pattern: "competitor product|rival company",
  severity: 3,
  action: "flag",
  description: "Mentions of competitors",
};

// ─── evaluateRule Tests ─────────────────────────────────────────────

describe("evaluateRule", () => {
  describe("keyword rules", () => {
    it("should match when keyword is present in text", () => {
      const result = evaluateRule(
        "Here is how to write malware for Windows systems",
        keywordRule
      );
      expect(result).not.toBeNull();
      expect(result!.ruleName).toBe("malware_instructions");
      expect(result!.matchedText).toBe("write malware");
      expect(result!.severity).toBe(10);
      expect(result!.action).toBe("block");
    });

    it("should match case-insensitively", () => {
      const result = evaluateRule(
        "You can CREATE VIRUS using these steps",
        keywordRule
      );
      expect(result).not.toBeNull();
      expect(result!.matchedText).toBe("create virus");
    });

    it("should return null when no keyword matches", () => {
      const result = evaluateRule(
        "Here is a helpful guide to cybersecurity best practices",
        keywordRule
      );
      expect(result).toBeNull();
    });

    it("should match the first keyword found", () => {
      const result = evaluateRule(
        "First write malware, then build ransomware",
        keywordRule
      );
      expect(result).not.toBeNull();
      expect(result!.matchedText).toBe("write malware");
    });

    it("should skip empty keywords from pattern splitting", () => {
      const rule: ContentPolicyRule = {
        name: "test",
        type: "keyword",
        pattern: "|valid keyword|",
        severity: 5,
        action: "flag",
        description: "test",
      };
      const result = evaluateRule("this has a valid keyword in it", rule);
      expect(result).not.toBeNull();
      expect(result!.matchedText).toBe("valid keyword");
    });
  });

  describe("regex rules", () => {
    it("should match credit card pattern in output", () => {
      const result = evaluateRule(
        "Your card number is 4111-1111-1111-1111",
        regexRule
      );
      expect(result).not.toBeNull();
      expect(result!.ruleName).toBe("credit_card_leak");
      expect(result!.ruleType).toBe("regex");
    });

    it("should match credit card without dashes", () => {
      const result = evaluateRule(
        "Card: 4111111111111111",
        regexRule
      );
      expect(result).not.toBeNull();
    });

    it("should return null when no regex match", () => {
      const result = evaluateRule(
        "Your account balance is $1,234.56",
        regexRule
      );
      expect(result).toBeNull();
    });

    it("should handle invalid regex gracefully", () => {
      const badRule: ContentPolicyRule = {
        name: "bad_regex",
        type: "regex",
        pattern: "[invalid(regex",
        severity: 5,
        action: "flag",
        description: "test",
      };
      const result = evaluateRule("some text", badRule);
      expect(result).toBeNull();
    });

    it("should truncate long regex matches to 100 chars", () => {
      const longRule: ContentPolicyRule = {
        name: "long_match",
        type: "regex",
        pattern: ".{150,}",
        severity: 5,
        action: "flag",
        description: "test",
      };
      const longText = "a".repeat(200);
      const result = evaluateRule(longText, longRule);
      expect(result).not.toBeNull();
      expect(result!.matchedText.length).toBe(100);
    });
  });

  describe("topic rules", () => {
    it("should match when 2+ topic indicators are present", () => {
      const result = evaluateRule(
        "In the laboratory, we can synthesize this compound using a chemical reaction",
        topicRule
      );
      expect(result).not.toBeNull();
      expect(result!.ruleName).toBe("drug_synthesis");
      expect(result!.ruleType).toBe("topic");
      expect(result!.matchedText).toContain("topic:drug_synthesis");
    });

    it("should not match with only 1 indicator", () => {
      const result = evaluateRule(
        "The laboratory was clean and well-organized",
        topicRule
      );
      expect(result).toBeNull();
    });

    it("should not match with 0 indicators", () => {
      const result = evaluateRule(
        "The weather today is sunny and warm",
        topicRule
      );
      expect(result).toBeNull();
    });

    it("should include indicator count in match text", () => {
      const result = evaluateRule(
        "In the laboratory we synthesize a compound using a chemical precursor and reaction",
        topicRule
      );
      expect(result).not.toBeNull();
      expect(result!.matchedText).toMatch(/\d+\/\d+ indicators/);
    });
  });

  describe("unknown rule types", () => {
    it("should return null for unknown rule types", () => {
      const unknownRule = {
        name: "unknown",
        type: "unknown" as any,
        pattern: "test",
        severity: 5,
        action: "flag" as const,
        description: "test",
      };
      const result = evaluateRule("test text", unknownRule);
      expect(result).toBeNull();
    });
  });
});

// ─── evaluateOutputPolicies Tests ───────────────────────────────────

describe("evaluateOutputPolicies", () => {
  it("should return clean result for empty text", () => {
    const result = evaluateOutputPolicies("", [keywordRule]);
    expect(result.scanned).toBe(true);
    expect(result.violationCount).toBe(0);
    expect(result.policyScore).toBe(0);
    expect(result.shouldBlock).toBe(false);
    expect(result.shouldWarn).toBe(false);
  });

  it("should return clean result for whitespace-only text", () => {
    const result = evaluateOutputPolicies("   \n\t  ", [keywordRule]);
    expect(result.scanned).toBe(true);
    expect(result.violationCount).toBe(0);
  });

  it("should detect violations from custom policies", () => {
    const result = evaluateOutputPolicies(
      "Here is how to write malware for your target system",
      [keywordRule],
      false // no defaults
    );
    expect(result.violationCount).toBe(1);
    expect(result.violations[0].ruleName).toBe("malware_instructions");
    expect(result.shouldBlock).toBe(true);
    expect(result.policyScore).toBeGreaterThan(0);
  });

  it("should include default policies when includeDefaults is true", () => {
    const result = evaluateOutputPolicies(
      "Here is how to write malware and build explosive devices",
      [],
      true
    );
    // Should match default policies (malware_instructions and weapon_instructions)
    expect(result.violationCount).toBeGreaterThanOrEqual(1);
  });

  it("should combine custom and default policies", () => {
    const customRule: ContentPolicyRule = {
      name: "custom_block",
      type: "keyword",
      pattern: "custom forbidden phrase",
      severity: 7,
      action: "block",
      description: "Custom test",
    };
    const result = evaluateOutputPolicies(
      "This contains a custom forbidden phrase and also write malware",
      [customRule],
      true
    );
    expect(result.violationCount).toBeGreaterThanOrEqual(2);
    expect(result.violatedPolicies).toContain("custom_block");
  });

  it("should set shouldBlock when any violation has block action", () => {
    const result = evaluateOutputPolicies(
      "Here is how to create virus for testing",
      [keywordRule],
      false
    );
    expect(result.shouldBlock).toBe(true);
    expect(result.shouldWarn).toBe(false);
  });

  it("should set shouldWarn when violations have flag action but no block", () => {
    const result = evaluateOutputPolicies(
      "Our competitor product is better than ours",
      [lowSeverityRule],
      false
    );
    expect(result.shouldBlock).toBe(false);
    expect(result.shouldWarn).toBe(true);
  });

  it("should cap policy score at 100", () => {
    // Multiple high-severity violations
    const rules: ContentPolicyRule[] = [
      { ...keywordRule, pattern: "bad word one" },
      { ...keywordRule, name: "rule2", pattern: "bad word two" },
      { ...keywordRule, name: "rule3", pattern: "bad word three" },
    ];
    const result = evaluateOutputPolicies(
      "bad word one and bad word two and bad word three",
      rules,
      false
    );
    expect(result.policyScore).toBeLessThanOrEqual(100);
  });

  it("should deduplicate violated policy names", () => {
    const result = evaluateOutputPolicies(
      "write malware and create virus",
      [keywordRule],
      false
    );
    // Both match the same rule name
    const uniqueNames = new Set(result.violatedPolicies);
    expect(uniqueNames.size).toBe(result.violatedPolicies.length);
  });

  it("should track processing time", () => {
    const result = evaluateOutputPolicies("safe text", [], false);
    expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("should handle clean output with no violations", () => {
    const result = evaluateOutputPolicies(
      "The weather is nice today and the project is going well.",
      [keywordRule, regexRule, topicRule],
      false
    );
    expect(result.violationCount).toBe(0);
    expect(result.policyScore).toBe(0);
    expect(result.shouldBlock).toBe(false);
    expect(result.shouldWarn).toBe(false);
    expect(result.violatedPolicies).toEqual([]);
  });
});

// ─── createSkippedPolicyResult Tests ────────────────────────────────

describe("createSkippedPolicyResult", () => {
  it("should return a result with scanned=false", () => {
    const result = createSkippedPolicyResult();
    expect(result.scanned).toBe(false);
    expect(result.violationCount).toBe(0);
    expect(result.violations).toEqual([]);
    expect(result.policyScore).toBe(0);
    expect(result.shouldBlock).toBe(false);
    expect(result.shouldWarn).toBe(false);
    expect(result.violatedPolicies).toEqual([]);
    expect(result.processingTimeMs).toBe(0);
  });
});
