/**
 * Unified Trace Router — tRPC procedures for the unified trace model.
 *
 * Provides data to:
 *   - Unified Timeline (correlated LLM + tool + session events)
 *   - Trace Tree (hierarchical view of agent execution)
 *   - Tool Performance Dashboard (metrics, latency, success rates)
 *   - Agent Decision Explainability (why did the agent do X?)
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getOrganizationByOwnerId, getProjectById } from "./db";
import {
  getUnifiedTimeline,
  getTraceTree,
  getToolPerformance,
  getToolCallTimeline,
  getAgentDecisions,
} from "./db";

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

export const unifiedTraceRouter = router({
  // ─── Unified Timeline ───

  /** Get a unified timeline merging LLM traces and session events */
  getTimeline: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        sessionId: z.string().optional(),
        from: z.number().optional(),
        to: z.number().optional(),
        eventTypes: z.array(z.string()).optional(),
        limit: z.number().min(1).max(500).default(100),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const org = await requireOrg(ctx.user.id);
      await requireProject(input.projectId, org.id);

      return getUnifiedTimeline(input.projectId, {
        sessionId: input.sessionId,
        from: input.from,
        to: input.to,
        eventTypes: input.eventTypes,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  // ─── Trace Tree ───

  /** Get a hierarchical trace tree for a session */
  getTraceTree: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        sessionId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const org = await requireOrg(ctx.user.id);
      await requireProject(input.projectId, org.id);

      const tree = await getTraceTree(input.projectId, input.sessionId);
      if (!tree) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });
      }
      return tree;
    }),

  // ─── Tool Performance ───

  /** Get aggregated tool performance metrics */
  getToolPerformance: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        from: z.number().optional(),
        to: z.number().optional(),
        sessionId: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const org = await requireOrg(ctx.user.id);
      await requireProject(input.projectId, org.id);

      return getToolPerformance(input.projectId, {
        from: input.from,
        to: input.to,
        sessionId: input.sessionId,
        limit: input.limit,
      });
    }),

  /** Get raw tool call timeline for latency distribution charts */
  getToolCallTimeline: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        toolName: z.string().optional(),
        from: z.number().optional(),
        to: z.number().optional(),
        limit: z.number().min(1).max(1000).default(200),
      })
    )
    .query(async ({ ctx, input }) => {
      const org = await requireOrg(ctx.user.id);
      await requireProject(input.projectId, org.id);

      return getToolCallTimeline(input.projectId, {
        toolName: input.toolName,
        from: input.from,
        to: input.to,
        limit: input.limit,
      });
    }),

  // ─── Agent Decision Explainability ───

  /** Get agent decisions with context (preceding/following events) */
  getDecisions: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        sessionId: z.string(),
        contextWindow: z.number().min(1).max(20).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      const org = await requireOrg(ctx.user.id);
      await requireProject(input.projectId, org.id);

      return getAgentDecisions(input.projectId, input.sessionId, {
        contextWindow: input.contextWindow,
      });
    }),
});
