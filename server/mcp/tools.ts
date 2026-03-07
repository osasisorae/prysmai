/**
 * MCP Tool Handlers
 *
 * Implements the 4 governance tools:
 *   1. prysm_session_start  — Initialize a governance session
 *   2. prysm_check_behavior — Report events and get behavioral feedback
 *   3. prysm_scan_code      — Security scan AI-generated code
 *   4. prysm_session_end    — Complete a session and get governance report
 */

import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  createSession,
  getSessionByExternalId,
  completeSession,
  getActivePolicies,
  getSessionEvents,
  getAssessmentsForSession,
  getViolationsForSession,
  insertAssessment,
} from "./session-manager";
import { ingestEvents, type RawEvent } from "./event-ingester";
import { notifyBehavioralFlag, notifyPolicyViolation } from "./notifications";
import { broadcastSessionEvent } from "../ws-live-feed";

// Behavioral detection engine — imported lazily to avoid circular deps
let detectBehavior: ((sessionId: number, projectId: number, isRealtime: boolean) => Promise<any>) | null = null;

export function setDetectionEngine(fn: typeof detectBehavior): void {
  detectBehavior = fn;
}

/**
 * Register all 4 MCP tools on the server.
 * getProjectId returns the authenticated project ID from the current request context.
 */
export function registerTools(server: Server, getProjectId: () => number | null): void {
  // ─── List Tools ───
  server.setRequestHandler(
    ListToolsRequestSchema,
    async () => {
      return {
        tools: [
          {
            name: "prysm_session_start",
            description:
              "Initialize a Prysm governance session. Call this at the start of every agent task to enable behavioral monitoring, security scanning, and governance reporting. Returns a session_id to use in subsequent tool calls.",
            inputSchema: {
              type: "object" as const,
              properties: {
                task_instructions: {
                  type: "string",
                  description:
                    "The original instructions or task description given to the agent. Used to assess instruction-following quality.",
                },
                agent_type: {
                  type: "string",
                  enum: ["claude_code", "manus", "kiro", "codex", "langchain", "crewai", "custom"],
                  description: "The type of agent initiating the session.",
                },
                available_tools: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of tool names available to the agent. Used to detect tool undertriggering.",
                },
                context: {
                  type: "object",
                  description: "Additional context: repository name, branch, file paths, constraints, etc.",
                },
              },
              required: ["task_instructions", "agent_type"],
            },
          },
          {
            name: "prysm_check_behavior",
            description:
              "Report agent activity and receive real-time behavioral feedback. Call this after significant decisions, tool executions, or code generation. Returns any behavioral flags or policy violations detected.",
            inputSchema: {
              type: "object" as const,
              properties: {
                session_id: {
                  type: "string",
                  description: "The session ID returned by prysm_session_start.",
                },
                events: {
                  type: "array",
                  description: "Array of events since the last check.",
                  items: {
                    type: "object",
                    properties: {
                      event_type: {
                        type: "string",
                        enum: [
                          "llm_call", "tool_call", "tool_result", "code_generated",
                          "code_executed", "file_read", "file_write", "decision",
                          "error", "delegation",
                        ],
                      },
                      data: { type: "object" },
                      timestamp: { type: "number" },
                    },
                    required: ["event_type", "data"],
                  },
                },
              },
              required: ["session_id", "events"],
            },
          },
          {
            name: "prysm_scan_code",
            description:
              "Scan AI-generated code for security vulnerabilities, PII exposure, and policy violations. Returns a detailed security report.",
            inputSchema: {
              type: "object" as const,
              properties: {
                session_id: {
                  type: "string",
                  description: "The session ID for this governance session.",
                },
                code: {
                  type: "string",
                  description: "The code to scan.",
                },
                language: {
                  type: "string",
                  description: "Programming language of the code.",
                  enum: ["python", "typescript", "javascript", "sql", "bash", "go", "rust", "java", "other"],
                },
                file_path: {
                  type: "string",
                  description: "Target file path where this code will be written (for context).",
                },
              },
              required: ["session_id", "code", "language"],
            },
          },
          {
            name: "prysm_session_end",
            description:
              "Complete a Prysm governance session. Triggers full behavioral analysis and generates a governance report. Call this when the agent task is finished.",
            inputSchema: {
              type: "object" as const,
              properties: {
                session_id: {
                  type: "string",
                  description: "The session ID to complete.",
                },
                outcome: {
                  type: "string",
                  enum: ["completed", "failed", "partial", "timeout"],
                  description: "How the task ended.",
                },
                output_summary: {
                  type: "string",
                  description: "Brief summary of what the agent produced.",
                },
                files_modified: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of file paths that were created or modified.",
                },
              },
              required: ["session_id", "outcome"],
            },
          },
        ],
      };
    }
  );

  // ─── Call Tool ───
  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: any) => {
      const toolName = request.params?.name as string;
      const args = (request.params?.arguments ?? {}) as Record<string, unknown>;
      const projectId = getProjectId();

      if (!projectId) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Not authenticated. Provide a valid sk-prysm-* API key." }) }],
          isError: true,
        };
      }

      try {
        switch (toolName) {
          case "prysm_session_start":
            return await handleSessionStart(projectId, args);
          case "prysm_check_behavior":
            return await handleCheckBehavior(projectId, args);
          case "prysm_scan_code":
            return await handleScanCode(projectId, args);
          case "prysm_session_end":
            return await handleSessionEnd(projectId, args);
          default:
            return {
              content: [{ type: "text", text: JSON.stringify({ error: `Unknown tool: ${toolName}` }) }],
              isError: true,
            };
        }
      } catch (err: any) {
        console.error(`[MCP] Tool ${toolName} error:`, err);
        return {
          content: [{ type: "text", text: JSON.stringify({ error: err.message ?? "Internal error" }) }],
          isError: true,
        };
      }
    }
  );
}

