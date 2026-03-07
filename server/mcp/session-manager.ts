/**
 * Session Manager — CRUD for agent sessions and events.
 *
 * Handles the lifecycle of governance sessions:
 *   create → update events → complete
 *
 * All timestamps are UTC milliseconds.
 */

import { v4 as uuidv4 } from "uuid";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { getDb } from "../db";
import {
  agentSessions,
  sessionEvents,
  behavioralAssessments,
  governancePolicies,
  governanceViolations,
  type InsertAgentSession,
  type InsertSessionEvent,
  type InsertBehavioralAssessment,
  type AgentSession,
  type SessionEvent,
} from "../../drizzle/schema";

// ─── Session CRUD ───

export interface CreateSessionInput {
  projectId: number;
  taskInstructions?: string;
  agentType: "claude_code" | "manus" | "kiro" | "codex" | "langchain" | "crewai" | "custom";
  availableTools?: string[];
  context?: Record<string, unknown>;
  source?: "mcp" | "sdk" | "api";
}

export interface CreateSessionResult {
  id: number;
  sessionId: string;
  startedAt: number;
}

export async function createSession(input: CreateSessionInput): Promise<CreateSessionResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const sessionId = `sess_${uuidv4().replace(/-/g, "").slice(0, 24)}`;
  const now = Date.now();

  const values: InsertAgentSession = {
    projectId: input.projectId,
    sessionId,
    status: "active",
    agentType: input.agentType,
    source: input.source ?? "mcp",
    taskInstructions: input.taskInstructions ?? null,
    availableTools: input.availableTools ?? null,
    context: input.context ?? null,
    startedAt: now,
  };

  const result = await db.insert(agentSessions).values(values);
  const insertId = (result as any)[0]?.insertId;

  // Insert session_start event
  await insertEvent({
    sessionDbId: insertId,
    projectId: input.projectId,
    eventType: "session_start",
    eventData: {
      agentType: input.agentType,
      taskInstructions: input.taskInstructions,
      availableTools: input.availableTools,
    },
    eventTimestamp: now,
    sequenceNumber: 0,
  });

  return { id: insertId, sessionId, startedAt: now };
}

export async function getSessionByExternalId(
  projectId: number,
  sessionId: string
): Promise<AgentSession | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(agentSessions)
    .where(
      and(
        eq(agentSessions.projectId, projectId),
        eq(agentSessions.sessionId, sessionId)
      )
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function getSessionById(id: number): Promise<AgentSession | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(agentSessions)
    .where(eq(agentSessions.id, id))
    .limit(1);

  return rows[0] ?? null;
}

export async function listSessions(
  projectId: number,
  opts: { status?: string; limit?: number; offset?: number } = {}
) {
  const db = await getDb();
  if (!db) return [];

  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  let query = db
    .select()
    .from(agentSessions)
    .where(
      opts.status
        ? and(
            eq(agentSessions.projectId, projectId),
            eq(agentSessions.status, opts.status as any)
          )
        : eq(agentSessions.projectId, projectId)
    )
    .orderBy(desc(agentSessions.startedAt))
    .limit(limit)
    .offset(offset);

  return await query;
}

export async function countSessions(projectId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: count() })
    .from(agentSessions)
    .where(eq(agentSessions.projectId, projectId));

  return result[0]?.count ?? 0;
}

export interface CompleteSessionInput {
  sessionDbId: number;
  outcome: "completed" | "failed" | "partial" | "timeout";
  outputSummary?: string;
  filesModified?: string[];
}

export async function completeSession(input: CompleteSessionInput): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const session = await getSessionById(input.sessionDbId);
  if (!session) throw new Error(`Session ${input.sessionDbId} not found`);

  const now = Date.now();
  const durationMs = now - session.startedAt;

  // Count events for this session
  const eventCounts = await db
    .select({
      total: count(),
      llmCalls: sql<number>`SUM(CASE WHEN ${sessionEvents.eventType} = 'llm_call' THEN 1 ELSE 0 END)`,
      toolCalls: sql<number>`SUM(CASE WHEN ${sessionEvents.eventType} = 'tool_call' THEN 1 ELSE 0 END)`,
      totalTokens: sql<number>`COALESCE(SUM(COALESCE(${sessionEvents.promptTokens}, 0) + COALESCE(${sessionEvents.completionTokens}, 0)), 0)`,
      totalCost: sql<number>`COALESCE(SUM(COALESCE(${sessionEvents.costCents}, 0)), 0)`,
    })
    .from(sessionEvents)
    .where(eq(sessionEvents.sessionId, input.sessionDbId));

  const counts = eventCounts[0];

  // Insert session_end event
  const seqResult = await db
    .select({ maxSeq: sql<number>`COALESCE(MAX(${sessionEvents.sequenceNumber}), 0)` })
    .from(sessionEvents)
    .where(eq(sessionEvents.sessionId, input.sessionDbId));

  const nextSeq = (seqResult[0]?.maxSeq ?? 0) + 1;

  await insertEvent({
    sessionDbId: input.sessionDbId,
    projectId: session.projectId,
    eventType: "session_end",
    eventData: {
      outcome: input.outcome,
      outputSummary: input.outputSummary,
      filesModified: input.filesModified,
      durationMs,
    },
    eventTimestamp: now,
    sequenceNumber: nextSeq,
  });

  // Update session record
  await db
    .update(agentSessions)
    .set({
      status: input.outcome === "completed" ? "completed" : input.outcome === "timeout" ? "timeout" : "failed",
      outcome: input.outcome,
      outputSummary: input.outputSummary ?? null,
      filesModified: input.filesModified ?? null,
      endedAt: now,
      durationMs,
      totalEvents: counts?.total ?? 0,
      totalLlmCalls: Number(counts?.llmCalls ?? 0),
      totalToolCalls: Number(counts?.toolCalls ?? 0),
      totalTokens: Number(counts?.totalTokens ?? 0),
      totalCostCents: Number(counts?.totalCost ?? 0),
    })
    .where(eq(agentSessions.id, input.sessionDbId));
}

