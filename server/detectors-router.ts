/**
 * Advanced Governance Detectors Router
 *
 * Provides tRPC procedures for:
 *   - Financial Anomaly Detection (cost spikes, budget overruns)
 *   - Resource Access Violations (unauthorized tools, domains, files)
 *   - Loop Detection (repeated tools, circular sequences, circuit breakers)
 *   - Multi-Agent Coordination (delegation chains, conflicts, network topology)
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, sql, count, gte, lte, asc, inArray } from "drizzle-orm";
import { getDb, getOrganizationByOwnerId, getProjectById } from "./db";
import {
  financialAlerts,
  resourceAccessViolations,
  loopDetections,
  multiAgentEvents,
  agentNetworkSnapshots,
  agentSessions,
} from "../drizzle/schema";

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

export const detectorsRouter = router({
  // ═══════════════════════════════════════════════════════════════
  // 1. FINANCIAL ANOMALY DETECTION
  // ═══════════════════════════════════════════════════════════════

  /** List financial alerts with filtering */
  listFinancialAlerts: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        alertType: z.enum(["cost_spike", "budget_exceeded", "velocity_anomaly", "cumulative_overrun"]).optional(),
        severity: z.enum(["info", "warning", "critical", "halt"]).optional(),
        status: z.enum(["open", "acknowledged", "resolved", "false_positive"]).optional(),
        sessionId: z.number().optional(),
        from: z.number().optional(),
        to: z.number().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const org = await requireOrg(ctx.user.id);
      await requireProject(input.projectId, org.id);
      const db = (await getDb())!;

      const conditions = [eq(financialAlerts.projectId, input.projectId)];
      if (input.alertType) conditions.push(eq(financialAlerts.alertType, input.alertType));
      if (input.severity) conditions.push(eq(financialAlerts.severity, input.severity));
      if (input.status) conditions.push(eq(financialAlerts.status, input.status));
      if (input.sessionId) conditions.push(eq(financialAlerts.sessionId, input.sessionId));
      if (input.from) conditions.push(gte(financialAlerts.detectedAt, input.from));
      if (input.to) conditions.push(lte(financialAlerts.detectedAt, input.to));

      const [alerts, [{ total }]] = await Promise.all([
        db
          .select()
          .from(financialAlerts)
          .where(and(...conditions))
          .orderBy(desc(financialAlerts.detectedAt))
          .limit(input.limit)
          .offset(input.offset),
        db
          .select({ total: count() })
          .from(financialAlerts)
          .where(and(...conditions)),
      ]);

      return { alerts, total };
    }),

  /** Get financial summary metrics for a project */
  getFinancialSummary: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        from: z.number().optional(),
        to: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const org = await requireOrg(ctx.user.id);
      await requireProject(input.projectId, org.id);
      const db = (await getDb())!;

      const conditions = [eq(financialAlerts.projectId, input.projectId)];
      if (input.from) conditions.push(gte(financialAlerts.detectedAt, input.from));
      if (input.to) conditions.push(lte(financialAlerts.detectedAt, input.to));

      const [byType, bySeverity, openAlerts] = await Promise.all([
        db
          .select({
            alertType: financialAlerts.alertType,
            count: count(),
            totalCost: sql<number>`SUM(${financialAlerts.currentCostCents})`,
          })
          .from(financialAlerts)
          .where(and(...conditions))
          .groupBy(financialAlerts.alertType),
        db
          .select({
            severity: financialAlerts.severity,
            count: count(),
          })
          .from(financialAlerts)
          .where(and(...conditions))
          .groupBy(financialAlerts.severity),
        db
          .select({ total: count() })
          .from(financialAlerts)
          .where(and(...conditions, eq(financialAlerts.status, "open"))),
      ]);

      return {
        byType,
        bySeverity,
        openAlerts: openAlerts[0]?.total ?? 0,
      };
    }),

  /** Resolve a financial alert */
  resolveFinancialAlert: protectedProcedure
    .input(
      z.object({
        alertId: z.number(),
        status: z.enum(["acknowledged", "resolved", "false_positive"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      await db
        .update(financialAlerts)
        .set({
          status: input.status,
          resolvedBy: ctx.user.id,
          resolvedAt: Date.now(),
        })
        .where(eq(financialAlerts.id, input.alertId));
      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════
  // 2. RESOURCE ACCESS VIOLATIONS
  // ═══════════════════════════════════════════════════════════════

  /** List resource access violations */
  listResourceViolations: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        violationType: z.enum([
          "unauthorized_tool", "blocked_tool", "unauthorized_domain", "blocked_domain",
          "unauthorized_file", "blocked_file",
        ]).optional(),
        resourceCategory: z.enum(["tool", "domain", "file"]).optional(),
        severity: z.enum(["info", "warning", "critical"]).optional(),
        status: z.enum(["open", "acknowledged", "resolved", "false_positive"]).optional(),
        sessionId: z.number().optional(),
        from: z.number().optional(),
        to: z.number().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const org = await requireOrg(ctx.user.id);
      await requireProject(input.projectId, org.id);
      const db = (await getDb())!;

      const conditions = [eq(resourceAccessViolations.projectId, input.projectId)];
      if (input.violationType) conditions.push(eq(resourceAccessViolations.violationType, input.violationType));
      if (input.resourceCategory) conditions.push(eq(resourceAccessViolations.resourceCategory, input.resourceCategory));
      if (input.severity) conditions.push(eq(resourceAccessViolations.severity, input.severity));
      if (input.status) conditions.push(eq(resourceAccessViolations.status, input.status));
      if (input.sessionId) conditions.push(eq(resourceAccessViolations.sessionId, input.sessionId));
      if (input.from) conditions.push(gte(resourceAccessViolations.detectedAt, input.from));
      if (input.to) conditions.push(lte(resourceAccessViolations.detectedAt, input.to));

      const [violations, [{ total }]] = await Promise.all([
        db
          .select()
          .from(resourceAccessViolations)
          .where(and(...conditions))
          .orderBy(desc(resourceAccessViolations.detectedAt))
          .limit(input.limit)
          .offset(input.offset),
        db
          .select({ total: count() })
          .from(resourceAccessViolations)
          .where(and(...conditions)),
      ]);

      return { violations, total };
    }),

  /** Get resource access summary */
  getResourceAccessSummary: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        from: z.number().optional(),
        to: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const org = await requireOrg(ctx.user.id);
      await requireProject(input.projectId, org.id);
      const db = (await getDb())!;

      const conditions = [eq(resourceAccessViolations.projectId, input.projectId)];
      if (input.from) conditions.push(gte(resourceAccessViolations.detectedAt, input.from));
      if (input.to) conditions.push(lte(resourceAccessViolations.detectedAt, input.to));

      const [byCategory, byType, topResources] = await Promise.all([
        db
          .select({
            category: resourceAccessViolations.resourceCategory,
            count: count(),
          })
          .from(resourceAccessViolations)
          .where(and(...conditions))
          .groupBy(resourceAccessViolations.resourceCategory),
        db
          .select({
            violationType: resourceAccessViolations.violationType,
            count: count(),
          })
          .from(resourceAccessViolations)
          .where(and(...conditions))
          .groupBy(resourceAccessViolations.violationType),
        db
          .select({
            resourceName: resourceAccessViolations.resourceName,
            count: count(),
          })
          .from(resourceAccessViolations)
          .where(and(...conditions))
          .groupBy(resourceAccessViolations.resourceName)
          .orderBy(desc(count()))
          .limit(10),
      ]);

      return { byCategory, byType, topResources };
    }),

  /** Resolve a resource access violation */
  resolveResourceViolation: protectedProcedure
    .input(
      z.object({
        violationId: z.number(),
        status: z.enum(["acknowledged", "resolved", "false_positive"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      await db
        .update(resourceAccessViolations)
        .set({
          status: input.status,
          resolvedBy: ctx.user.id,
          resolvedAt: Date.now(),
        })
        .where(eq(resourceAccessViolations.id, input.violationId));
      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════
  // 3. LOOP DETECTION
  // ═══════════════════════════════════════════════════════════════

  /** List loop detections */
  listLoopDetections: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        loopType: z.enum(["repeated_tool", "circular_sequence", "llm_loop", "state_oscillation"]).optional(),
        severity: z.enum(["info", "warning", "critical", "halt"]).optional(),
        status: z.enum(["open", "acknowledged", "resolved", "false_positive"]).optional(),
        sessionId: z.number().optional(),
        from: z.number().optional(),
        to: z.number().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const org = await requireOrg(ctx.user.id);
      await requireProject(input.projectId, org.id);
      const db = (await getDb())!;

      const conditions = [eq(loopDetections.projectId, input.projectId)];
      if (input.loopType) conditions.push(eq(loopDetections.loopType, input.loopType));
      if (input.severity) conditions.push(eq(loopDetections.severity, input.severity));
      if (input.status) conditions.push(eq(loopDetections.status, input.status));
      if (input.sessionId) conditions.push(eq(loopDetections.sessionId, input.sessionId));
      if (input.from) conditions.push(gte(loopDetections.detectedAt, input.from));
      if (input.to) conditions.push(lte(loopDetections.detectedAt, input.to));

      const [detections, [{ total }]] = await Promise.all([
        db
          .select()
          .from(loopDetections)
          .where(and(...conditions))
          .orderBy(desc(loopDetections.detectedAt))
          .limit(input.limit)
          .offset(input.offset),
        db
          .select({ total: count() })
          .from(loopDetections)
          .where(and(...conditions)),
      ]);

      return { detections, total };
    }),

  /** Get loop detection summary */
  getLoopSummary: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        from: z.number().optional(),
        to: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const org = await requireOrg(ctx.user.id);
      await requireProject(input.projectId, org.id);
      const db = (await getDb())!;

      const conditions = [eq(loopDetections.projectId, input.projectId)];
      if (input.from) conditions.push(gte(loopDetections.detectedAt, input.from));
      if (input.to) conditions.push(lte(loopDetections.detectedAt, input.to));

      const [byType, circuitBreakers, recentDetections] = await Promise.all([
        db
          .select({
            loopType: loopDetections.loopType,
            count: count(),
            avgRepetitions: sql<number>`AVG(${loopDetections.repetitionCount})`,
          })
          .from(loopDetections)
          .where(and(...conditions))
          .groupBy(loopDetections.loopType),
        db
          .select({ total: count() })
          .from(loopDetections)
          .where(and(...conditions, eq(loopDetections.circuitBreakerTriggered, true))),
        db
          .select()
          .from(loopDetections)
          .where(and(...conditions))
          .orderBy(desc(loopDetections.detectedAt))
          .limit(5),
      ]);

      return {
        byType,
        circuitBreakersTriggered: circuitBreakers[0]?.total ?? 0,
        recentDetections,
      };
    }),

  /** Resolve a loop detection */
  resolveLoopDetection: protectedProcedure
    .input(
      z.object({
        detectionId: z.number(),
        status: z.enum(["acknowledged", "resolved", "false_positive"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      await db
        .update(loopDetections)
        .set({
          status: input.status,
          resolvedBy: ctx.user.id,
          resolvedAt: Date.now(),
        })
        .where(eq(loopDetections.id, input.detectionId));
      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════
  // 4. MULTI-AGENT COORDINATION MONITORING
  // ═══════════════════════════════════════════════════════════════

  /** List multi-agent events */
  listMultiAgentEvents: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        eventType: z.enum([
          "unexpected_agent", "circular_delegation", "deep_delegation",
          "instruction_conflict", "orphaned_delegation", "communication",
        ]).optional(),
        severity: z.enum(["info", "warning", "critical"]).optional(),
        status: z.enum(["open", "acknowledged", "resolved", "false_positive"]).optional(),
        sessionId: z.number().optional(),
        agentId: z.string().optional(),
        from: z.number().optional(),
        to: z.number().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const org = await requireOrg(ctx.user.id);
      await requireProject(input.projectId, org.id);
      const db = (await getDb())!;

      const conditions = [eq(multiAgentEvents.projectId, input.projectId)];
      if (input.eventType) conditions.push(eq(multiAgentEvents.eventType, input.eventType));
      if (input.severity) conditions.push(eq(multiAgentEvents.severity, input.severity));
      if (input.status) conditions.push(eq(multiAgentEvents.status, input.status));
      if (input.sessionId) conditions.push(eq(multiAgentEvents.sessionId, input.sessionId));
      if (input.from) conditions.push(gte(multiAgentEvents.detectedAt, input.from));
      if (input.to) conditions.push(lte(multiAgentEvents.detectedAt, input.to));

      const [events, [{ total }]] = await Promise.all([
        db
          .select()
          .from(multiAgentEvents)
          .where(and(...conditions))
          .orderBy(desc(multiAgentEvents.detectedAt))
          .limit(input.limit)
          .offset(input.offset),
        db
          .select({ total: count() })
          .from(multiAgentEvents)
          .where(and(...conditions)),
      ]);

      return { events, total };
    }),

  /** Get multi-agent coordination summary */
  getMultiAgentSummary: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        from: z.number().optional(),
        to: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const org = await requireOrg(ctx.user.id);
      await requireProject(input.projectId, org.id);
      const db = (await getDb())!;

      const conditions = [eq(multiAgentEvents.projectId, input.projectId)];
      if (input.from) conditions.push(gte(multiAgentEvents.detectedAt, input.from));
      if (input.to) conditions.push(lte(multiAgentEvents.detectedAt, input.to));

      const [byType, bySeverity, topAgents] = await Promise.all([
        db
          .select({
            eventType: multiAgentEvents.eventType,
            count: count(),
          })
          .from(multiAgentEvents)
          .where(and(...conditions))
          .groupBy(multiAgentEvents.eventType),
        db
          .select({
            severity: multiAgentEvents.severity,
            count: count(),
          })
          .from(multiAgentEvents)
          .where(and(...conditions))
          .groupBy(multiAgentEvents.severity),
        db
          .select({
            agentId: multiAgentEvents.agentId,
            count: count(),
          })
          .from(multiAgentEvents)
          .where(and(...conditions))
          .groupBy(multiAgentEvents.agentId)
          .orderBy(desc(count()))
          .limit(10),
      ]);

      return { byType, bySeverity, topAgents };
    }),

  /** Get agent network topology for a session */
  getAgentNetwork: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        sessionId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const org = await requireOrg(ctx.user.id);
      await requireProject(input.projectId, org.id);
      const db = (await getDb())!;

      const conditions = [eq(agentNetworkSnapshots.projectId, input.projectId)];
      if (input.sessionId) conditions.push(eq(agentNetworkSnapshots.sessionId, input.sessionId));

      const snapshots = await db
        .select()
        .from(agentNetworkSnapshots)
        .where(and(...conditions))
        .orderBy(desc(agentNetworkSnapshots.snapshotAt))
        .limit(1);

      if (snapshots.length === 0) {
        return { snapshot: null };
      }

      return { snapshot: snapshots[0] };
    }),

  /** Resolve a multi-agent event */
  resolveMultiAgentEvent: protectedProcedure
    .input(
      z.object({
        eventId: z.number(),
        status: z.enum(["acknowledged", "resolved", "false_positive"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      await db
        .update(multiAgentEvents)
        .set({
          status: input.status,
          resolvedBy: ctx.user.id,
          resolvedAt: Date.now(),
        })
        .where(eq(multiAgentEvents.id, input.eventId));
      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════
  // CROSS-DETECTOR: Governance Overview
  // ═══════════════════════════════════════════════════════════════

  /** Get a unified governance health overview across all detectors */
  getGovernanceOverview: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        from: z.number().optional(),
        to: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const org = await requireOrg(ctx.user.id);
      await requireProject(input.projectId, org.id);
      const db = (await getDb())!;

      const timeConditions = (table: any) => {
        const conds = [eq(table.projectId, input.projectId)];
        if (input.from) conds.push(gte(table.detectedAt, input.from));
        if (input.to) conds.push(lte(table.detectedAt, input.to));
        return conds;
      };

      const [
        financialCount,
        resourceCount,
        loopCount,
        multiAgentCount,
        openFinancial,
        openResource,
        openLoop,
        openMultiAgent,
      ] = await Promise.all([
        db.select({ total: count() }).from(financialAlerts).where(and(...timeConditions(financialAlerts))),
        db.select({ total: count() }).from(resourceAccessViolations).where(and(...timeConditions(resourceAccessViolations))),
        db.select({ total: count() }).from(loopDetections).where(and(...timeConditions(loopDetections))),
        db.select({ total: count() }).from(multiAgentEvents).where(and(...timeConditions(multiAgentEvents))),
        db.select({ total: count() }).from(financialAlerts).where(and(...timeConditions(financialAlerts), eq(financialAlerts.status, "open"))),
        db.select({ total: count() }).from(resourceAccessViolations).where(and(...timeConditions(resourceAccessViolations), eq(resourceAccessViolations.status, "open"))),
        db.select({ total: count() }).from(loopDetections).where(and(...timeConditions(loopDetections), eq(loopDetections.status, "open"))),
        db.select({ total: count() }).from(multiAgentEvents).where(and(...timeConditions(multiAgentEvents), eq(multiAgentEvents.status, "open"))),
      ]);

      return {
        financial: {
          total: financialCount[0]?.total ?? 0,
          open: openFinancial[0]?.total ?? 0,
        },
        resourceAccess: {
          total: resourceCount[0]?.total ?? 0,
          open: openResource[0]?.total ?? 0,
        },
        loops: {
          total: loopCount[0]?.total ?? 0,
          open: openLoop[0]?.total ?? 0,
        },
        multiAgent: {
          total: multiAgentCount[0]?.total ?? 0,
          open: openMultiAgent[0]?.total ?? 0,
        },
      };
    }),
});