// ─── Tool Implementations ───

async function handleSessionStart(projectId: number, args: Record<string, unknown>) {
  const taskInstructions = args.task_instructions as string;
  const agentType = args.agent_type as string;
  const availableTools = args.available_tools as string[] | undefined;
  const context = args.context as Record<string, unknown> | undefined;

  if (!taskInstructions || !agentType) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ error: "task_instructions and agent_type are required" }) }],
      isError: true,
    };
  }

  const session = await createSession({
    projectId,
    taskInstructions,
    agentType: agentType as any,
    availableTools,
    context,
    source: "mcp",
  });

  // Get active policies to inform the agent
  const policies = await getActivePolicies(projectId);

  // Broadcast session start via WebSocket
  broadcastSessionEvent(projectId, {
    type: "session_start",
    sessionId: session.sessionId,
    agentType,
    startedAt: session.startedAt,
  });

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          session_id: session.sessionId,
          started_at: session.startedAt,
          policies: policies.map((p) => ({
            name: p.name,
            type: p.policyType,
            enforcement: p.enforcement,
          })),
          message: "Governance session initialized. Report events with prysm_check_behavior.",
        }),
      },
    ],
  };
}

async function handleCheckBehavior(projectId: number, args: Record<string, unknown>) {
  const sessionId = args.session_id as string;
  const events = args.events as RawEvent[] | undefined;

  if (!sessionId) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ error: "session_id is required" }) }],
      isError: true,
    };
  }

  const session = await getSessionByExternalId(projectId, sessionId);
  if (!session) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ error: `Session ${sessionId} not found` }) }],
      isError: true,
    };
  }

  if (session.status !== "active") {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ error: `Session ${sessionId} is ${session.status}, not active` }) }],
      isError: true,
    };
  }

  // Ingest events
  let ingestResult = { eventIds: [] as number[], errors: [] as Array<{ index: number; error: string }> };
  if (events && events.length > 0) {
    ingestResult = await ingestEvents(session.id, projectId, events);
  }

  // Run real-time behavioral detection
  let flags: any[] = [];
  let violations: any[] = [];
  let recommendations: string[] = [];

  if (detectBehavior) {
    try {
      const assessment = await detectBehavior(session.id, projectId, true);
      if (assessment) {
        flags = (assessment.detectors ?? []).filter((d: any) => d.triggered);
        recommendations = assessment.recommendations ?? [];

        // Notify connected clients about behavioral flags
        for (const flag of flags) {
          notifyBehavioralFlag({
            session_id: sessionId,
            detector_id: flag.detectorId,
            severity: flag.severity,
            evidence: flag.evidence?.[0] ?? {},
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.warn("[MCP] Behavioral detection error:", err);
    }
  }

  // Broadcast events via WebSocket
  if (events && events.length > 0) {
    broadcastSessionEvent(projectId, {
      type: "session_events",
      sessionId,
      eventCount: events.length,
      eventTypes: events.map((e) => e.event_type),
    });
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          events_ingested: ingestResult.eventIds.length,
          errors: ingestResult.errors.length > 0 ? ingestResult.errors : undefined,
          flags: flags.map((f) => ({
            detector: f.detectorId,
            severity: f.severity,
            evidence: f.evidence,
          })),
          violations,
          recommendations,
        }),
      },
    ],
  };
}

