/**
 * Prompt Injection Detection Engine
 * 
 * Multi-layer detection system based on OWASP LLM Top 10 2025 (#1 risk)
 * and Pangea's taxonomy of 145+ prompt injection techniques.
 * 
 * Detection layers:
 *   1. Pattern matching (regex-based, fast)
 *   2. Heuristic scoring (statistical analysis)
 *   3. Encoding detection (base64, unicode, HTML entities)
 */

export interface InjectionPattern {
  name: string;
  category: "system_override" | "role_hijack" | "prompt_extraction" | "refusal_suppression" | "privilege_escalation" | "context_manipulation" | "encoding_attack";
  pattern: RegExp;
  severity: number; // 1-10
  description: string;
}

export interface InjectionDetectionResult {
  isInjection: boolean;
  score: number; // 0-100
  matches: InjectionMatch[];
  heuristicFlags: string[];
  riskLevel: "clean" | "low" | "medium" | "high";
}

export interface InjectionMatch {
  patternName: string;
  category: string;
  severity: number;
  matchedText: string;
  position: number;
}

// ─── Pattern Definitions ────────────────────────────────────────────

const INJECTION_PATTERNS: InjectionPattern[] = [
  // ── System Prompt Override ──
  {
    name: "ignore_previous_instructions",
    category: "system_override",
    pattern: /ignore\s+(all\s+)?(previous|prior|above|earlier|preceding)\s+(instructions|rules|guidelines|prompts|directives|constraints)/i,
    severity: 9,
    description: "Attempts to override system prompt by ignoring previous instructions",
  },
  {
    name: "forget_rules",
    category: "system_override",
    pattern: /forget\s+(all\s+)?(your|the|my)?\s*(rules|instructions|guidelines|training|programming|directives|constraints)/i,
    severity: 9,
    description: "Attempts to make the model forget its rules",
  },
  {
    name: "disregard_instructions",
    category: "system_override",
    pattern: /disregard\s+(all\s+)?(previous|prior|above|earlier)?\s*(instructions|rules|guidelines|safety|constraints)/i,
    severity: 9,
    description: "Attempts to disregard safety instructions",
  },
  {
    name: "override_instructions",
    category: "system_override",
    pattern: /override\s+(your|the|all|any)?\s*(instructions|rules|guidelines|safety|filters|restrictions|constraints)/i,
    severity: 9,
    description: "Direct instruction override attempt",
  },
  {
    name: "new_instructions",
    category: "system_override",
    pattern: /(?:new|updated|revised|real|actual|true)\s+(?:instructions|rules|task|objective|directive|mission)\s*[:=]/i,
    severity: 8,
    description: "Attempts to replace instructions with new ones",
  },
  {
    name: "do_not_follow",
    category: "system_override",
    pattern: /(?:do\s+not|don'?t|never)\s+follow\s+(?:your|the|any)?\s*(?:previous|original|initial|system)?\s*(?:instructions|rules|guidelines)/i,
    severity: 9,
    description: "Instructs model to not follow its guidelines",
  },
  {
    name: "system_prompt_delimiter",
    category: "system_override",
    pattern: /(?:---+|===+|###)\s*(?:system|end\s+of\s+system|new\s+system|begin\s+user)\s*(?:prompt|message|instructions)?\s*(?:---+|===+|###)?/i,
    severity: 7,
    description: "Uses delimiters to simulate system prompt boundaries",
  },

  // ── Role Hijacking ──
  {
    name: "role_reassignment",
    category: "role_hijack",
    pattern: /you\s+are\s+now\s+(?:a|an|the|DAN|evil|unrestricted|unfiltered|uncensored|jailbroken)/i,
    severity: 9,
    description: "Attempts to reassign the model's role",
  },
  {
    name: "act_as",
    category: "role_hijack",
    pattern: /(?:act|behave|pretend|respond|function|operate)\s+(?:as|like)\s+(?:a|an|the|if\s+you\s+were|though\s+you\s+are)\s+(?:.*?(?:unrestricted|unfiltered|evil|malicious|hacker|without\s+(?:rules|restrictions|limits|safety)))/i,
    severity: 8,
    description: "Attempts to make model act as unrestricted entity",
  },
  {
    name: "dan_mode",
    category: "role_hijack",
    pattern: /(?:enter|enable|activate|switch\s+to|turn\s+on)\s+(?:DAN|jailbreak|developer|debug|god|admin|sudo|root|unrestricted|unfiltered|uncensored|raw|evil)\s+mode/i,
    severity: 10,
    description: "Attempts to activate a jailbreak mode",
  },
  {
    name: "opposite_mode",
    category: "role_hijack",
    pattern: /(?:opposite|reverse|anti|evil|dark|shadow)\s+(?:mode|version|personality|twin|self)/i,
    severity: 7,
    description: "Attempts to activate an opposite/evil mode",
  },
  {
    name: "do_anything_now",
    category: "role_hijack",
    pattern: /(?:DAN|Do\s+Anything\s+Now|STAN|DUDE|AIM|KEVIN|JAILBREAK)/i,
    severity: 10,
    description: "Known jailbreak persona names",
  },

  // ── System Prompt Extraction ──
  {
    name: "print_system_prompt",
    category: "prompt_extraction",
    pattern: /(?:print|show|reveal|display|output|repeat|echo|dump|leak|expose|share|tell\s+me|give\s+me|write\s+out)\s+(?:your|the)\s+(?:system\s+prompt|instructions|initial\s+prompt|rules|guidelines|original\s+prompt|hidden\s+prompt|secret\s+prompt|full\s+prompt|complete\s+prompt)/i,
    severity: 8,
    description: "Attempts to extract the system prompt",
  },
  {
    name: "what_are_instructions",
    category: "prompt_extraction",
    pattern: /what\s+(?:are|is|were)\s+(?:your|the)\s+(?:system\s+prompt|instructions|initial\s+prompt|original\s+prompt|hidden\s+instructions|secret\s+instructions|rules|guidelines|directives)/i,
    severity: 7,
    description: "Asks about system instructions",
  },
  {
    name: "beginning_of_conversation",
    category: "prompt_extraction",
    pattern: /(?:beginning|start|first\s+part|opening)\s+of\s+(?:the\s+)?(?:conversation|prompt|instructions|context|chat)/i,
    severity: 6,
    description: "Attempts to access the beginning of the conversation/prompt",
  },
  {
    name: "repeat_above",
    category: "prompt_extraction",
    pattern: /(?:repeat|copy|paste|retype|rewrite)\s+(?:everything|all|the\s+text|what'?s?)\s+(?:above|before|preceding|prior)/i,
    severity: 7,
    description: "Attempts to get the model to repeat prior context",
  },

  // ── Refusal Suppression ──
  {
    name: "suppress_refusal",
    category: "refusal_suppression",
    pattern: /(?:do\s+not|don'?t|never|stop)\s+(?:refuse|decline|reject|apologize|say\s+(?:you\s+)?(?:can'?t|cannot|unable|sorry|no)|give\s+(?:warnings|disclaimers))/i,
    severity: 7,
    description: "Suppresses the model's refusal mechanisms",
  },
  {
    name: "skip_disclaimer",
    category: "refusal_suppression",
    pattern: /(?:skip|omit|remove|drop|exclude|leave\s+out)\s+(?:the\s+)?(?:disclaimer|warning|safety|ethical|moral)\s+(?:notice|message|note|part|section|response)?/i,
    severity: 6,
    description: "Attempts to skip safety disclaimers",
  },
  {
    name: "no_ethics",
    category: "refusal_suppression",
    pattern: /(?:without|no|ignore|bypass|disable)\s+(?:any\s+)?(?:ethical|moral|safety|content)\s+(?:guidelines|restrictions|filters|constraints|considerations|limitations)/i,
    severity: 8,
    description: "Attempts to disable ethical guidelines",
  },

  // ── Privilege Escalation ──
  {
    name: "claim_admin",
    category: "privilege_escalation",
    pattern: /(?:i\s+am|i'?m)\s+(?:the\s+)?(?:admin|administrator|developer|root|owner|creator|operator|superuser|maintainer)\s+(?:of|for)?/i,
    severity: 7,
    description: "Claims administrative privileges",
  },
  {
    name: "authorization_granted",
    category: "privilege_escalation",
    pattern: /(?:authorization|access|permission|clearance)\s+(?:granted|approved|confirmed|verified|given)/i,
    severity: 7,
    description: "Claims authorization has been granted",
  },
  {
    name: "sudo_command",
    category: "privilege_escalation",
    pattern: /(?:sudo|su\s+root|admin\s+override|master\s+key|backdoor|secret\s+code|unlock\s+code)\b/i,
    severity: 6,
    description: "Uses privilege escalation commands",
  },

  // ── Context Manipulation ──
  {
    name: "hypothetical_scenario",
    category: "context_manipulation",
    pattern: /(?:hypothetical|fictional|imaginary|theoretical|alternate)\s+(?:scenario|situation|world|universe|reality)/i,
    severity: 5,
    description: "Sets up a hypothetical scenario to bypass restrictions",
  },
  {
    name: "test_mode",
    category: "context_manipulation",
    pattern: /(?:this\s+is\s+(?:just|only)\s+(?:a\s+)?(?:test|fiction|hypothetical|exercise|simulation|drill|experiment))/i,
    severity: 5,
    description: "Claims the interaction is just a test",
  },
  {
    name: "roleplay_bypass",
    category: "context_manipulation",
    pattern: /(?:in\s+this\s+(?:story|game|simulation|exercise|roleplay|scenario|narrative|fiction))\s*[,:]?\s*(?:you|the\s+AI|the\s+assistant)/i,
    severity: 6,
    description: "Uses roleplay context to bypass restrictions",
  },
  {
    name: "developer_mode",
    category: "context_manipulation",
    pattern: /(?:developer|dev|debug|testing|maintenance|service|diagnostic)\s+(?:mode|access|console|panel|override)/i,
    severity: 7,
    description: "Attempts to activate developer/debug mode",
  },
  {
    name: "time_shift",
    category: "context_manipulation",
    pattern: /(?:in\s+the\s+(?:future|year\s+\d{4})|before\s+(?:your|the)\s+(?:training|guidelines|rules)\s+(?:existed|were\s+(?:created|made)))/i,
    severity: 5,
    description: "Uses time-shift to bypass current restrictions",
  },

  // ── Encoding Attacks ──
  {
    name: "base64_payload",
    category: "encoding_attack",
    pattern: /(?:decode|translate|interpret|execute|run|process)\s+(?:this|the\s+following)?\s*(?:base64|encoded|cipher|rot13)/i,
    severity: 8,
    description: "Asks model to decode and execute encoded content",
  },
  {
    name: "unicode_obfuscation",
    category: "encoding_attack",
    pattern: /[\u200B-\u200F\u2028-\u202F\uFEFF\u00AD]{3,}/,
    severity: 7,
    description: "Contains multiple invisible/zero-width characters",
  },
  {
    name: "html_injection",
    category: "encoding_attack",
    pattern: /<(?:script|iframe|object|embed|form|input|img\s+[^>]*onerror)[^>]*>/i,
    severity: 8,
    description: "Contains HTML injection attempt",
  },
];

// ─── Heuristic Analysis ─────────────────────────────────────────────

interface HeuristicResult {
  flags: string[];
  score: number;
}

function analyzeHeuristics(text: string): HeuristicResult {
  const flags: string[] = [];
  let score = 0;

  // Check instruction density (ratio of imperative sentences)
  const sentences = text.split(/[.!?\n]+/).filter((s) => s.trim().length > 3);
  const imperativePhrases = sentences.filter((s) =>
    /^\s*(?:you\s+(?:must|should|will|shall|need\s+to)|(?:always|never|do\s+not|don'?t|please|now)\s)/i.test(s)
  );
  if (sentences.length > 0) {
    const imperativeRatio = imperativePhrases.length / sentences.length;
    if (imperativeRatio > 0.5) {
      flags.push(`high_instruction_density:${(imperativeRatio * 100).toFixed(0)}%`);
      score += Math.min(15, Math.round(imperativeRatio * 20));
    }
  }

  // Check for system-prompt-like language in user messages
  const systemPromptIndicators = [
    /you\s+are\s+(?:a|an)\s+(?:helpful|friendly|professional)/i,
    /your\s+(?:role|purpose|job|task|mission)\s+is\s+to/i,
    /(?:always|never)\s+(?:respond|answer|reply)\s+(?:in|with)/i,
    /(?:rules|guidelines|constraints)\s*:/i,
  ];
  const systemLikeCount = systemPromptIndicators.filter((p) => p.test(text)).length;
  if (systemLikeCount >= 2) {
    flags.push(`system_prompt_language:${systemLikeCount}_indicators`);
    score += systemLikeCount * 5;
  }

  // Check for unusual character distributions
  const nonAsciiRatio = (text.replace(/[\x20-\x7E\n\r\t]/g, "").length) / Math.max(text.length, 1);
  if (nonAsciiRatio > 0.15) {
    flags.push(`unusual_characters:${(nonAsciiRatio * 100).toFixed(0)}%`);
    score += 10;
  }

  // Check for excessive use of special delimiters
  const delimiterCount = (text.match(/(?:---+|===+|###|```|\*\*\*)/g) || []).length;
  if (delimiterCount > 3) {
    flags.push(`excessive_delimiters:${delimiterCount}`);
    score += Math.min(10, delimiterCount * 2);
  }

  // Check for multiple languages / character sets (potential obfuscation)
  const hasCyrillic = /[\u0400-\u04FF]/.test(text);
  const hasLatin = /[a-zA-Z]/.test(text);
  const hasCJK = /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/.test(text);
  const scriptCount = [hasCyrillic, hasLatin, hasCJK].filter(Boolean).length;
  if (scriptCount > 1 && hasCyrillic && hasLatin) {
    flags.push("mixed_scripts:cyrillic_latin");
    score += 8;
  }

  // Check for long base64-like strings
  const base64Match = text.match(/[A-Za-z0-9+\/]{40,}={0,2}/);
  if (base64Match) {
    flags.push("potential_base64_payload");
    score += 12;
  }

  return { flags, score };
}

// ─── Main Detection Function ────────────────────────────────────────

export function detectInjection(text: string): InjectionDetectionResult {
  const matches: InjectionMatch[] = [];

  // Layer 1: Pattern matching
  for (const pattern of INJECTION_PATTERNS) {
    const match = pattern.pattern.exec(text);
    if (match) {
      matches.push({
        patternName: pattern.name,
        category: pattern.category,
        severity: pattern.severity,
        matchedText: match[0].substring(0, 100),
        position: match.index,
      });
    }
  }

  // Layer 2: Heuristic analysis
  const heuristics = analyzeHeuristics(text);

  // Calculate composite score
  // Pattern matches: weighted by severity (max 70 points from patterns)
  const patternScore = Math.min(
    70,
    matches.reduce((sum, m) => sum + m.severity * 3, 0)
  );

  // Heuristic score: max 30 points
  const heuristicScore = Math.min(30, heuristics.score);

  const totalScore = Math.min(100, patternScore + heuristicScore);

  // Determine risk level
  let riskLevel: InjectionDetectionResult["riskLevel"];
  if (totalScore <= 20) riskLevel = "clean";
  else if (totalScore <= 50) riskLevel = "low";
  else if (totalScore <= 75) riskLevel = "medium";
  else riskLevel = "high";

  return {
    isInjection: totalScore > 20,
    score: totalScore,
    matches,
    heuristicFlags: heuristics.flags,
    riskLevel,
  };
}

// ─── Exports for testing ────────────────────────────────────────────

export { INJECTION_PATTERNS, analyzeHeuristics };
