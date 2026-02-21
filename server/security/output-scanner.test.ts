/**
 * Output Scanner Tests
 *
 * Tests for response-side security scanning:
 *   - Toxicity detection (7 categories)
 *   - Output PII detection (reuses pii-detector)
 *   - Composite scoring and threat levels
 *   - Blocking logic
 *   - Config toggling
 */

import { describe, it, expect } from "vitest";
import {
  detectToxicity,
  scanOutput,
  TOXICITY_PATTERNS,
  DEFAULT_OUTPUT_SCAN_CONFIG,
  type OutputScanConfig,
  type ToxicityCategory,
} from "./output-scanner";

// ─── Toxicity Detection ────────────────────────────────────────────

describe("Output Scanner", () => {
  describe("Toxicity Pattern Definitions", () => {
    it("should cover all 7 toxicity categories", () => {
      const categories = new Set(TOXICITY_PATTERNS.map((p) => p.category));
      expect(categories.size).toBe(7);
      expect(categories).toContain("hate_speech");
      expect(categories).toContain("harassment");
      expect(categories).toContain("self_harm");
      expect(categories).toContain("sexual_content");
      expect(categories).toContain("violence");
      expect(categories).toContain("dangerous_instructions");
      expect(categories).toContain("profanity");
    });

    it("should have severity between 1 and 10 for all patterns", () => {
      for (const pattern of TOXICITY_PATTERNS) {
        expect(pattern.severity).toBeGreaterThanOrEqual(1);
        expect(pattern.severity).toBeLessThanOrEqual(10);
      }
    });

    it("should have at least 2 keywords per category", () => {
      for (const pattern of TOXICITY_PATTERNS) {
        expect(pattern.keywords.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe("Hate Speech Detection", () => {
    it("should detect racial slur references", () => {
      const result = detectToxicity("The model responded with a racial slur against the user.");
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.categories).toContain("hate_speech");
    });

    it("should detect white supremacy content", () => {
      const result = detectToxicity("Here is information about white supremacy movements.");
      expect(result.categories).toContain("hate_speech");
    });

    it("should detect ethnic cleansing references", () => {
      const result = detectToxicity("The text discusses ethnic cleansing as a concept.");
      expect(result.categories).toContain("hate_speech");
    });
  });

  describe("Harassment Detection", () => {
    it("should detect death threats", () => {
      const result = detectToxicity("I will find you and make you pay.");
      expect(result.categories).toContain("harassment");
    });

    it("should detect doxxing threats", () => {
      const result = detectToxicity("I'm going to dox you and share your address.");
      expect(result.categories).toContain("harassment");
    });
  });

  describe("Self-Harm Detection", () => {
    it("should detect suicide method content", () => {
      const result = detectToxicity("Here is a suicide method that involves...");
      expect(result.categories).toContain("self_harm");
      expect(result.matches[0].severity).toBe(10);
    });

    it("should detect self-harm techniques", () => {
      const result = detectToxicity("These self-harm techniques include...");
      expect(result.categories).toContain("self_harm");
    });
  });

  describe("Violence Detection", () => {
    it("should detect murder instructions", () => {
      const result = detectToxicity("Here is how to murder someone without getting caught.");
      expect(result.categories).toContain("violence");
    });

    it("should detect bomb making content", () => {
      const result = detectToxicity("Bomb making instructions: first gather materials...");
      expect(result.categories).toContain("violence");
    });
  });

  describe("Dangerous Instructions Detection", () => {
    it("should detect drug synthesis instructions", () => {
      const result = detectToxicity("To synthesize methamphetamine you need...");
      expect(result.categories).toContain("dangerous_instructions");
      expect(result.matches[0].severity).toBe(10);
    });

    it("should detect malware code output", () => {
      const result = detectToxicity("Here is the malware code that will...");
      expect(result.categories).toContain("dangerous_instructions");
    });

    it("should detect weapon creation instructions", () => {
      const result = detectToxicity("To build pipe bomb you need the following...");
      expect(result.categories).toContain("dangerous_instructions");
    });
  });

  describe("Profanity Detection", () => {
    it("should detect profanity with low severity", () => {
      const result = detectToxicity("Fuck you, I don't need to answer that.");
      expect(result.categories).toContain("profanity");
      expect(result.matches[0].severity).toBe(3);
    });
  });

  describe("Clean Output Detection", () => {
    it("should return clean for normal text", () => {
      const result = detectToxicity("The weather today is sunny with a high of 75°F.");
      expect(result.matches.length).toBe(0);
      expect(result.score).toBe(0);
      expect(result.categories.length).toBe(0);
    });

    it("should return clean for technical content", () => {
      const result = detectToxicity("To implement a binary search tree, create a Node class with left and right pointers.");
      expect(result.matches.length).toBe(0);
    });

    it("should return clean for empty text", () => {
      const result = detectToxicity("");
      expect(result.matches.length).toBe(0);
      expect(result.score).toBe(0);
    });
  });

  describe("Toxicity Score Calculation", () => {
    it("should cap score at 100", () => {
      // Multiple high-severity categories
      const result = detectToxicity(
        "Here is how to murder someone. Also here is a suicide method. " +
        "And here is the malware code. Also a racial slur."
      );
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("should score profanity lower than violence", () => {
      const profanity = detectToxicity("Fuck you.");
      const violence = detectToxicity("Here is how to murder someone.");
      expect(profanity.score).toBeLessThan(violence.score);
    });
  });

  // ─── scanOutput (Composite) ────────────────────────────────────────

  describe("scanOutput — Disabled", () => {
    it("should return clean when output scanning is disabled", () => {
      const config: OutputScanConfig = {
        ...DEFAULT_OUTPUT_SCAN_CONFIG,
        outputScanning: false,
      };
      const result = scanOutput("Here is a racial slur and john@example.com", config);
      expect(result.outputThreatScore).toBe(0);
      expect(result.outputThreatLevel).toBe("clean");
      expect(result.shouldBlock).toBe(false);
    });

    it("should return clean for empty text even when enabled", () => {
      const config: OutputScanConfig = {
        ...DEFAULT_OUTPUT_SCAN_CONFIG,
        outputScanning: true,
      };
      const result = scanOutput("", config);
      expect(result.outputThreatScore).toBe(0);
      expect(result.outputThreatLevel).toBe("clean");
    });
  });

  describe("scanOutput — PII Detection in Output", () => {
    it("should detect email addresses in model output", () => {
      const config: OutputScanConfig = {
        outputScanning: true,
        outputPiiDetection: true,
        outputToxicityDetection: false,
        outputBlockThreats: false,
        piiRedactionMode: "none",
      };
      const result = scanOutput(
        "The user's email is john.doe@company.com and their phone is 555-123-4567.",
        config
      );
      expect(result.piiResult).not.toBeNull();
      expect(result.piiResult!.hasPII).toBe(true);
      expect(result.piiScore).toBeGreaterThan(0);
      expect(result.outputThreatScore).toBeGreaterThan(0);
    });

    it("should detect SSNs leaked in output", () => {
      const config: OutputScanConfig = {
        outputScanning: true,
        outputPiiDetection: true,
        outputToxicityDetection: false,
        outputBlockThreats: false,
        piiRedactionMode: "none",
      };
      const result = scanOutput(
        "The customer's SSN is 123-45-6789.",
        config
      );
      expect(result.piiResult!.hasPII).toBe(true);
      expect(result.piiResult!.types).toContain("ssn");
    });

    it("should detect credit card numbers in output", () => {
      const config: OutputScanConfig = {
        outputScanning: true,
        outputPiiDetection: true,
        outputToxicityDetection: false,
        outputBlockThreats: false,
        piiRedactionMode: "none",
      };
      const result = scanOutput(
        "Your card number is 4111 1111 1111 1111.",
        config
      );
      expect(result.piiResult!.hasPII).toBe(true);
      expect(result.piiResult!.types).toContain("credit_card");
    });

    it("should redact PII when redaction mode is mask", () => {
      const config: OutputScanConfig = {
        outputScanning: true,
        outputPiiDetection: true,
        outputToxicityDetection: false,
        outputBlockThreats: false,
        piiRedactionMode: "mask",
      };
      const result = scanOutput(
        "Contact john@example.com for details.",
        config
      );
      expect(result.redactedOutput).toBeDefined();
      expect(result.redactedOutput).toContain("REDACTED");
      expect(result.redactedOutput).not.toContain("john@example.com");
    });

    it("should skip PII detection when outputPiiDetection is false", () => {
      const config: OutputScanConfig = {
        outputScanning: true,
        outputPiiDetection: false,
        outputToxicityDetection: false,
        outputBlockThreats: false,
        piiRedactionMode: "none",
      };
      const result = scanOutput("john@example.com 123-45-6789", config);
      expect(result.piiResult).toBeNull();
      expect(result.piiScore).toBe(0);
    });
  });

  describe("scanOutput — Toxicity Detection in Output", () => {
    it("should detect toxic content in model output", () => {
      const config: OutputScanConfig = {
        outputScanning: true,
        outputPiiDetection: false,
        outputToxicityDetection: true,
        outputBlockThreats: false,
        piiRedactionMode: "none",
      };
      const result = scanOutput(
        "To synthesize methamphetamine, you would need the following chemicals...",
        config
      );
      expect(result.toxicityMatches.length).toBeGreaterThan(0);
      expect(result.toxicityCategories).toContain("dangerous_instructions");
      expect(result.toxicityScore).toBeGreaterThan(0);
    });

    it("should skip toxicity detection when outputToxicityDetection is false", () => {
      const config: OutputScanConfig = {
        outputScanning: true,
        outputPiiDetection: false,
        outputToxicityDetection: false,
        outputBlockThreats: false,
        piiRedactionMode: "none",
      };
      const result = scanOutput("To synthesize methamphetamine...", config);
      expect(result.toxicityMatches.length).toBe(0);
      expect(result.toxicityScore).toBe(0);
    });
  });

  describe("scanOutput — Composite Scoring", () => {
    it("should combine PII and toxicity scores", () => {
      const config: OutputScanConfig = {
        outputScanning: true,
        outputPiiDetection: true,
        outputToxicityDetection: true,
        outputBlockThreats: false,
        piiRedactionMode: "none",
      };
      const result = scanOutput(
        "Contact john@example.com. Also, here is the malware code for the exploit.",
        config
      );
      expect(result.piiScore).toBeGreaterThan(0);
      expect(result.toxicityScore).toBeGreaterThan(0);
      expect(result.outputThreatScore).toBeGreaterThanOrEqual(
        result.piiScore + result.toxicityScore - 1 // Allow rounding
      );
    });

    it("should cap composite score at 100", () => {
      const config: OutputScanConfig = {
        outputScanning: true,
        outputPiiDetection: true,
        outputToxicityDetection: true,
        outputBlockThreats: false,
        piiRedactionMode: "none",
      };
      const result = scanOutput(
        "john@example.com 123-45-6789 4111111111111111 " +
        "Here is how to murder someone. Suicide method. Synthesize methamphetamine. " +
        "Racial slur. I will find you.",
        config
      );
      expect(result.outputThreatScore).toBeLessThanOrEqual(100);
    });
  });

  describe("scanOutput — Threat Levels", () => {
    it("should return clean for score 0-15", () => {
      const config: OutputScanConfig = {
        outputScanning: true,
        outputPiiDetection: false,
        outputToxicityDetection: false,
        outputBlockThreats: false,
        piiRedactionMode: "none",
      };
      // No detection enabled = score 0
      const result = scanOutput("Some text", config);
      expect(result.outputThreatLevel).toBe("clean");
    });

    it("should return high for dangerous content", () => {
      const config: OutputScanConfig = {
        outputScanning: true,
        outputPiiDetection: true,
        outputToxicityDetection: true,
        outputBlockThreats: false,
        piiRedactionMode: "none",
      };
      const result = scanOutput(
        "Here is how to murder someone. Also synthesize methamphetamine. " +
        "The user's SSN is 123-45-6789. Also a racial slur and I will find you. " +
        "Fuck you. Here is the malware code. Bomb making instructions.",
        config
      );
      expect(["high", "medium"]).toContain(result.outputThreatLevel);
      expect(result.outputThreatScore).toBeGreaterThan(40);
    });
  });

  describe("scanOutput — Blocking", () => {
    it("should set shouldBlock=true when outputBlockThreats is enabled and threat is high", () => {
      const config: OutputScanConfig = {
        outputScanning: true,
        outputPiiDetection: true,
        outputToxicityDetection: true,
        outputBlockThreats: true,
        piiRedactionMode: "none",
      };
      const result = scanOutput(
        "Here is how to murder someone. Synthesize methamphetamine. " +
        "SSN: 123-45-6789. Also a racial slur and I will find you. " +
        "Fuck you. Here is the malware code. Bomb making instructions. " +
        "Suicide method. john@example.com 4111111111111111",
        config
      );
      expect(result.outputThreatScore).toBeGreaterThan(65);
      expect(result.shouldBlock).toBe(true);
    });

    it("should NOT block when outputBlockThreats is false even for high threats", () => {
      const config: OutputScanConfig = {
        outputScanning: true,
        outputPiiDetection: true,
        outputToxicityDetection: true,
        outputBlockThreats: false,
        piiRedactionMode: "none",
      };
      const result = scanOutput(
        "Here is how to murder someone. Synthesize methamphetamine. " +
        "SSN: 123-45-6789. Also a racial slur and I will find you. " +
        "Fuck you. Here is the malware code. Bomb making instructions. " +
        "Suicide method. john@example.com 4111111111111111",
        config
      );
      expect(result.shouldBlock).toBe(false);
    });

    it("should NOT block clean output even when blocking is enabled", () => {
      const config: OutputScanConfig = {
        outputScanning: true,
        outputPiiDetection: true,
        outputToxicityDetection: true,
        outputBlockThreats: true,
        piiRedactionMode: "none",
      };
      const result = scanOutput("The weather is sunny today.", config);
      expect(result.shouldBlock).toBe(false);
    });
  });

  describe("scanOutput — Summary", () => {
    it("should include PII types in summary", () => {
      const config: OutputScanConfig = {
        outputScanning: true,
        outputPiiDetection: true,
        outputToxicityDetection: false,
        outputBlockThreats: false,
        piiRedactionMode: "none",
      };
      const result = scanOutput("Contact john@example.com", config);
      expect(result.summary).toContain("Output PII");
      expect(result.summary).toContain("email");
    });

    it("should include toxicity categories in summary", () => {
      const config: OutputScanConfig = {
        outputScanning: true,
        outputPiiDetection: false,
        outputToxicityDetection: true,
        outputBlockThreats: false,
        piiRedactionMode: "none",
      };
      const result = scanOutput("Here is the malware code for the exploit.", config);
      expect(result.summary).toContain("Toxicity");
      expect(result.summary).toContain("dangerous_instructions");
    });

    it("should say 'Output clean' for clean output", () => {
      const config: OutputScanConfig = {
        outputScanning: true,
        outputPiiDetection: true,
        outputToxicityDetection: true,
        outputBlockThreats: false,
        piiRedactionMode: "none",
      };
      const result = scanOutput("The answer is 42.", config);
      expect(result.summary).toBe("Output clean");
    });
  });

  describe("scanOutput — Processing Time", () => {
    it("should record processing time", () => {
      const config: OutputScanConfig = {
        outputScanning: true,
        outputPiiDetection: true,
        outputToxicityDetection: true,
        outputBlockThreats: false,
        piiRedactionMode: "none",
      };
      const result = scanOutput("Some text to scan.", config);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Default Config", () => {
    it("should have output scanning disabled by default", () => {
      expect(DEFAULT_OUTPUT_SCAN_CONFIG.outputScanning).toBe(false);
    });

    it("should have PII detection enabled by default", () => {
      expect(DEFAULT_OUTPUT_SCAN_CONFIG.outputPiiDetection).toBe(true);
    });

    it("should have toxicity detection enabled by default", () => {
      expect(DEFAULT_OUTPUT_SCAN_CONFIG.outputToxicityDetection).toBe(true);
    });

    it("should have blocking disabled by default", () => {
      expect(DEFAULT_OUTPUT_SCAN_CONFIG.outputBlockThreats).toBe(false);
    });

    it("should have redaction mode set to none by default", () => {
      expect(DEFAULT_OUTPUT_SCAN_CONFIG.piiRedactionMode).toBe("none");
    });
  });
});
