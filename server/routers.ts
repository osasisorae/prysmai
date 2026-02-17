import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import {
  addWaitlistSignup, getWaitlistCount, getWaitlistSignups,
  createOrganization, getOrganizationByOwnerId,
  createProject, getProjectsByOrgId, getProjectById, updateProject,
  createApiKey, getApiKeysByProjectId, revokeApiKey,
  getTraces, getTraceById,
  getProjectMetrics, getRequestTimeline, getDistinctModels,
} from "./db";
import { z } from "zod";
import { notifyOwner } from "./_core/notification";
import { sendWaitlistConfirmation } from "./email";
import { sendInviteEmail } from "./inviteEmail";
import { generateInviteToken, approveWaitlistEntry, rejectWaitlistEntry } from "./customAuth";
import { TRPCError } from "@trpc/server";

// Helper: ensure user has an org, get it or throw
async function requireOrg(userId: number) {
  const org = await getOrganizationByOwnerId(userId);
  if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "No organization found. Please complete onboarding." });
  return org;
}

// Helper: ensure user owns the project
async function requireProject(projectId: number, orgId: number) {
  const project = await getProjectById(projectId);
  if (!project || project.orgId !== orgId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
  }
  return project;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  waitlist: router({
    join: publicProcedure
      .input(z.object({
        email: z.string().email(),
        source: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await addWaitlistSignup(input.email, input.source ?? "landing_page");
        if (!result.alreadyExists) {
          const count = await getWaitlistCount();
          sendWaitlistConfirmation(input.email).catch((err) =>
            console.error("[Email] Background send failed:", err)
          );
          await notifyOwner({
            title: `New Waitlist Signup (#${count})`,
            content: `${input.email} just joined the Prysm AI waitlist from ${input.source ?? "landing_page"}. Total signups: ${count}`,
          });
        }
        return result;
      }),
    count: publicProcedure.query(async () => {
      return { count: await getWaitlistCount() };
    }),
    list: adminProcedure.query(async () => {
      return await getWaitlistSignups();
    }),
    approve: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const signups = await getWaitlistSignups();
        const signup = signups.find(s => s.id === input.id);
        if (!signup) throw new TRPCError({ code: "NOT_FOUND", message: "Waitlist entry not found." });
        if (signup.status === "approved") throw new TRPCError({ code: "BAD_REQUEST", message: "Already approved." });

        const token = generateInviteToken();
        await approveWaitlistEntry(input.id, token);

        // Determine base URL from request
        const protocol = ctx.req.headers["x-forwarded-proto"] || ctx.req.protocol || "https";
        const host = ctx.req.headers["x-forwarded-host"] || ctx.req.headers.host || "prysmai.com";
        const baseUrl = `${protocol}://${host}`;

        // Send invite email in background
        sendInviteEmail(signup.email, token, baseUrl).catch((err) =>
          console.error("[Email] Background invite send failed:", err)
        );

        return { success: true, email: signup.email };
      }),
    reject: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await rejectWaitlistEntry(input.id);
        return { success: true };
      }),
  }),

  // ─── Organization ───
  org: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return await getOrganizationByOwnerId(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if user already has an org
        const existing = await getOrganizationByOwnerId(ctx.user.id);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "You already have an organization." });
        return await createOrganization({ name: input.name, slug: input.slug, ownerId: ctx.user.id });
      }),
  }),

  // ─── Projects ───
  project: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const org = await getOrganizationByOwnerId(ctx.user.id);
      if (!org) return [];
      return await getProjectsByOrgId(org.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        return await requireProject(input.id, org.id);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
      }))
      .mutation(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        return await createProject({ orgId: org.id, name: input.name, slug: input.slug });
      }),

    updateConfig: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        providerConfig: z.object({
          provider: z.string(),
          baseUrl: z.string().url(),
          defaultModel: z.string().optional(),
          apiKeyEncrypted: z.string().optional(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        await updateProject(input.projectId, { providerConfig: input.providerConfig });
        return { success: true };
      }),
  }),

  // ─── API Keys ───
  apiKey: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        return await getApiKeysByProjectId(input.projectId);
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        name: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        return await createApiKey(input.projectId, input.name);
      }),

    revoke: protectedProcedure
      .input(z.object({
        keyId: z.number(),
        projectId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        await revokeApiKey(input.keyId, input.projectId);
        return { success: true };
      }),
  }),

  // ─── Traces (Request Explorer) ───
  trace: router({
    list: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional(),
        status: z.string().optional(),
        model: z.string().optional(),
        from: z.date().optional(),
        to: z.date().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        return await getTraces(input.projectId, {
          limit: input.limit,
          offset: input.offset,
          status: input.status,
          model: input.model,
          from: input.from,
          to: input.to,
        });
      }),

    get: protectedProcedure
      .input(z.object({
        traceId: z.string(),
        projectId: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        const trace = await getTraceById(input.traceId, input.projectId);
        if (!trace) throw new TRPCError({ code: "NOT_FOUND", message: "Trace not found." });
        return trace;
      }),

    models: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        return await getDistinctModels(input.projectId);
      }),
  }),

  // ─── Metrics (Dashboard Overview) ───
  metrics: router({
    overview: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        from: z.date(),
        to: z.date(),
      }))
      .query(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        return await getProjectMetrics(input.projectId, input.from, input.to);
      }),

    timeline: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        from: z.date(),
        to: z.date(),
      }))
      .query(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        return await getRequestTimeline(input.projectId, input.from, input.to);
      }),
  }),
});

export type AppRouter = typeof appRouter;