// ─── Event CRUD ───

export interface InsertEventInput {
  sessionDbId: number;
  projectId: number;
  eventType: string;
  eventData: Record<string, unknown>;
  eventTimestamp?: number;
  sequenceNumber?: number;
  // Optional typed fields
  traceId?: number;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: Record<string, unknown>;
  toolSuccess?: boolean;
  toolDurationMs?: number;
  codeLanguage?: string;
  codeContent?: string;
  codeFilePath?: string;
  codeS3Key?: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  costCents?: number;
}

export async function insertEvent(input: InsertEventInput): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = input.eventTimestamp ?? Date.now();

  // Auto-assign sequence number if not provided
  let seqNum = input.sequenceNumber;
  if (seqNum === undefined) {
    const seqResult = await db
      .select({ maxSeq: sql<number>`COALESCE(MAX(${sessionEvents.sequenceNumber}), -1)` })
      .from(sessionEvents)
      .where(eq(sessionEvents.sessionId, input.sessionDbId));
    seqNum = (seqResult[0]?.maxSeq ?? -1) + 1;
  }

  // Truncate code content to 2K for DB storage
  let codeContent = input.codeContent;
  let codeS3Key = input.codeS3Key;
  if (codeContent && codeContent.length > 2000) {
    // In production, upload full content to S3 and store key
    // For now, truncate and note it was truncated
    codeContent = codeContent.slice(0, 2000);
    // TODO: S3 upload for full content
  }

  const values: InsertSessionEvent = {
    sessionId: input.sessionDbId,
    projectId: input.projectId,
    traceId: input.traceId ?? null,
    eventType: input.eventType as any,
    eventData: input.eventData,
    toolName: input.toolName ?? null,
    toolInput: input.toolInput ?? null,
    toolOutput: input.toolOutput ?? null,
    toolSuccess: input.toolSuccess ?? null,
    toolDurationMs: input.toolDurationMs ?? null,
    codeLanguage: input.codeLanguage ?? null,
    codeContent: codeContent ?? null,
    codeFilePath: input.codeFilePath ?? null,
    codeS3Key: codeS3Key ?? null,
    model: input.model ?? null,
    promptTokens: input.promptTokens ?? null,
    completionTokens: input.completionTokens ?? null,
    costCents: input.costCents ?? null,
    eventTimestamp: now,
    sequenceNumber: seqNum,
  };

  const result = await db.insert(sessionEvents).values(values);
  return (result as any)[0]?.insertId;
}

export async function insertEventsBatch(events: InsertEventInput[]): Promise<number[]> {
  const ids: number[] = [];
  for (const event of events) {
    const id = await insertEvent(event);
    ids.push(id);
  }
  return ids;
}

export async function getSessionEvents(
  sessionDbId: number,
  opts: { eventType?: string; limit?: number; offset?: number } = {}
): Promise<SessionEvent[]> {
  const db = await getDb();
  if (!db) return [];

  const limit = opts.limit ?? 500;
  const offset = opts.offset ?? 0;

  const rows = await db
    .select()
    .from(sessionEvents)
    .where(
      opts.eventType
        ? and(
            eq(sessionEvents.sessionId, sessionDbId),
            eq(sessionEvents.eventType, opts.eventType as any)
          )
        : eq(sessionEvents.sessionId, sessionDbId)
    )
    .orderBy(sessionEvents.sequenceNumber)
    .limit(limit)
    .offset(offset);

  return rows;
}

export async function getLatestSequenceNumber(sessionDbId: number): Promise<number> {
  const db = await getDb();
  if (!db) return -1;

  const result = await db
    .select({ maxSeq: sql<number>`COALESCE(MAX(${sessionEvents.sequenceNumber}), -1)` })
    .from(sessionEvents)
    .where(eq(sessionEvents.sessionId, sessionDbId));

  return result[0]?.maxSeq ?? -1;
}

// ─── Assessment CRUD ───

export async function insertAssessment(input: InsertBehavioralAssessment): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(behavioralAssessments).values(input);
  return (result as any)[0]?.insertId;
}

export async function getAssessmentsForSession(sessionDbId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(behavioralAssessments)
    .where(eq(behavioralAssessments.sessionId, sessionDbId))
    .orderBy(desc(behavioralAssessments.assessedAt));
}

// ─── Policy CRUD ───

export async function getActivePolicies(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(governancePolicies)
    .where(
      and(
        eq(governancePolicies.projectId, projectId),
        eq(governancePolicies.enabled, true)
      )
    );
}

export async function getPolicyById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(governancePolicies)
    .where(eq(governancePolicies.id, id))
    .limit(1);

  return rows[0] ?? null;
}

// ─── Violation CRUD ───

export async function insertViolation(input: {
  sessionId: number;
  eventId?: number;
  policyId: number;
  projectId: number;
  severity: "info" | "low" | "medium" | "high" | "critical";
  description: string;
  evidence?: Record<string, unknown>;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(governanceViolations).values({
    sessionId: input.sessionId,
    eventId: input.eventId ?? null,
    policyId: input.policyId,
    projectId: input.projectId,
    severity: input.severity,
    description: input.description,
    evidence: input.evidence ?? null,
    detectedAt: Date.now(),
  });

  return (result as any)[0]?.insertId;
}

export async function getViolationsForSession(sessionDbId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(governanceViolations)
    .where(eq(governanceViolations.sessionId, sessionDbId))
    .orderBy(desc(governanceViolations.detectedAt));
}