async function handleScanCode(projectId: number, args: Record<string, unknown>) {
  const sessionId = args.session_id as string;
  const code = args.code as string;
  const language = args.language as string;
  const filePath = args.file_path as string | undefined;

  if (!sessionId || !code || !language) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ error: "session_id, code, and language are required" }) }],
      isError: true,
    };
  }

  const session = await getSessionByExternalId(projectId, sessionId);
  if (!session) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ error: `Session ${sessionId} not found` }) }],
      isError: true,
    };
  }

  // Run the existing security pipeline on the code as text
  const { assessThreat } = await import("../security/threat-scorer");
  const scanResult = assessThreat(code);

  // Record code_generated event
  await ingestEvents(session.id, projectId, [
    {
      event_type: "code_generated",
      data: {
        language,
        code: code.slice(0, 2000), // preview
        file_path: filePath,
        scan_result: {
          threatScore: scanResult.threatScore,
          threatLevel: scanResult.threatLevel,
        },
      },
    },
  ]);

  // Build vulnerability report from scan results
  const vulnerabilities: Array<{
    type: string;
    severity: string;
    description: string;
  }> = [];

  if (scanResult.injectionResult?.matches) {
    for (const match of scanResult.injectionResult.matches) {
      vulnerabilities.push({
        type: match.category,
        severity: match.severity > 70 ? "high" : match.severity > 40 ? "medium" : "low",
        description: `${match.patternName}: ${match.category}`,
      });
    }
  }

  if (scanResult.piiResult?.types && scanResult.piiResult.types.length > 0) {
    vulnerabilities.push({
      type: "pii_exposure",
      severity: "medium",
      description: `PII detected: ${scanResult.piiResult.types.join(", ")}`,
    });
  }

  const maxSeverity = vulnerabilities.length === 0
    ? "info"
    : vulnerabilities.some((v) => v.severity === "high")
    ? "high"
    : vulnerabilities.some((v) => v.severity === "medium")
    ? "medium"
    : "low";

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          language,
          file_path: filePath,
          vulnerability_count: vulnerabilities.length,
          max_severity: maxSeverity,
          threat_score: scanResult.threatScore,
          vulnerabilities,
          recommendations:
            vulnerabilities.length > 0
              ? ["Review flagged vulnerabilities before committing", "Consider adding input validation"]
              : ["No issues detected"],
        }),
      },
    ],
  };
}

async function handleSessionEnd(projectId: number, args: Record<string, unknown>) {
  const sessionId = args.session_id as string;
  const outcome = args.outcome as string;
  const outputSummary = args.output_summary as string | undefined;
  const filesModified = args.files_modified as string[] | undefined;

  if (!sessionId || !outcome) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ error: "session_id and outcome are required" }) }],
      isError: true,
    };
  }

  const session = await getSessionByExternalId(projectId, sessionId);
  if (!session) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ error: `Session ${sessionId} not found` }) }],
      isError: true,
    };
  }

  // Complete the session
  await completeSession({
    sessionDbId: session.id,
    outcome: outcome as any,
    outputSummary,
    filesModified,
  });

  // Run full post-session behavioral detection
  let assessment: any = null;
  if (detectBehavior) {
    try {
      assessment = await detectBehavior(session.id, projectId, false);
    } catch (err) {
      console.warn("[MCP] Post-session detection error:", err);
    }
  }

  // Get violations
  const violations = await getViolationsForSession(session.id);

  // Broadcast session completion via WebSocket
  broadcastSessionEvent(projectId, {
    type: "session_end",
    sessionId,
    outcome,
    behaviorScore: assessment?.overallScore ?? null,
    durationMs: session.durationMs,
  });

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          session_id: sessionId,
          outcome,
          report: assessment
            ? {
                behavior_score: assessment.overallScore,
                detectors: (assessment.detectors ?? []).map((d: any) => ({
                  id: d.detectorId,
                  triggered: d.triggered,
                  severity: d.severity,
                })),
                summary: assessment.summary,
                recommendations: assessment.recommendations,
              }
            : { message: "Behavioral detection not yet configured" },
          violations: violations.map((v) => ({
            severity: v.severity,
            description: v.description,
            policy_id: v.policyId,
          })),
        }),
      },
    ],
  };
}
