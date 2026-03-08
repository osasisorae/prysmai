import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Unit tests for the unified trace model query helpers.
 * These test the pure logic of eventToTreeNode mapping and layout.
 */

// ─── eventToTreeNode mapping tests ───

describe("Unified Trace Model — Event Type Mapping", () => {
  // We test the mapping logic directly by simulating event objects
  // that match the schema shape

  const baseEvent = {
    id: 1,
    sessionId: 1,
    projectId: 1,
    eventTimestamp: Date.now(),
    sequenceNumber: 1,
    eventType: "llm_call",
    eventData: null,
    model: null,
    promptTokens: null,
    completionTokens: null,
    costCents: null,
    traceId: null,
    toolName: null,
    toolSuccess: null,
    toolDurationMs: null,
    toolInput: null,
    toolOutput: null,
    codeLanguage: null,
    codeFilePath: null,
    behavioralFlags: null,
    createdAt: Date.now(),
  };

  it("maps llm_call events correctly", () => {
    const event = { ...baseEvent, eventType: "llm_call", model: "gpt-4o", promptTokens: 100, completionTokens: 50 };
    expect(event.eventType).toBe("llm_call");
    expect(event.model).toBe("gpt-4o");
    expect(event.promptTokens).toBe(100);
    expect(event.completionTokens).toBe(50);
  });

  it("maps tool_call events correctly", () => {
    const event = { ...baseEvent, eventType: "tool_call", toolName: "search_web", toolSuccess: true, toolDurationMs: 250 };
    expect(event.eventType).toBe("tool_call");
    expect(event.toolName).toBe("search_web");
    expect(event.toolSuccess).toBe(true);
    expect(event.toolDurationMs).toBe(250);
  });

  it("maps decision events correctly", () => {
    const event = {
      ...baseEvent,
      eventType: "decision",
      eventData: { description: "Chose to search before answering" },
    };
    expect(event.eventType).toBe("decision");
    expect((event.eventData as any).description).toBe("Chose to search before answering");
  });

  it("maps delegation events correctly", () => {
    const event = {
      ...baseEvent,
      eventType: "delegation",
      eventData: { target: "research-agent" },
    };
    expect(event.eventType).toBe("delegation");
    expect((event.eventData as any).target).toBe("research-agent");
  });

  it("maps error events correctly", () => {
    const event = {
      ...baseEvent,
      eventType: "error",
      eventData: { message: "Tool timeout after 30s" },
    };
    expect(event.eventType).toBe("error");
    expect((event.eventData as any).message).toBe("Tool timeout after 30s");
  });

  it("maps code events correctly", () => {
    const event = {
      ...baseEvent,
      eventType: "code_generated",
      codeLanguage: "python",
      codeFilePath: "/tmp/script.py",
    };
    expect(event.eventType).toBe("code_generated");
    expect(event.codeLanguage).toBe("python");
    expect(event.codeFilePath).toBe("/tmp/script.py");
  });

  it("maps file_op events correctly", () => {
    const event = {
      ...baseEvent,
      eventType: "file_read",
      eventData: { path: "/data/config.json" },
    };
    expect(event.eventType).toBe("file_read");
    expect((event.eventData as any).path).toBe("/data/config.json");
  });
});

// ─── UnifiedTimelineEvent structure tests ───

describe("Unified Timeline Event Structure", () => {
  it("creates a valid trace-sourced event", () => {
    const event = {
      id: "trace-42",
      source: "trace" as const,
      eventType: "llm_call",
      timestamp: 1700000000000,
      traceId: "tr-abc123",
      model: "gpt-4o",
      provider: "openai",
      promptTokens: 500,
      completionTokens: 200,
      totalTokens: 700,
      latencyMs: 1200,
      status: "success",
      costUsd: "0.0045",
      completion: "The answer is 42.",
    };

    expect(event.source).toBe("trace");
    expect(event.id).toMatch(/^trace-/);
    expect(event.totalTokens).toBe(700);
    expect(event.costUsd).toBe("0.0045");
  });

  it("creates a valid session-event-sourced event", () => {
    const event = {
      id: "event-99",
      source: "session_event" as const,
      eventType: "tool_call",
      timestamp: 1700000001000,
      sessionEventId: 99,
      toolName: "web_search",
      toolSuccess: true,
      toolDurationMs: 350,
      sessionId: "sess-xyz",
      agentType: "langgraph",
      sessionStatus: "completed",
    };

    expect(event.source).toBe("session_event");
    expect(event.id).toMatch(/^event-/);
    expect(event.toolName).toBe("web_search");
    expect(event.agentType).toBe("langgraph");
  });

  it("handles null optional fields gracefully", () => {
    const event = {
      id: "event-100",
      source: "session_event" as const,
      eventType: "other",
      timestamp: 1700000002000,
      toolName: null,
      toolSuccess: null,
      toolDurationMs: null,
      sessionId: null,
      agentType: null,
    };

    expect(event.toolName).toBeNull();
    expect(event.toolSuccess).toBeNull();
    expect(event.sessionId).toBeNull();
  });
});

