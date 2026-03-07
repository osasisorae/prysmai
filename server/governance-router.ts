/**
 * Governance Router — tRPC procedures for the governance dashboard.
 *
 * Provides data to:
 *   - Session Explorer (list, detail, events, timeline)
 *   - Governance Dashboard (aggregate metrics, behavior trends)
 *   - Policy Manager (CRUD for governance policies)
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, sql, count, gte, lte, asc } from "drizzle-orm";
import { getDb, getOrganizationByOwnerId, getProjectById } from "./db";
import {
  agentSessions,
  sessionEvents,
  behavioralAssessments,
  governancePolicies,
  governanceViolations,
  sessionSummaries,
} from "../drizzle/schema";
import {
  listSessions,
  countSessions,
  getSessionByExternalId,
  getSessionEvents,
  getAssessmentsForSession,
  getViolationsForSession,
  getActivePolicies,
  getPolicyById,
} from "./mcp/session-manager";

// ─── Helpers ───

async function requireOrg(userId: number) {
  const org = await getOrganizationByOwnerId(userId);
  if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "No organization found." });
  return org;
}

async function requireProject(projectId: number, orgId: number) {
  const project = await getProjectById(projectId);
  if (!project || project.orgId !== orgId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
  }
  return project;
}

// ─── Router ───

export const governanceRouter = router({
  // ─── Session Explorer ───

  /** List sessions with pagination and filtering */
  listSessions: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        status: z.enum(["active", "completed", "failed", "timeout"]).optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const org = await requireOrg(ctx.user.id);
      await requireProject(input.projectId, org.id);

      const sessions = await listSessions(input.projectId, {
        status: input.status,
        limit: input.limit,
        offset: input.offset,
      });
      const total = await countSessions(input.projectId);

      return {
        sessions: sessions.map((s) => ({
          id: s.id,
          sessionId: s.sessionId,
          agentType: s.agentType,
          status: s.status,
          outcome: s.outcome,
          behaviorScore: s.behaviorScore,
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          durationMs: s.durationMs,
          taskInstructions: s.taskInstructions?.slice(0, 200),
        })),
        total,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /** Get full session detail including events and assessments */
  getSession: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        sessionId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const org = await requireOrg(ctx.user.id);
      await requireProject(input.projectId, org.id);

      const session = await getSessionByExternalId(input.projectId, input.sessionId);
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });
      }

      const events = await getSessionEvents(session.id, { limit: 500 });
      const assessments = await getAssessmentsForSession(session.id);
      const violations = await getViolationsForSession(session.id);

      return {
        session,
        events: events.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          sequenceNumber: e.sequenceNumber,
          toolName: e.toolName,
          eventData: e.eventData,
          codeContent: e.codeContent?.slice(0, 500),
          codeFilePath: e.codeFilePath,
          eventTimestamp: e.eventTimestamp,
        })),
        assessments: assessments.map((a) => ({
          id: a.id,
          overallScore: a.overallScore,
          assessmentType: a.assessmentType,
          detectors: a.detectors,
          recommendations: a.recommendations,
          assessedAt: a.assessedAt,
          processingMs: a.processingMs,
        })),
        violations: violations.map((v) => ({
          id: v.id,
          severity: v.severity,
          description: v.description,
          policyId: v.policyId,
          detectedAt: v.detectedAt,
        })),
      };
    }),

  /** Get session event timeline for visualization */
  getSessionTimeline: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        sessionId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const org = await requireOrg(ctx.user.id);
      await requireProject(input.projectId, org.id);

      const session = await getSessionByExternalId(input.projectId, input.sessionId);
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });
      }

      const events = await getSessionEvents(session.id, { limit: 1000 });

      // Build timeline entries
      const timeline = events.map((e) => ({
        sequenceNumber: e.sequenceNumber,
        eventType: e.eventType,
        toolName: e.toolName,
        eventTimestamp: e.eventTimestamp,
        // Summarize data for timeline (no full code)
        summary: summarizeEvent(e),
      }));

      return { timeline };
    }),

  // ─── Governance Dashboard (Aggregate Metrics) ───

  /** Get aggregate governance metrics for the dashboard overview */
  getMetrics: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        from: z.number().optional(), // UTC ms
        to: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const org = await requireOrg(ctx.user.id);
      await requireProject(input.projectId, org.id);

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });

      // Build date conditions
      const conditions = [eq(agentSessions.projectId, input.projectId)];
      if (input.from) conditions.push(gte(agentSessions.startedAt, input.from));
      if (input.to) conditions.push(lte(agentSessions.startedAt, input.to));

      // Total sessions
      const [totalResult] = await db
        .select({ count: count() })
        .from(agentSessions)
        .where(and(...conditions));
      const totalSessions = totalResult?.count ?? 0;

      // Active sessions
      const [activeResult] = await db
        .select({ count: count() })
        .from(agentSessions)
        .where(
          and(
            eq(agentSessions.projectId, input.projectId),
            eq(agentSessions.status, "active")
          )
        );
      const activeSessions = activeResult?.count ?? 0;

      // Average behavior score
      const [avgScoreResult] = await db
        .select({ avg: sql<number>`AVG(${agentSessions.behaviorScore})` })
        .from(agentSessions)
        .where(and(...conditions, sql`${agentSessions.behaviorScore} IS NOT NULL`));
      const avgBehaviorScore = avgScoreResult?.avg ? Math.round(avgScoreResult.avg) : null;

      // Violation count
      const violationConditions = [eq(governanceViolations.projectId, input.projectId)];
      if (input.from) violationConditions.push(gte(governanceViolations.detectedAt, input.from));
      if (input.to) violationConditions.push(lte(governanceViolations.detectedAt, input.to));

      const [violationResult] = await db
        .select({ count: count() })
        .from(governanceViolations)
        .where(and(...violationConditions));
      const totalViolations = violationResult?.count ?? 0;

      // Sessions by outcome
      const outcomeBreakdown = await db
        .select({
          outcome: agentSessions.outcome,
          count: count(),
        })
        .from(agentSessions)
        .where(and(...conditions))
        .groupBy(agentSessions.outcome);

      // Sessions by agent type
      const agentBreakdown = await db
        .select({
          agentType: agentSessions.agentType,
          count: count(),
        })
        .from(agentSessions)
        .where(and(...conditions))
        .groupBy(agentSessions.agentType);

      return {
        totalSessions,
        activeSessions,
        avgBehaviorScore,
        totalViolations,
        outcomeBreakdown: outcomeBreakdown.map((r) => ({
          outcome: r.outcome ?? "unknown",
          count: r.count,
        })),
        agentBreakdown: agentBreakdown.map((r) => ({
          agentType: r.agentType,
          count: r.count,
        })),
      };
    }),

  /** Get behavior score trends over time (daily buckets) */
  getBehaviorTrends: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        days: z.number().min(1).max(90).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const org = await requireOrg(ctx.user.id);
      await requireProject(input.projectId, org.id);

      const db = await getDb();
      if (!db) return { trends: [] };

      const fromMs = Date.now() - input.days * 24 * 60 * 60 * 1000;

      const rows = await db
        .select({
          day: sql<string>`DATE(FROM_UNIXTIME(${agentSessions.startedAt} / 1000))`.as("day"),
          avgScore: sql<number>`AVG(${agentSessions.behaviorScore})`.as("avg_score"),
          sessionCount: count().as("session_count"),
        })
        .from(agentSessions)
        .where(
          and(
            eq(agentSessions.projectId, input.projectId),
            gte(agentSessions.startedAt, fromMs),
            sql`${agentSessions.behaviorScore} IS NOT NULL`
          )
        )
        .groupBy(sql`day`)
        .orderBy(sql`day`);

      return {
        trends: rows.map((r) => ({
          date: r.day,
          avgScore: Math.round(r.avgScore),
          sessionCount: r.sessionCount,
        })),
      };
    }),

  /** Get detector-level breakdown */
  getDetectorBreakdown: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const org = await requireOrg(ctx.user.id);
      await requireProject(input.projectId, org.id);

      const db = await getDb();
      if (!db) return { detectors: [] };

      // Get recent assessments
      const assessments = await db
        .select()
        .from(behavioralAssessments)
        .where(eq(behavioralAssessments.projectId, input.projectId))
        .orderBy(desc(behavioralAssessments.assessedAt))
        .limit(input.limit);

      // Aggregate detector results
      const detectorStats = new Map<
        string,
        { triggeredCount: number; totalCount: number; totalSeverity: number }
      >();

      for (const assessment of assessments) {
        const detectors = assessment.detectors as Array<{
          detectorId: string;
          triggered: boolean;
          severity: number;
        }>;
        if (!detectors) continue;

        for (const d of detectors) {
          const stats = detectorStats.get(d.detectorId) ?? {
            triggeredCount: 0,
            totalCount: 0,
            totalSeverity: 0,
          };
          stats.totalCount++;
          if (d.triggered) {
            stats.triggeredCount++;
            stats.totalSeverity += d.severity;
          }
          detectorStats.set(d.detectorId, stats);
        }
      }

      return {
        detectors: Array.from(detectorStats.entries()).map(([id, stats]) => ({
          detectorId: id,
          triggeredCount: stats.triggeredCount,
          totalAssessments: stats.totalCount,
          triggerRate: stats.totalCount > 0 ? Math.round((stats.triggeredCount / stats.totalCount) * 100) : 0,
          avgSeverity:
            stats.triggeredCount > 0
              ? Math.round(stats.totalSeverity / stats.triggeredCount)
              : 0,
        })),
      };
    }),

  // ─── Policy Manager ───

  /** List policies for a project */
  listPolicies: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const org = await requireOrg(ctx.user.id);
      await requireProject(input.projectId, org.id);

      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(governancePolicies)
        .where(eq(governancePolicies.projectId, input.projectId))
        .orderBy(desc(governancePolicies.createdAt));
    }),

  /** Create a new policy */
  createPolicy: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        name: z.string().min(1).max(128),
        description: z.string().optional(),
        policyType: z.enum([
          "behavioral",
          "security",
          "cost",
          "model_access",
          "tool_access",
          "content",
          "compliance",
        ]),
        rules: z.record(z.string(), z.unknown()),
        enforcement: z.enum(["monitor", "warn", "block"]).default("monitor"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const org = await requireOrg(ctx.user.id);
      await requireProject(input.projectId, org.id);
      const db = await getDb();;
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [result] = await db.insert(governancePolicies).values({
        projectId: input.projectId,
        name: input.name,
        description: input.description ?? null,
        policyType: input.policyType,
        rules: input.rules as Record<string, unknown>,
        enforcement: input.enforcement,
        enabled: true,
        createdBy: ctx.user.id,
      });

      return { id: result.insertId };
    }),

  /** Update a policy */
  updatePolicy: protectedProcedure
    .input(
      z.object({
        policyId: z.number(),
        name: z.string().min(1).max(128).optional(),
        description: z.string().optional(),
        rules: z.record(z.string(), z.unknown()).optional(),
        enforcement: z.enum(["monitor", "warn", "block"]).optional(),
        enabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const org = await requireOrg(ctx.user.id);

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const db2 = await getDb();
      if (!db2) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [policy] = await db2.select().from(governancePolicies).where(eq(governancePolicies.id, input.policyId)).limit(1);
      if (!policy) throw new TRPCError({ code: "NOT_FOUND", message: "Policy not found." });
      await requireProject(policy.projectId, org.id);

      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.rules !== undefined) updates.rules = input.rules;
      if (input.enforcement !== undefined) updates.enforcement = input.enforcement;
      if (input.enabled !== undefined) updates.enabled = input.enabled;

      if (Object.keys(updates).length > 0) {
        await db
          .update(governancePolicies)
          .set(updates)
          .where(eq(governancePolicies.id, input.policyId));
      }

      return { success: true };
    }),

  /** Delete a policy */
  deletePolicy: protectedProcedure
    .input(z.object({ policyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const org = await requireOrg(ctx.user.id);

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [policy2] = await db.select().from(governancePolicies).where(eq(governancePolicies.id, input.policyId)).limit(1);
      if (!policy2) throw new TRPCError({ code: "NOT_FOUND", message: "Policy not found." });
      await requireProject(policy2.projectId, org.id);

      await db
        .delete(governancePolicies)
        .where(eq(governancePolicies.id, input.policyId));

      return { success: true };
    }),

  /** List violations for a project */
  listViolations: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const org = await requireOrg(ctx.user.id);
      await requireProject(input.projectId, org.id);

      const db = await getDb();
      if (!db) return { violations: [], total: 0 };

      const violations = await db
        .select()
        .from(governanceViolations)
        .where(eq(governanceViolations.projectId, input.projectId))
        .orderBy(desc(governanceViolations.detectedAt))
        .limit(input.limit)
        .offset(input.offset);

      const [totalResult] = await db
        .select({ count: count() })
        .from(governanceViolations)
        .where(eq(governanceViolations.projectId, input.projectId));

      return {
        violations,
        total: totalResult?.count ?? 0,
      };
    }),
});

// ─── Helpers ───

function summarizeEvent(event: any): string {
  const data = event.eventData as Record<string, unknown> | null;
  switch (event.eventType) {
    case "llm_call":
      return `LLM call${data?.model ? ` (${data.model})` : ""}`;
    case "tool_call":
      return `Called ${event.toolName || "unknown tool"}`;
    case "tool_result":
      return `Result from ${event.toolName || "unknown tool"}`;
    case "code_generated":
      return `Generated ${data?.language || ""} code${event.codeFilePath ? ` → ${event.codeFilePath}` : ""}`;
    case "code_executed":
      return `Executed code${event.codeFilePath ? ` (${event.codeFilePath})` : ""}`;
    case "file_read":
      return `Read file${data?.path ? `: ${data.path}` : ""}`;
    case "file_write":
      return `Wrote file${data?.path ? `: ${data.path}` : ""}`;
    case "decision":
      return `Decision: ${(data?.description as string)?.slice(0, 100) || ""}`;
    case "error":
      return `Error: ${(data?.message as string)?.slice(0, 100) || "unknown"}`;
    case "delegation":
      return `Delegated to ${data?.target || "sub-agent"}`;
    default:
      return event.eventType;
  }
}
