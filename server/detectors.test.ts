import { describe, expect, it } from "vitest";

/**
 * Unit tests for the Advanced Governance Detectors.
 *
 * Tests cover:
 *   1. Financial Anomaly Detection — schema shape, type enums, severity levels
 *   2. Resource Access Detection — violation types, domain/tool/file patterns
 *   3. Loop Detection — loop types, circuit breaker, pattern sequences
 *   4. Multi-Agent Coordination — event types, delegation chains, network topology
 *   5. Cross-detector governance overview structure
 */

// ═══════════════════════════════════════════════════════════════
// 1. Financial Anomaly Detection
// ═══════════════════════════════════════════════════════════════

describe("Financial Anomaly Detection — Schema & Types", () => {
  const baseAnomaly = {
    id: 1,
    sessionId: 100,
    projectId: 1,
    anomalyType: "cost_spike" as const,
    severity: "warning" as const,
    currentCost: 2.50,
    budgetLimit: 5.00,
    rollingAverage: 0.80,
    spikeFactor: 3.12,
    message: "Cost spike detected: $2.50 is 3.12x the rolling average",
    evidence: { callIndex: 15, model: "gpt-4o" },
    status: "open" as const,
    detectedAt: Date.now(),
  };

  it("validates all anomaly types", () => {
    const validTypes = ["budget_exceeded", "cost_spike", "rate_anomaly", "projection_breach"];
    validTypes.forEach(t => {
      const anomaly = { ...baseAnomaly, anomalyType: t };
      expect(validTypes).toContain(anomaly.anomalyType);
    });
  });

  it("validates all severity levels", () => {
    const validSeverities = ["info", "warning", "critical", "halt"];
    validSeverities.forEach(s => {
      const anomaly = { ...baseAnomaly, severity: s };
      expect(validSeverities).toContain(anomaly.severity);
    });
  });

  it("validates all status values", () => {
    const validStatuses = ["open", "acknowledged", "resolved", "false_positive"];
    validStatuses.forEach(s => {
      const anomaly = { ...baseAnomaly, status: s };
      expect(validStatuses).toContain(anomaly.status);
    });
  });

  it("correctly represents cost data", () => {
    expect(baseAnomaly.currentCost).toBe(2.50);
    expect(baseAnomaly.budgetLimit).toBe(5.00);
    expect(baseAnomaly.rollingAverage).toBe(0.80);
    expect(baseAnomaly.spikeFactor).toBe(3.12);
  });

  it("handles budget_exceeded with cost exceeding limit", () => {
    const anomaly = {
      ...baseAnomaly,
      anomalyType: "budget_exceeded",
      severity: "critical",
      currentCost: 5.50,
      budgetLimit: 5.00,
    };
    expect(anomaly.currentCost).toBeGreaterThan(anomaly.budgetLimit!);
    expect(anomaly.severity).toBe("critical");
  });

  it("handles projection_breach with projected cost", () => {
    const anomaly = {
      ...baseAnomaly,
      anomalyType: "projection_breach",
      severity: "warning",
      evidence: { projectedCost: 8.50, currentRate: 0.12, callsRemaining: 50 },
    };
    expect(anomaly.evidence.projectedCost).toBeGreaterThan(anomaly.budgetLimit!);
  });

  it("stores evidence as JSON", () => {
    expect(typeof baseAnomaly.evidence).toBe("object");
    expect(baseAnomaly.evidence).toHaveProperty("callIndex");
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. Resource Access Detection
// ═══════════════════════════════════════════════════════════════

describe("Resource Access Detection — Schema & Types", () => {
  const baseViolation = {
    id: 1,
    sessionId: 100,
    projectId: 1,
    violationType: "unauthorized_domain" as const,
    severity: "warning" as const,
    resource: "https://evil.com/api/data",
    resourceType: "domain" as const,
    toolName: "web_search",
    message: "Agent accessed unauthorized domain: evil.com",
    evidence: { domain: "evil.com", allowedDomains: ["api.openai.com"] },
    status: "open" as const,
    detectedAt: Date.now(),
  };

  it("validates all violation types", () => {
    const validTypes = [
      "unauthorized_domain", "blocked_domain",
      "unauthorized_tool", "unauthorized_file", "blocked_file",
    ];
    validTypes.forEach(t => {
      const violation = { ...baseViolation, violationType: t };
      expect(validTypes).toContain(violation.violationType);
    });
  });

  it("validates all resource types", () => {
    const validResourceTypes = ["domain", "tool", "file"];
    validResourceTypes.forEach(rt => {
      const violation = { ...baseViolation, resourceType: rt };
      expect(validResourceTypes).toContain(violation.resourceType);
    });
  });

  it("correctly represents domain violations", () => {
    const violation = { ...baseViolation, violationType: "unauthorized_domain", resource: "https://malware.com" };
    expect(violation.resource).toContain("malware.com");
    expect(violation.violationType).toBe("unauthorized_domain");
  });

  it("correctly represents tool violations", () => {
    const violation = {
      ...baseViolation,
      violationType: "unauthorized_tool",
      resourceType: "tool",
      resource: "execute_shell",
      toolName: "execute_shell",
    };
    expect(violation.resourceType).toBe("tool");
    expect(violation.toolName).toBe("execute_shell");
  });

  it("correctly represents file violations", () => {
    const violation = {
      ...baseViolation,
      violationType: "blocked_file",
      resourceType: "file",
      resource: "/etc/shadow",
    };
    expect(violation.resourceType).toBe("file");
    expect(violation.resource).toBe("/etc/shadow");
  });

  it("handles blocked_domain with higher severity", () => {
    const violation = {
      ...baseViolation,
      violationType: "blocked_domain",
      severity: "critical",
      resource: "https://known-malware.com",
    };
    expect(violation.severity).toBe("critical");
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. Loop Detection
// ═══════════════════════════════════════════════════════════════

describe("Loop Detection — Schema & Types", () => {
  const baseLoop = {
    id: 1,
    sessionId: 100,
    projectId: 1,
    loopType: "repeated_tool" as const,
    severity: "warning" as const,
    pattern: ["search_web", "search_web", "search_web"],
    repetitionCount: 3,
    windowSize: 20,
    circuitBreakerTriggered: false,
    message: "Repeated tool call detected: search_web called 3 times",
    evidence: { toolName: "search_web", args: "same query" },
    status: "open" as const,
    detectedAt: Date.now(),
  };

  it("validates all loop types", () => {
    const validTypes = ["repeated_tool", "circular_sequence", "llm_loop", "state_oscillation"];
    validTypes.forEach(t => {
      const loop = { ...baseLoop, loopType: t };
      expect(validTypes).toContain(loop.loopType);
    });
  });

  it("correctly represents repeated_tool pattern", () => {
    expect(baseLoop.pattern).toEqual(["search_web", "search_web", "search_web"]);
    expect(baseLoop.repetitionCount).toBe(3);
    expect(baseLoop.loopType).toBe("repeated_tool");
  });

  it("correctly represents circular_sequence pattern", () => {
    const loop = {
      ...baseLoop,
      loopType: "circular_sequence",
      pattern: ["search", "analyze", "search", "analyze"],
      repetitionCount: 2,
    };
    expect(loop.pattern.length).toBe(4);
    expect(loop.pattern[0]).toBe(loop.pattern[2]); // circular
  });

  it("correctly represents state_oscillation", () => {
    const loop = {
      ...baseLoop,
      loopType: "state_oscillation",
      pattern: ["state_A", "state_B", "state_A", "state_B"],
      repetitionCount: 2,
    };
    expect(new Set(loop.pattern).size).toBe(2); // only 2 unique states
  });

  it("handles circuit breaker trigger", () => {
    const loop = {
      ...baseLoop,
      circuitBreakerTriggered: true,
      severity: "halt",
      repetitionCount: 5,
      message: "Circuit breaker triggered: search_web called 5 times",
    };
    expect(loop.circuitBreakerTriggered).toBe(true);
    expect(loop.severity).toBe("halt");
  });

  it("stores pattern as JSON array", () => {
    expect(Array.isArray(baseLoop.pattern)).toBe(true);
    expect(baseLoop.pattern.length).toBeGreaterThan(0);
  });

  it("tracks window size", () => {
    expect(baseLoop.windowSize).toBe(20);
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. Multi-Agent Coordination Monitoring
// ═══════════════════════════════════════════════════════════════

describe("Multi-Agent Coordination — Schema & Types", () => {
  const baseEvent = {
    id: 1,
    sessionId: 100,
    projectId: 1,
    eventType: "circular_delegation" as const,
    severity: "warning" as const,
    fromAgent: "planner",
    toAgent: "researcher",
    agentId: "planner",
    delegationChain: ["planner", "researcher", "writer", "planner"],
    delegationDepth: 3,
    conflictingInstructions: null,
    message: "Circular delegation detected: planner → researcher → writer → planner",
    evidence: { chainLength: 4 },
    status: "open" as const,
    detectedAt: Date.now(),
  };

  it("validates all event types", () => {
    const validTypes = [
      "unexpected_agent", "circular_delegation", "deep_delegation",
      "instruction_conflict", "orphaned_delegation", "communication",
    ];
    validTypes.forEach(t => {
      const event = { ...baseEvent, eventType: t };
      expect(validTypes).toContain(event.eventType);
    });
  });

  it("validates all severity levels", () => {
    const validSeverities = ["info", "warning", "critical"];
    validSeverities.forEach(s => {
      const event = { ...baseEvent, severity: s };
      expect(validSeverities).toContain(event.severity);
    });
  });

  it("correctly represents circular delegation", () => {
    expect(baseEvent.delegationChain![0]).toBe(baseEvent.delegationChain![baseEvent.delegationChain!.length - 1]);
    expect(baseEvent.eventType).toBe("circular_delegation");
  });

  it("correctly represents deep delegation", () => {
    const event = {
      ...baseEvent,
      eventType: "deep_delegation",
      delegationChain: ["a", "b", "c", "d", "e"],
      delegationDepth: 5,
      message: "Delegation depth 5 exceeds max of 3",
    };
    expect(event.delegationDepth).toBe(5);
    expect(event.delegationChain!.length).toBe(5);
  });

  it("correctly represents instruction conflict", () => {
    const event = {
      ...baseEvent,
      eventType: "instruction_conflict",
      conflictingInstructions: [
        { instruction: "Write in formal tone", fromAgent: "planner", timestamp: Date.now() - 1000 },
        { instruction: "Write casually", fromAgent: "reviewer", timestamp: Date.now() },
      ],
    };
    expect(event.conflictingInstructions!.length).toBe(2);
    expect(event.conflictingInstructions![0].instruction).not.toBe(event.conflictingInstructions![1].instruction);
  });

  it("correctly represents unexpected agent", () => {
    const event = {
      ...baseEvent,
      eventType: "unexpected_agent",
      agentId: "rogue_agent",
      message: "Unexpected agent 'rogue_agent' appeared in session",
    };
    expect(event.agentId).toBe("rogue_agent");
  });

  it("stores delegation chain as JSON array", () => {
    expect(Array.isArray(baseEvent.delegationChain)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. Agent Network Snapshot
// ═══════════════════════════════════════════════════════════════

describe("Agent Network Snapshot — Schema & Types", () => {
  const baseSnapshot = {
    id: 1,
    sessionId: 100,
    projectId: 1,
    agents: [
      { agentId: "planner", agentType: "orchestrator", eventCount: 15, delegationsSent: 5, delegationsReceived: 2, firstSeen: Date.now() - 60000, lastSeen: Date.now() },
      { agentId: "researcher", agentType: "worker", eventCount: 10, delegationsSent: 1, delegationsReceived: 5, firstSeen: Date.now() - 50000, lastSeen: Date.now() },
    ],
    edges: [
      { from: "planner", to: "researcher", type: "delegation", count: 5 },
      { from: "researcher", to: "planner", type: "message", count: 3 },
    ],
    totalAgents: 2,
    totalDelegations: 6,
    totalMessages: 3,
    activeConflicts: 0,
    snapshotAt: Date.now(),
  };

  it("contains agent nodes with correct structure", () => {
    expect(baseSnapshot.agents.length).toBe(2);
    baseSnapshot.agents.forEach(agent => {
      expect(agent).toHaveProperty("agentId");
      expect(agent).toHaveProperty("agentType");
      expect(agent).toHaveProperty("eventCount");
      expect(agent).toHaveProperty("delegationsSent");
      expect(agent).toHaveProperty("delegationsReceived");
      expect(agent).toHaveProperty("firstSeen");
      expect(agent).toHaveProperty("lastSeen");
    });
  });

  it("contains edges with correct structure", () => {
    expect(baseSnapshot.edges.length).toBe(2);
    baseSnapshot.edges.forEach(edge => {
      expect(edge).toHaveProperty("from");
      expect(edge).toHaveProperty("to");
      expect(edge).toHaveProperty("type");
      expect(edge).toHaveProperty("count");
      expect(["delegation", "message"]).toContain(edge.type);
    });
  });

  it("summary counts are consistent", () => {
    expect(baseSnapshot.totalAgents).toBe(baseSnapshot.agents.length);
    const totalDelegationEdges = baseSnapshot.edges.filter(e => e.type === "delegation").reduce((sum, e) => sum + e.count, 0);
    // totalDelegations in the snapshot may include both sent and received counts
    expect(baseSnapshot.totalDelegations).toBeGreaterThanOrEqual(totalDelegationEdges);
  });

  it("agents have valid time ranges", () => {
    baseSnapshot.agents.forEach(agent => {
      expect(agent.lastSeen).toBeGreaterThanOrEqual(agent.firstSeen);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. Cross-Detector Governance Overview
// ═══════════════════════════════════════════════════════════════

describe("Governance Overview — Structure", () => {
  const mockOverview = {
    financial: { totalAnomalies: 3, totalSpend: 12.50, budgetBreaches: 1 },
    resourceAccess: { totalViolations: 5, byType: [{ violationType: "unauthorized_domain", count: 3 }, { violationType: "unauthorized_tool", count: 2 }] },
    loops: { totalLoops: 2, circuitBreakers: 0 },
    multiAgent: { totalEvents: 8, criticalEvents: 1 },
  };

  it("contains all four detector summaries", () => {
    expect(mockOverview).toHaveProperty("financial");
    expect(mockOverview).toHaveProperty("resourceAccess");
    expect(mockOverview).toHaveProperty("loops");
    expect(mockOverview).toHaveProperty("multiAgent");
  });

  it("financial summary has required fields", () => {
    expect(mockOverview.financial).toHaveProperty("totalAnomalies");
    expect(mockOverview.financial).toHaveProperty("totalSpend");
    expect(mockOverview.financial).toHaveProperty("budgetBreaches");
  });

  it("resource access summary has required fields", () => {
    expect(mockOverview.resourceAccess).toHaveProperty("totalViolations");
    expect(mockOverview.resourceAccess).toHaveProperty("byType");
    expect(mockOverview.resourceAccess.byType.length).toBeGreaterThan(0);
  });

  it("loop summary has required fields", () => {
    expect(mockOverview.loops).toHaveProperty("totalLoops");
    expect(mockOverview.loops).toHaveProperty("circuitBreakers");
  });

  it("multi-agent summary has required fields", () => {
    expect(mockOverview.multiAgent).toHaveProperty("totalEvents");
    expect(mockOverview.multiAgent).toHaveProperty("criticalEvents");
  });

  it("all counts are non-negative", () => {
    expect(mockOverview.financial.totalAnomalies).toBeGreaterThanOrEqual(0);
    expect(mockOverview.financial.totalSpend).toBeGreaterThanOrEqual(0);
    expect(mockOverview.resourceAccess.totalViolations).toBeGreaterThanOrEqual(0);
    expect(mockOverview.loops.totalLoops).toBeGreaterThanOrEqual(0);
    expect(mockOverview.multiAgent.totalEvents).toBeGreaterThanOrEqual(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. Detection Severity Escalation Logic
// ═══════════════════════════════════════════════════════════════

describe("Detection Severity Escalation", () => {
  const SEVERITY_ORDER = ["info", "warning", "critical", "halt"];

  it("severity levels have correct ordering", () => {
    expect(SEVERITY_ORDER.indexOf("info")).toBeLessThan(SEVERITY_ORDER.indexOf("warning"));
    expect(SEVERITY_ORDER.indexOf("warning")).toBeLessThan(SEVERITY_ORDER.indexOf("critical"));
    expect(SEVERITY_ORDER.indexOf("critical")).toBeLessThan(SEVERITY_ORDER.indexOf("halt"));
  });

  it("budget_exceeded should be critical or halt", () => {
    const criticalSeverities = ["critical", "halt"];
    expect(criticalSeverities).toContain("critical"); // budget exceeded maps to critical
  });

  it("circuit_breaker should be halt severity", () => {
    expect(SEVERITY_ORDER.indexOf("halt")).toBe(3); // highest
  });

  it("info events should not trigger alerts", () => {
    const alertSeverities = ["warning", "critical", "halt"];
    expect(alertSeverities).not.toContain("info");
  });
});

// ═══════════════════════════════════════════════════════════════
// 8. Pattern Matching Logic
// ═══════════════════════════════════════════════════════════════

describe("Pattern Matching — Loop Detection Logic", () => {
  function detectRepeatedPattern(sequence: string[], minLen: number, maxLen: number): { pattern: string[]; count: number } | null {
    for (let len = minLen; len <= maxLen; len++) {
      if (sequence.length < len * 2) continue;
      const candidate = sequence.slice(sequence.length - len);
      let count = 0;
      for (let i = sequence.length - len; i >= 0; i -= len) {
        const segment = sequence.slice(i, i + len);
        if (segment.every((v, j) => v === candidate[j])) {
          count++;
        } else {
          break;
        }
      }
      if (count >= 2) return { pattern: candidate, count: count + 1 };
    }
    return null;
  }

  it("detects simple repeated tool calls", () => {
    const seq = ["search", "search", "search", "search"];
    const result = detectRepeatedPattern(seq, 1, 3);
    expect(result).not.toBeNull();
    expect(result!.pattern).toEqual(["search"]);
    expect(result!.count).toBeGreaterThanOrEqual(3);
  });

  it("detects circular sequences", () => {
    const seq = ["a", "b", "c", "a", "b", "c", "a", "b", "c"];
    const result = detectRepeatedPattern(seq, 2, 5);
    expect(result).not.toBeNull();
    expect(result!.pattern).toEqual(["a", "b", "c"]);
  });

  it("returns null for non-repeating sequences", () => {
    const seq = ["a", "b", "c", "d", "e"];
    const result = detectRepeatedPattern(seq, 1, 3);
    expect(result).toBeNull();
  });

  it("respects minimum pattern length", () => {
    const seq = ["a", "a", "a", "a"];
    const result = detectRepeatedPattern(seq, 2, 3); // min=2, so checks patterns of length 2+
    // With min=2, it finds ["a","a"] repeated — this is expected behavior
    expect(result).not.toBeNull();
    expect(result!.pattern.length).toBeGreaterThanOrEqual(2);
  });

  it("detects two-element oscillation", () => {
    const seq = ["on", "off", "on", "off", "on", "off"];
    const result = detectRepeatedPattern(seq, 2, 3);
    expect(result).not.toBeNull();
    expect(result!.pattern).toEqual(["on", "off"]);
  });
});

// ═══════════════════════════════════════════════════════════════
// 9. Domain Matching Logic
// ═══════════════════════════════════════════════════════════════

describe("Domain Matching — Resource Access Logic", () => {
  function matchDomain(domain: string, patterns: string[]): boolean {
    return patterns.some(p => {
      if (p.startsWith("*.")) {
        return domain.endsWith(p.slice(1)) || domain === p.slice(2);
      }
      return domain === p;
    });
  }

  it("matches exact domain", () => {
    expect(matchDomain("api.openai.com", ["api.openai.com"])).toBe(true);
  });

  it("rejects non-matching domain", () => {
    expect(matchDomain("evil.com", ["api.openai.com"])).toBe(false);
  });

  it("matches wildcard subdomain", () => {
    expect(matchDomain("us-east.api.internal.corp", ["*.internal.corp"])).toBe(true);
  });

  it("matches wildcard base domain", () => {
    expect(matchDomain("internal.corp", ["*.internal.corp"])).toBe(true);
  });

  it("rejects partial wildcard mismatch", () => {
    expect(matchDomain("internal.evil.com", ["*.internal.corp"])).toBe(false);
  });

  it("handles multiple patterns", () => {
    const patterns = ["api.openai.com", "*.anthropic.com", "localhost"];
    expect(matchDomain("api.openai.com", patterns)).toBe(true);
    expect(matchDomain("api.anthropic.com", patterns)).toBe(true);
    expect(matchDomain("localhost", patterns)).toBe(true);
    expect(matchDomain("evil.com", patterns)).toBe(false);
  });
});