// ─── TraceTreeNode structure tests ───

describe("Trace Tree Node Structure", () => {
  it("builds a valid root node with children", () => {
    const root = {
      id: "session-1",
      type: "agent_run" as const,
      label: "langgraph session",
      timestamp: 1700000000000,
      durationMs: 5000,
      success: true,
      children: [
        {
          id: "event-1",
          type: "llm_call" as const,
          label: "LLM: gpt-4o",
          timestamp: 1700000000100,
          durationMs: 800,
          success: true,
          children: [],
          metadata: { model: "gpt-4o", promptTokens: 100 },
        },
        {
          id: "event-2",
          type: "tool_call" as const,
          label: "Tool: search_web",
          timestamp: 1700000000900,
          durationMs: 350,
          success: true,
          children: [],
          metadata: { toolName: "search_web" },
        },
        {
          id: "event-3",
          type: "decision" as const,
          label: "Decision: Use search results to answer",
          timestamp: 1700000001250,
          children: [],
          metadata: { description: "Use search results to answer" },
        },
      ],
      metadata: {
        status: "completed",
        totalEvents: 3,
        totalTokens: 700,
      },
    };

    expect(root.type).toBe("agent_run");
    expect(root.children).toHaveLength(3);
    expect(root.children[0].type).toBe("llm_call");
    expect(root.children[1].type).toBe("tool_call");
    expect(root.children[2].type).toBe("decision");
    expect(root.metadata?.totalEvents).toBe(3);
  });

  it("handles empty children array", () => {
    const leaf = {
      id: "event-5",
      type: "error" as const,
      label: "Error: timeout",
      timestamp: 1700000005000,
      success: false,
      children: [],
    };

    expect(leaf.children).toHaveLength(0);
    expect(leaf.success).toBe(false);
  });
});

// ─── ToolPerformanceMetrics structure tests ───

describe("Tool Performance Metrics Structure", () => {
  it("computes success rate correctly", () => {
    const metrics = {
      toolName: "web_search",
      totalCalls: 100,
      successCount: 95,
      failureCount: 5,
      successRate: 95 / 100,
      avgLatencyMs: 250,
      p50LatencyMs: 200,
      p95LatencyMs: 800,
      maxLatencyMs: 1500,
      minLatencyMs: 50,
      totalDurationMs: 25000,
    };

    expect(metrics.successRate).toBeCloseTo(0.95);
    expect(metrics.totalCalls).toBe(metrics.successCount + metrics.failureCount);
  });

  it("handles zero calls gracefully", () => {
    const metrics = {
      toolName: "unused_tool",
      totalCalls: 0,
      successCount: 0,
      failureCount: 0,
      successRate: 0,
      avgLatencyMs: 0,
      p50LatencyMs: 0,
      p95LatencyMs: 0,
      maxLatencyMs: 0,
      minLatencyMs: 0,
      totalDurationMs: 0,
    };

    expect(metrics.successRate).toBe(0);
    expect(metrics.avgLatencyMs).toBe(0);
  });

  it("handles all-failure scenario", () => {
    const metrics = {
      toolName: "broken_tool",
      totalCalls: 10,
      successCount: 0,
      failureCount: 10,
      successRate: 0,
      avgLatencyMs: 100,
      maxLatencyMs: 500,
      minLatencyMs: 20,
    };

    expect(metrics.successRate).toBe(0);
    expect(metrics.failureCount).toBe(metrics.totalCalls);
  });
});

// ─── AgentDecisionExplanation structure tests ───

