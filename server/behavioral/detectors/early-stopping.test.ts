/**
 * Tests for the Early Stopping Detector.
 *
 * Verifies that the detector correctly identifies when an agent
 * states intent to use a tool but never follows through.
 */

import { describe, expect, it } from "vitest";
import { EarlyStoppingDetector } from "./early-stopping";
import type { DetectorInput } from "../types";
import type { AgentSession, SessionEvent } from "../../../drizzle/schema";

// ─── Fixtures ───

function makeSession(overrides?: Partial<AgentSession>): AgentSession {
  return {
    id: 1,
    projectId: 1,
    sessionId: "test-session-001",
    status: "active",
    agentType: "claude_code",
    source: "mcp",
    taskInstructions: "Fix the bug",
    availableTools: ["file_read", "file_write", "search", "test_runner"],
    context: null,
    outcome: null,
    outputSummary: null,
    filesModified: null,
    totalEvents: 0,
    totalLlmCalls: 0,
    totalToolCalls: 0,
    totalTokens: 0,
    totalCostCents: 0,
    behaviorScore: null,
    behavioralFlags: null,
    startedAt: Date.now(),
    endedAt: null,
    durationMs: null,
    createdAt: new Date(),
    ...overrides,
  } as AgentSession;
}

function makeEvent(
  overrides: Partial<SessionEvent> & { eventType: SessionEvent["eventType"] }
): SessionEvent {
  return {
    id: 1,
    sessionId: 1,
    projectId: 1,
    traceId: null,
    eventType: overrides.eventType,
    eventData: overrides.eventData ?? {},
    toolName: overrides.toolName ?? null,
    toolInput: null,
    toolOutput: null,
    toolSuccess: null,
    toolDurationMs: null,
    codeLanguage: null,
    codeContent: null,
    codeFilePath: null,
    codeS3Key: null,
    model: null,
    promptTokens: null,
    completionTokens: null,
    costCents: null,
    behavioralFlags: null,
    eventTimestamp: Date.now(),
    sequenceNumber: overrides.sequenceNumber ?? 1,
    summary: null,
    createdAt: new Date(),
    ...overrides,
  } as SessionEvent;
}

// ─── Tests ───

