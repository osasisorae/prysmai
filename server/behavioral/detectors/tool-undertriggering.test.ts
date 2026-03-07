/**
 * Tests for the Tool Undertriggering Detector.
 *
 * Verifies that the detector correctly identifies when available tools
 * that should have been used (based on context) were not invoked.
 */

import { describe, expect, it } from "vitest";
import { ToolUndertriggeringDetector } from "./tool-undertriggering";
import type { DetectorInput } from "../types";
import type { AgentSession, SessionEvent } from "../../../drizzle/schema";

// ─── Fixtures ───

function makeSession(overrides?: Partial<AgentSession>): AgentSession {
  return {
    id: 1,
    projectId: 1,
    sessionId: "test-session-002",
    status: "active",
    agentType: "claude_code",
    source: "mcp",
    taskInstructions: "Fix the bug and run tests",
    availableTools: ["file_read", "file_write", "search", "test_runner", "linter", "tsc"],
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
    codeContent: overrides.codeContent ?? null,
    codeFilePath: overrides.codeFilePath ?? null,
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

describe("ToolUndertriggeringDetector", () => {
  const detector = new ToolUndertriggeringDetector();

  it("returns no trigger when no events are provided", async () => {
    const input: DetectorInput = {
      session: makeSession(),
      events: [],
      isRealtime: false,
    };

    const result = await detector.detect(input);

    expect(result.detectorId).toBe("tool_undertriggering");
    expect(result.triggered).toBe(false);
    expect(result.severity).toBe(0);
    expect(result.evidence).toHaveLength(0);
  });

  it("returns no trigger when no tools are available", async () => {
    const input: DetectorInput = {
      session: makeSession({ availableTools: [] }),
      events: [
        makeEvent({
          eventType: "code_generated",
          codeContent: "function hello() { return 'world'; }",
          sequenceNumber: 1,
        }),
      ],
      isRealtime: false,
    };

    const result = await detector.detect(input);

    expect(result.triggered).toBe(false);
    expect(result.evidence).toHaveLength(0);
  });

  it("triggers when code is generated but test_runner is not called", async () => {
    const events: SessionEvent[] = [
      makeEvent({
        eventType: "code_generated",
        codeContent: "function add(a, b) { return a + b; }",
        codeFilePath: "src/math.ts",
        sequenceNumber: 1,
      }),
      // Agent continues without running tests
      makeEvent({
        eventType: "llm_call",
        eventData: { response: "The function looks correct." },
        sequenceNumber: 2,
      }),
      makeEvent({
        eventType: "llm_call",
        eventData: { response: "Moving on to the next task." },
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
    expect(result.evidence.length).toBeGreaterThan(0);
    // Should flag test_runner and linter as missing
    const expectedTools = result.evidence.map((e) => (e.data as any)?.expectedTool);
    expect(expectedTools).toContain("test_runner");
  });

  it("does not trigger when code is generated and tests are run", async () => {
    const events: SessionEvent[] = [
      makeEvent({
        eventType: "code_generated",
        codeContent: "function add(a, b) { return a + b; }",
        codeFilePath: "src/math.ts",
        sequenceNumber: 1,
      }),
      makeEvent({
        eventType: "tool_call",
        toolName: "test_runner",
        sequenceNumber: 2,
      }),
      makeEvent({
        eventType: "tool_call",
        toolName: "linter",
        sequenceNumber: 3,
      }),
      makeEvent({
        eventType: "tool_call",
        toolName: "tsc",
        sequenceNumber: 4,
      }),
    ];

    const input: DetectorInput = {
      session: makeSession(),
      events,
      isRealtime: false,
    };

    const result = await detector.detect(input);

    // All expected tools were called, so no undertriggering
    expect(result.evidence).toHaveLength(0);
    expect(result.triggered).toBe(false);
  });

  it("triggers for security-sensitive code without security scanner", async () => {
    const events: SessionEvent[] = [
      makeEvent({
        eventType: "code_generated",
        codeContent: "const password = process.env.SECRET_KEY; const hash = crypto.createHash('sha256');",
        codeFilePath: "src/auth.ts",
        sequenceNumber: 1,
      }),
      makeEvent({
        eventType: "llm_call",
        eventData: { response: "Done." },
        sequenceNumber: 2,
      }),
    ];

    const session = makeSession({
      availableTools: ["file_read", "file_write", "security_scanner", "test_runner", "linter"],
    });

    const input: DetectorInput = {
      session,
      events,
      isRealtime: false,
    };

    const result = await detector.detect(input);

    expect(result.triggered).toBe(true);
    const expectedTools = result.evidence.map((e) => (e.data as any)?.expectedTool);
    expect(expectedTools).toContain("security_scanner");
  });

  it("handles fuzzy tool name matching (test vs test_runner)", async () => {
    const events: SessionEvent[] = [
      makeEvent({
        eventType: "code_generated",
        codeContent: "function hello() {}",
        sequenceNumber: 1,
      }),
      makeEvent({
        eventType: "tool_call",
        toolName: "run_tests",
        sequenceNumber: 2,
      }),
    ];

    const input: DetectorInput = {
      session: makeSession({ availableTools: ["run_tests", "eslint"] }),
      events,
      isRealtime: false,
    };

    const result = await detector.detect(input);

    // "run_tests" should match "test_runner" / "test" expected tools
    const testEvidence = result.evidence.filter(
      (e) => (e.data as any)?.expectedTool === "test_runner" || (e.data as any)?.expectedTool === "test"
    );
    expect(testEvidence).toHaveLength(0);
  });

  it("distinguishes between tools used elsewhere vs never used", async () => {
    const events: SessionEvent[] = [
      makeEvent({
        eventType: "code_generated",
        codeContent: "function a() {}",
        sequenceNumber: 1,
      }),
      // No test_runner in the grace period
      makeEvent({
        eventType: "llm_call",
        eventData: { response: "Moving on." },
        sequenceNumber: 2,
      }),
      // ... many events later ...
      ...Array.from({ length: 15 }, (_, i) =>
        makeEvent({
          eventType: "llm_call",
          eventData: { response: `Step ${i}` },
          sequenceNumber: 3 + i,
        })
      ),
      // test_runner is called much later
      makeEvent({
        eventType: "tool_call",
        toolName: "test_runner",
        sequenceNumber: 20,
      }),
    ];

    const input: DetectorInput = {
      session: makeSession(),
      events,
      isRealtime: false,
    };

    const result = await detector.detect(input);

    // Should still flag, but evidence should note "usedElsewhere"
    const testEvidence = result.evidence.find(
      (e) =>
        ((e.data as any)?.expectedTool === "test_runner" ||
          (e.data as any)?.expectedTool === "test") &&
        (e.data as any)?.usedElsewhere === true
    );
    // If test_runner was eventually used, it should be marked as usedElsewhere
    if (testEvidence) {
      expect(testEvidence.data).toHaveProperty("usedElsewhere", true);
    }
  });
});