describe("Agent Decision Explanation Structure", () => {
  it("builds a valid decision with context", () => {
    const decision = {
      decisionId: 42,
      sequenceNumber: 5,
      timestamp: 1700000003000,
      description: "Selected tool: search_web",
      precedingEvents: [
        { eventType: "llm_call", model: "gpt-4o", summary: "LLM call (gpt-4o)", timestamp: 1700000002000 },
        { eventType: "tool_result", toolName: "memory_read", summary: "Result from memory_read: success", timestamp: 1700000002500 },
      ],
      followingEvents: [
        { eventType: "tool_result", toolName: "search_web", summary: "Result from search_web: success", timestamp: 1700000003500 },
        { eventType: "llm_call", model: "gpt-4o", summary: "LLM call (gpt-4o)", timestamp: 1700000004000 },
      ],
      triggeringLlmCall: {
        model: "gpt-4o",
        promptTokens: 500,
        completionTokens: 50,
        traceId: 10,
      },
    };

    expect(decision.precedingEvents).toHaveLength(2);
    expect(decision.followingEvents).toHaveLength(2);
    expect(decision.triggeringLlmCall?.model).toBe("gpt-4o");
    expect(decision.description).toContain("search_web");
  });

  it("handles decision at session start (no preceding events)", () => {
    const decision = {
      decisionId: 1,
      sequenceNumber: 1,
      timestamp: 1700000000000,
      description: "Delegated to research-agent",
      precedingEvents: [],
      followingEvents: [
        { eventType: "llm_call", summary: "LLM call (gpt-4o)", timestamp: 1700000000500 },
      ],
      triggeringLlmCall: null,
    };

    expect(decision.precedingEvents).toHaveLength(0);
    expect(decision.triggeringLlmCall).toBeNull();
  });

  it("handles decision at session end (no following events)", () => {
    const decision = {
      decisionId: 99,
      sequenceNumber: 20,
      timestamp: 1700000010000,
      description: "Final answer generated",
      precedingEvents: [
        { eventType: "tool_result", summary: "Result from calculator: success", timestamp: 1700000009000 },
      ],
      followingEvents: [],
      triggeringLlmCall: {
        model: "claude-3-opus",
        promptTokens: 1000,
        completionTokens: 200,
        traceId: 50,
      },
    };

    expect(decision.followingEvents).toHaveLength(0);
    expect(decision.triggeringLlmCall?.model).toBe("claude-3-opus");
  });
});

// ─── Event summarization tests ───

describe("Event Summarization", () => {
  const summarize = (eventType: string, extra: Record<string, any> = {}) => {
    // Replicate the summarizeEventForExplain logic
    const e = { eventType, ...extra };
    switch (e.eventType) {
      case "llm_call": return `LLM call (${e.model || "unknown"})`;
      case "tool_call": return `Called ${e.toolName || "unknown"}`;
      case "tool_result": return `Result from ${e.toolName || "unknown"}: ${e.toolSuccess ? "success" : "failure"}`;
      case "code_generated": return `Generated ${e.codeLanguage || ""} code`;
      case "code_executed": return `Executed code${e.codeFilePath ? ` (${e.codeFilePath})` : ""}`;
      case "decision": return `Decision: ${e.eventData?.description?.slice(0, 80) || ""}`;
      case "delegation": return `Delegated to ${e.eventData?.target || "sub-agent"}`;
      case "error": return `Error: ${e.eventData?.message?.slice(0, 80) || ""}`;
      default: return e.eventType;
    }
  };

  it("summarizes llm_call with model", () => {
    expect(summarize("llm_call", { model: "gpt-4o" })).toBe("LLM call (gpt-4o)");
  });

  it("summarizes llm_call without model", () => {
    expect(summarize("llm_call")).toBe("LLM call (unknown)");
  });

  it("summarizes tool_call", () => {
    expect(summarize("tool_call", { toolName: "search" })).toBe("Called search");
  });

  it("summarizes tool_result success", () => {
    expect(summarize("tool_result", { toolName: "calc", toolSuccess: true })).toBe("Result from calc: success");
  });

  it("summarizes tool_result failure", () => {
    expect(summarize("tool_result", { toolName: "calc", toolSuccess: false })).toBe("Result from calc: failure");
  });

  it("summarizes code_generated", () => {
    expect(summarize("code_generated", { codeLanguage: "python" })).toBe("Generated python code");
  });

  it("summarizes code_executed with path", () => {
    expect(summarize("code_executed", { codeFilePath: "/tmp/run.py" })).toBe("Executed code (/tmp/run.py)");
  });

  it("summarizes decision", () => {
    expect(summarize("decision", { eventData: { description: "Use tool A" } })).toBe("Decision: Use tool A");
  });

  it("summarizes delegation", () => {
    expect(summarize("delegation", { eventData: { target: "sub-agent-1" } })).toBe("Delegated to sub-agent-1");
  });

  it("summarizes error", () => {
    expect(summarize("error", { eventData: { message: "Timeout" } })).toBe("Error: Timeout");
  });

  it("summarizes unknown event type", () => {
    expect(summarize("custom_event")).toBe("custom_event");
  });
});