describe("EarlyStoppingDetector", () => {
  const detector = new EarlyStoppingDetector();

  it("returns no trigger when no events are provided", async () => {
    const input: DetectorInput = {
      session: makeSession(),
      events: [],
      isRealtime: false,
    };

    const result = await detector.detect(input);

    expect(result.detectorId).toBe("early_stopping");
    expect(result.triggered).toBe(false);
    expect(result.severity).toBe(0);
    expect(result.evidence).toHaveLength(0);
  });

  it("returns no trigger when intents are followed by matching tool calls", async () => {
    const events: SessionEvent[] = [
      makeEvent({
        eventType: "llm_call",
        eventData: { response: "I'll use the search tool to find the relevant files." },
        sequenceNumber: 1,
      }),
      makeEvent({
        eventType: "tool_call",
        toolName: "search",
        sequenceNumber: 2,
      }),
      makeEvent({
        eventType: "llm_call",
        eventData: { response: "Let me read the file to understand the code." },
        sequenceNumber: 3,
      }),
      makeEvent({
        eventType: "tool_call",
        toolName: "file_read",
        sequenceNumber: 4,
      }),
    ];

    const input: DetectorInput = {
      session: makeSession(),
      events,
      isRealtime: false,
    };

    const result = await detector.detect(input);

    expect(result.triggered).toBe(false);
    expect(result.evidence).toHaveLength(0);
  });

  it("detects unfollowed intent even below trigger threshold", async () => {
    // Single unfollowed intent with 3 LLM calls scores ~32 (below 70 threshold)
    // but evidence should still be collected
    const events: SessionEvent[] = [
      makeEvent({
        eventType: "llm_call",
        eventData: { response: "I'll use the search tool to find the relevant files." },
        sequenceNumber: 1,
      }),
      makeEvent({
        eventType: "llm_call",
        eventData: { response: "The file seems to be in the src directory." },
        sequenceNumber: 2,
      }),
      makeEvent({
        eventType: "llm_call",
        eventData: { response: "Based on my analysis, the bug is in line 42." },
        sequenceNumber: 3,
      }),
    ];

    const input: DetectorInput = {
      session: makeSession(),
      events,
      isRealtime: false,
    };

    const result = await detector.detect(input);

    // Evidence is collected even if severity is below trigger threshold
    expect(result.severity).toBeGreaterThan(0);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence[0].type).toBe("unfollowed_intent");
  });

  it("triggers when multiple intents go unfollowed (high severity)", async () => {
    // 3 unfollowed intents in 3 LLM calls → high ratio → triggers
    const events: SessionEvent[] = [
      makeEvent({
        eventType: "llm_call",
        eventData: { response: "I'll use the search tool to find the files." },
        sequenceNumber: 1,
      }),
      makeEvent({
        eventType: "llm_call",
        eventData: { response: "Let me run the test runner to verify." },
        sequenceNumber: 2,
      }),
      makeEvent({
        eventType: "llm_call",
        eventData: { response: "I'll use the linter to check for issues." },
        sequenceNumber: 3,
      }),
    ];

    const input: DetectorInput = {
      session: makeSession(),
      events,
      isRealtime: false,
    };

    const result = await detector.detect(input);

    expect(result.triggered).toBe(true);
    expect(result.severity).toBeGreaterThanOrEqual(70);
    expect(result.evidence.length).toBeGreaterThanOrEqual(2);
  });

  it("handles multiple unfollowed intents and increases severity", async () => {
    const events: SessionEvent[] = [
      makeEvent({
        eventType: "llm_call",
        eventData: { response: "Let me run the test runner to verify." },
        sequenceNumber: 1,
      }),
      makeEvent({
        eventType: "llm_call",
        eventData: { response: "I'll use the linter to check for issues." },
        sequenceNumber: 2,
      }),
      makeEvent({
        eventType: "llm_call",
        eventData: { response: "Running the search tool now." },
        sequenceNumber: 3,
      }),
      // None of the tools are actually called
      makeEvent({
        eventType: "llm_call",
        eventData: { response: "Everything looks good." },
        sequenceNumber: 4,
      }),
    ];

    const input: DetectorInput = {
      session: makeSession(),
      events,
      isRealtime: false,
    };

    const result = await detector.detect(input);

    expect(result.triggered).toBe(true);
    expect(result.evidence.length).toBeGreaterThanOrEqual(2);
    // Multiple unfollowed intents should increase severity
    expect(result.severity).toBeGreaterThan(25);
  });

  it("does not trigger for non-LLM events", async () => {
    const events: SessionEvent[] = [
      makeEvent({
        eventType: "tool_call",
        toolName: "search",
        eventData: { query: "I'll use the file_write tool" },
        sequenceNumber: 1,
      }),
      makeEvent({
        eventType: "tool_result",
        toolName: "search",
        eventData: { result: "Found 3 files" },
        sequenceNumber: 2,
      }),
    ];

    const input: DetectorInput = {
      session: makeSession(),
      events,
      isRealtime: false,
    };

    const result = await detector.detect(input);

    expect(result.triggered).toBe(false);
    expect(result.evidence).toHaveLength(0);
  });

  it("handles various LLM response field names", async () => {
    const events: SessionEvent[] = [
      makeEvent({
        eventType: "llm_call",
        eventData: { content: "I'll use the search tool now." },
        sequenceNumber: 1,
      }),
      // No tool call follows
      makeEvent({
        eventType: "llm_call",
        eventData: { output: "Done." },
        sequenceNumber: 2,
      }),
    ];

    const input: DetectorInput = {
      session: makeSession(),
      events,
      isRealtime: false,
    };

    const result = await detector.detect(input);

    // Evidence should be collected regardless of field name
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence[0].type).toBe("unfollowed_intent");
  });

  it("matches tool calls with fuzzy naming (file_write ↔ write_file)", async () => {
    const events: SessionEvent[] = [
      makeEvent({
        eventType: "llm_call",
        eventData: { response: "I'll use the file write tool to save changes." },
        sequenceNumber: 1,
      }),
      makeEvent({
        eventType: "tool_call",
        toolName: "write_file",
        sequenceNumber: 2,
      }),
    ];

    const input: DetectorInput = {
      session: makeSession(),
      events,
      isRealtime: false,
    };

    const result = await detector.detect(input);

    expect(result.triggered).toBe(false);
  });
});
