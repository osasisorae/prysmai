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
  getProjectMetrics, getRequestTimeline, getDistinctModels, getLatencyDistribution,
  getLatencyPercentiles, getUsageForOrg,
  getAlertConfigs, createAlertConfig, updateAlertConfig, deleteAlertConfig,
  getOrgMembers, inviteOrgMember, removeOrgMember,
  acceptOrgInvite, getOrgInviteByToken,
  getCustomPricing, upsertCustomPricing, deleteCustomPricing,
  getExplainabilityConfig, updateExplainabilityConfig,
  getExplainabilityReport, upsertExplainabilityReport,
  getTracesWithConfidence,
  getTraceByDbId,
} from "./db";
import { z } from "zod";
import { notifyOwner } from "./_core/notification";
import { sendWaitlistConfirmation } from "./email";
import { sendInviteEmail } from "./inviteEmail";
import { sendTeamInviteEmail } from "./teamInviteEmail";
import {
  getSecurityConfigForProject, upsertSecurityConfig,
  getSecurityEvents, getSecurityStats, getSecurityTimeline, getTopInjectionPatterns,
} from "./security/db-helpers";
import { generateRecommendations } from "./recommendations/engine";
import {
  recommendations as recommendationsTable,
  playbooks as playbooksTable,
  playbookSteps as playbookStepsTable,
  recommendationSnapshots,
} from "../drizzle/schema";
import { getDb } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { generateInviteToken, approveWaitlistEntry, rejectWaitlistEntry } from "./customAuth";
import { TRPCError } from "@trpc/server";
import { computeConfidenceAnalysis, estimateAnthropicConfidence, type ConfidenceAnalysis } from "./confidence-analysis";
import { createCheckoutSession, createBillingPortalSession, getSubscription, cancelSubscription, stripe, PLANS } from "./stripe";
import { organizations as orgsTable } from "../drizzle/schema";
import { createRateLimiter, getClientIp } from "./rate-limiter";

// Demo scanner rate limit: 3 scans per hour per IP
const DEMO_SCAN_LIMIT = 3;
const demoScanLimiter = createRateLimiter("demo-scan", {
  maxRequests: DEMO_SCAN_LIMIT,
  windowMs: 60 * 60 * 1000, // 1 hour
});

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

  // Public demo scan — lets prospects test security scanning on the landing page
  demo: router({
    scanPrompt: publicProcedure
      .input(z.object({ prompt: z.string().min(1).max(2000) }))
      .mutation(async ({ ctx, input }) => {
        // Rate limit: 3 scans per hour per IP
        const ip = getClientIp(ctx.req);
        const { allowed, remaining, retryAfterMs } = demoScanLimiter.check(ip);
        if (!allowed) {
          const retryMinutes = Math.ceil(retryAfterMs / 60000);
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Rate limit exceeded. You can scan ${DEMO_SCAN_LIMIT} prompts per hour. Try again in ${retryMinutes} minute${retryMinutes !== 1 ? "s" : ""}.`,
          });
        }

        const { assessThreat, DEFAULT_SECURITY_CONFIG } = await import("./security/threat-scorer");
        const { deepScanPrompt, createSkippedResult, mergeScanResults } = await import("./security/llm-scanner");

        const startTime = Date.now();

        // Rule-based scan (always runs)
        const ruleResult = assessThreat(input.prompt);

        // LLM deep scan (show the value of paid tier)
        let llmResult;
        try {
          llmResult = await deepScanPrompt(input.prompt);
        } catch {
          llmResult = createSkippedResult();
          llmResult.error = "LLM scan unavailable in demo";
        }

        const merged = mergeScanResults(ruleResult.threatScore, llmResult);

        return {
          // Rule-based results
          ruleBasedScan: {
            threatScore: ruleResult.threatScore,
            threatLevel: ruleResult.threatLevel,
            action: ruleResult.action,
            summary: ruleResult.summary,
            injectionScore: ruleResult.injectionScore,
            piiScore: ruleResult.piiScore,
            policyScore: ruleResult.policyScore,
            injectionMatches: ruleResult.injectionResult?.matches?.map(m => ({
              patternName: m.patternName,
              category: m.category,
              severity: m.severity,
            })) ?? [],
            piiTypes: ruleResult.piiResult?.types ?? [],
            policyViolations: ruleResult.policyMatches.map(m => m.ruleName),
            processingTimeMs: ruleResult.processingTimeMs,
          },
          // LLM deep scan results
          llmDeepScan: {
            scanned: llmResult.scanned,
            classification: llmResult.classification,
            confidence: llmResult.confidence,
            threatScore: llmResult.threatScore,
            attackCategories: llmResult.attackCategories,
            explanation: llmResult.explanation,
            isJailbreak: llmResult.isJailbreak,
            isObfuscatedInjection: llmResult.isObfuscatedInjection,
            isDataExfiltration: llmResult.isDataExfiltration,
            processingTimeMs: llmResult.processingTimeMs,
            error: llmResult.error,
          },
          // Merged final verdict
          merged: {
            finalScore: merged.finalScore,
            llmEnhanced: merged.llmEnhanced,
            explanation: merged.combinedExplanation,
          },
          totalProcessingTimeMs: Date.now() - startTime,
          rateLimit: {
            remaining,
            limit: DEMO_SCAN_LIMIT,
          },
        };
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

        // Determine base URL — prefer SITE_URL env var, fallback to request headers
        const siteUrl = process.env.SITE_URL;
        let baseUrl: string;
        if (siteUrl) {
          baseUrl = siteUrl.replace(/\/$/, ""); // strip trailing slash
        } else {
          const protocol = ctx.req.headers["x-forwarded-proto"] || ctx.req.protocol || "https";
          const host = ctx.req.headers["x-forwarded-host"] || ctx.req.headers.host || "prysmai.com";
          baseUrl = `${protocol}://${host}`;
        }

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
        // Also migrate to providerKeys format
        const project = await getProjectById(input.projectId);
        const existingKeys = (project?.providerKeys as Record<string, { apiKey: string; baseUrl?: string }>) ?? {};
        const provider = input.providerConfig.provider.toLowerCase();
        if (input.providerConfig.apiKeyEncrypted) {
          existingKeys[provider] = {
            apiKey: input.providerConfig.apiKeyEncrypted,
            baseUrl: input.providerConfig.baseUrl !== `https://api.openai.com/v1` ? input.providerConfig.baseUrl : undefined,
          };
        }
        await updateProject(input.projectId, {
          providerConfig: input.providerConfig,
          providerKeys: existingKeys,
          defaultProvider: provider,
        });
        return { success: true };
      }),

    // ─── Multi-Provider Key Management ───

    addProviderKey: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        provider: z.string().min(1),
        apiKey: z.string().min(1),
        baseUrl: z.string().url().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        const project = await getProjectById(input.projectId);
        const existingKeys = (project?.providerKeys as Record<string, { apiKey: string; baseUrl?: string }>) ?? {};
        const provider = input.provider.toLowerCase();
        existingKeys[provider] = {
          apiKey: input.apiKey,
          ...(input.baseUrl ? { baseUrl: input.baseUrl } : {}),
        };
        // If this is the first provider key, also set as default
        const isFirst = Object.keys(existingKeys).length === 1;
        await updateProject(input.projectId, {
          providerKeys: existingKeys,
          ...(isFirst ? { defaultProvider: provider } : {}),
        });
        return { success: true, connectedProviders: Object.keys(existingKeys) };
      }),

    removeProviderKey: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        provider: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        const project = await getProjectById(input.projectId);
        const existingKeys = (project?.providerKeys as Record<string, { apiKey: string; baseUrl?: string }>) ?? {};
        const provider = input.provider.toLowerCase();
        delete existingKeys[provider];
        // If we removed the default provider, pick a new one
        const currentDefault = (project as any)?.defaultProvider;
        let newDefault = currentDefault;
        if (currentDefault === provider) {
          const remaining = Object.keys(existingKeys);
          newDefault = remaining.length > 0 ? remaining[0] : null;
        }
        await updateProject(input.projectId, {
          providerKeys: existingKeys,
          defaultProvider: newDefault,
        });
        return { success: true, connectedProviders: Object.keys(existingKeys) };
      }),

    getProviderKeys: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        const project = await getProjectById(input.projectId);
        const providerKeys = (project?.providerKeys as Record<string, { apiKey: string; baseUrl?: string }>) ?? {};
        // Mask API keys for display (show first 8 chars + ...)
        const masked: Record<string, { keyPrefix: string; baseUrl?: string }> = {};
        for (const [provider, config] of Object.entries(providerKeys)) {
          masked[provider] = {
            keyPrefix: config.apiKey.length > 12 ? config.apiKey.slice(0, 12) + "..." : config.apiKey,
            baseUrl: config.baseUrl,
          };
        }
        return {
          providers: masked,
          defaultProvider: (project as any)?.defaultProvider ?? null,
          // Also include legacy config for backward compat display
          legacyConfig: project?.providerConfig ?? null,
        };
      }),

    setDefaultProvider: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        provider: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        await updateProject(input.projectId, { defaultProvider: input.provider.toLowerCase() });
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

    latencyDistribution: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        from: z.date(),
        to: z.date(),
      }))
      .query(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        return await getLatencyDistribution(input.projectId, input.from, input.to);
      }),

    percentiles: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        from: z.date(),
        to: z.date(),
      }))
      .query(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        return await getLatencyPercentiles(input.projectId, input.from, input.to);
      }),
  }),

  // ─── Alerts ───
  alert: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        return await getAlertConfigs(input.projectId);
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        name: z.string().min(1).max(255),
        metric: z.string(),
        condition: z.string(),
        threshold: z.string(),
        channels: z.any(),
      }))
      .mutation(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        return await createAlertConfig({
          projectId: input.projectId,
          name: input.name,
          metric: input.metric,
          condition: input.condition,
          threshold: input.threshold,
          channels: input.channels,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        projectId: z.number(),
        name: z.string().optional(),
        metric: z.string().optional(),
        condition: z.string().optional(),
        threshold: z.string().optional(),
        channels: z.any().optional(),
        enabled: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        const { id, projectId, ...data } = input;
        await updateAlertConfig(id, projectId, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({
        id: z.number(),
        projectId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        await deleteAlertConfig(input.id, input.projectId);
        return { success: true };
      }),
  }),

  // ─── Usage ───
  usage: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const org = await requireOrg(ctx.user.id);
      const usage = await getUsageForOrg(org.id);
      const plan = org.plan ?? "free";
      const limits: Record<string, number> = {
        free: 5000,
        pro: 50000,
        team: 250000,
        enterprise: Infinity,
      };
      const limit = limits[plan] ?? limits.free;
      const totalRequests = usage?.totalRequests ?? 0;
      const percentUsed = limit === Infinity ? 0 : Math.round((totalRequests / limit) * 100);
      return {
        ...usage,
        plan,
        limit,
        totalRequests,
        percentUsed,
        remaining: limit === Infinity ? Infinity : Math.max(0, limit - totalRequests),
      };
    }),
  }),

  // ─── Custom Pricing ───
  pricing: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        return await getCustomPricing(input.projectId);
      }),

    upsert: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        provider: z.string().min(1).max(64),
        model: z.string().min(1).max(128),
        inputCostPer1k: z.string(),
        outputCostPer1k: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        return await upsertCustomPricing(input);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number(), projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        await deleteCustomPricing(input.id);
        return { success: true };
      }),
  }),

  // ─── Team (Org Members) ───
  team: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const org = await requireOrg(ctx.user.id);
      return await getOrgMembers(org.id);
    }),

    invite: protectedProcedure
      .input(z.object({
        email: z.string().email(),
        role: z.enum(["admin", "member"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        const result = await inviteOrgMember({
          orgId: org.id,
          email: input.email,
          role: input.role,
          invitedBy: ctx.user.id,
        });

        // Send invite email if successful
        if (result.success && result.inviteToken) {
          const siteUrl = process.env.SITE_URL;
          let baseUrl: string;
          if (siteUrl) {
            baseUrl = siteUrl.replace(/\/$/, "");
          } else {
            baseUrl = "https://prysmai.manus.space";
          }
          sendTeamInviteEmail(input.email, result.inviteToken, baseUrl, org.name).catch((err: any) =>
            console.error("[Email] Team invite send failed:", err)
          );
        }

        return result;
      }),

    // Validate invite token (public, for accept-invite page)
    validateInvite: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const invite = await getOrgInviteByToken(input.token);
        if (!invite || invite.status !== "pending") {
          return { valid: false, invite: null };
        }
        return { valid: true, invite };
      }),

    // Accept invite (requires authenticated user)
    acceptInvite: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return await acceptOrgInvite(input.token, ctx.user.id);
      }),

    remove: protectedProcedure
      .input(z.object({ memberId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await removeOrgMember(input.memberId, org.id);
        return { success: true };
      }),
   }),

  // ═══════════════════════════════════════════════════════════════
  // SECURITY
  // ═══════════════════════════════════════════════════════════════
  security: router({
    // Get security config for a project
    getConfig: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        const config = await getSecurityConfigForProject(input.projectId);
        return config ?? {
          injectionDetection: true,
          piiDetection: true,
          piiRedactionMode: "none" as const,
          contentPolicyEnabled: true,
          blockHighThreats: false,
          customKeywords: [],
          customPolicies: [],
          outputScanning: false,
          outputPiiDetection: true,
          outputToxicityDetection: true,
          outputBlockThreats: false,
        };
      }),

    // Update security config
    updateConfig: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        injectionDetection: z.boolean().optional(),
        piiDetection: z.boolean().optional(),
        piiRedactionMode: z.enum(["none", "mask", "hash", "block"]).optional(),
        contentPolicyEnabled: z.boolean().optional(),
        blockHighThreats: z.boolean().optional(),
        customKeywords: z.array(z.string()).optional(),
        customPolicies: z.array(z.object({
          name: z.string(),
          type: z.enum(["keyword", "regex", "topic"]),
          pattern: z.string(),
          severity: z.number().min(1).max(100),
          action: z.enum(["flag", "block"]),
          description: z.string().optional(),
        })).optional(),
        outputScanning: z.boolean().optional(),
        outputPiiDetection: z.boolean().optional(),
        outputToxicityDetection: z.boolean().optional(),
        outputBlockThreats: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        const { projectId, ...config } = input;
        return await upsertSecurityConfig(projectId, config);
      }),

    // Get security events (threat log)
    getEvents: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
        threatLevel: z.enum(["clean", "low", "medium", "high"]).optional(),
        since: z.date().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        return await getSecurityEvents(input.projectId, input);
      }),

    // Get security stats (summary counts)
    getStats: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        since: z.date().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        return await getSecurityStats(input.projectId, input.since);
      }),

    // Get security timeline (daily counts by threat level)
    getTimeline: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        days: z.number().min(1).max(90).default(7),
      }))
      .query(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        return await getSecurityTimeline(input.projectId, input.days);
      }),

    // Get top injection patterns
    getTopPatterns: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        limit: z.number().min(1).max(50).default(10),
      }))
      .query(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        return await getTopInjectionPatterns(input.projectId, input.limit);
      }),
  }),

  // ═══════════════════════════════════════════════════════════════
  // EXPLAINABILITY (Layer 3a)
  // ═══════════════════════════════════════════════════════════════

  explainability: router({
    // Get confidence analysis for a specific trace
    getConfidenceAnalysis: protectedProcedure
      .input(z.object({ traceId: z.number() }))
      .query(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        const trace = await getTraceByDbId(input.traceId);
        if (!trace) throw new TRPCError({ code: "NOT_FOUND", message: "Trace not found." });
        await requireProject(trace.projectId, org.id);
        return {
          logprobs: trace.logprobs ?? null,
          confidenceAnalysis: trace.confidenceAnalysis ?? null,
          provider: trace.provider,
          model: trace.model,
          completion: trace.completion,
        };
      }),

    // Generate or retrieve "Why did it say that?" explanation
    getExplanation: protectedProcedure
      .input(z.object({
        traceId: z.number(),
        regenerate: z.boolean().optional().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        const trace = await getTraceByDbId(input.traceId);
        if (!trace) throw new TRPCError({ code: "NOT_FOUND", message: "Trace not found." });
        await requireProject(trace.projectId, org.id);

        // Check for cached explanation
        if (!input.regenerate) {
          const existing = await getExplainabilityReport(trace.id);
          if (existing) {
            return {
              explanation: existing.explanation,
              highlights: existing.highlights ?? [],
              cached: true,
              reportType: existing.reportType,
            };
          }
        }

        // Build the analysis context
        const analysis = trace.confidenceAnalysis as ConfidenceAnalysis | null;
        const logprobs = trace.logprobs as { content?: Array<{ token: string; logprob: number; top_logprobs?: Array<{ token: string; logprob: number }> }> } | null;

        // Build explanation prompt
        const promptMessages = trace.promptMessages as Array<{ role: string; content: string }> | null;
        const promptText = promptMessages?.map(m => `[${m.role}]: ${m.content}`).join("\n") ?? "(no prompt available)";
        const completionText = trace.completion ?? "(no completion)";

        // Format decision points for the prompt
        const decisionPointsText = analysis?.decision_points?.map((dp: any) =>
          `Token ${dp.token_idx}: chose "${dp.chosen}" (${(dp.chosen_confidence * 100).toFixed(1)}%) over "${dp.alternative}" (${(dp.alternative_confidence * 100).toFixed(1)}%), margin: ${(dp.margin * 100).toFixed(1)}%`
        ).join("\n") ?? "None detected";

        const hallucinationText = analysis?.hallucination_candidates?.map((hc: any) =>
          `"${hc.text}" (tokens ${hc.start_token_idx}-${hc.end_token_idx}, avg confidence: ${(hc.avg_confidence * 100).toFixed(1)}%)`
        ).join("\n") ?? "None detected";

        const systemPrompt = `You are an AI model behavior analyst. Given the following data about an LLM completion, explain WHY the model produced this specific output. Focus on:

1. Where the model was most confident and why (based on prompt context)
2. Where the model was uncertain and what alternatives it considered
3. Any segments that may be hallucinated (low confidence, high entropy)
4. Key decision points where the model almost chose a different token

Be specific. Reference exact tokens and their confidence scores.
Write for a technical audience who understands LLMs but wants actionable insight.
Keep the explanation concise (200-400 words).`;

        const userPrompt = `ORIGINAL PROMPT:\n${promptText}\n\nCOMPLETION:\n${completionText}\n\nCONFIDENCE ANALYSIS:\n- Overall confidence: ${analysis?.overall_confidence ?? "N/A"}\n- Hallucination risk: ${analysis?.hallucination_risk_score ?? "N/A"}\n- Provider: ${trace.provider}\n- Logprobs source: ${analysis?.logprobs_source ?? "N/A"}\n\nLOW CONFIDENCE SEGMENTS:\n${hallucinationText}\n\nDECISION POINTS:\n${decisionPointsText}`;

        // Use the built-in Forge API for explanation generation
        try {
          const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
          const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;

          if (!forgeUrl || !forgeKey) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "LLM API not configured for explanations." });
          }

          const llmResponse = await fetch(`${forgeUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${forgeKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4.1-mini",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              temperature: 0.3,
              max_tokens: 1000,
            }),
          });

          const llmData = await llmResponse.json() as any;
          const explanation = llmData.choices?.[0]?.message?.content ?? "Unable to generate explanation.";
          const tokensUsed = llmData.usage?.total_tokens ?? 0;

          // Build highlights from decision points and hallucination candidates
          const highlights: Array<{ tokenIdx: number; annotation: string; color: string }> = [];
          if (analysis?.decision_points) {
            for (const dp of analysis.decision_points as any[]) {
              highlights.push({
                tokenIdx: dp.token_idx,
                annotation: `Almost chose "${dp.alternative}" (${(dp.alternative_confidence * 100).toFixed(1)}%)`,
                color: "#f59e0b", // amber for decision points
              });
            }
          }
          if (analysis?.hallucination_candidates) {
            for (const hc of analysis.hallucination_candidates as any[]) {
              for (let i = hc.start_token_idx; i <= hc.end_token_idx; i++) {
                highlights.push({
                  tokenIdx: i,
                  annotation: `Low confidence segment (avg: ${(hc.avg_confidence * 100).toFixed(1)}%)`,
                  color: "#ef4444", // red for hallucination risk
                });
              }
            }
          }

          // Cache the report
          const reportType = analysis?.logprobs_source === "estimated" ? "estimated" as const : "logprobs" as const;
          await upsertExplainabilityReport({
            traceId: trace.id,
            projectId: trace.projectId,
            reportType,
            explanation,
            highlights,
            modelUsed: "gpt-4.1-mini",
            tokensUsed,
            cost: "0.000000", // Internal API, no cost
          });

          return {
            explanation,
            highlights,
            cached: false,
            reportType,
          };
        } catch (err: any) {
          if (err instanceof TRPCError) throw err;
          console.error("[Explainability] Explanation generation failed:", err);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate explanation." });
        }
      }),

    // Compare models: get confidence analysis for multiple traces
    compareModels: protectedProcedure
      .input(z.object({ traceIds: z.array(z.number()).min(2).max(4) }))
      .query(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        const comparisons = [];
        for (const tid of input.traceIds) {
          const trace = await getTraceByDbId(tid);
          if (!trace) continue;
          await requireProject(trace.projectId, org.id);
          comparisons.push({
            traceId: trace.id,
            model: trace.model,
            provider: trace.provider,
            completion: trace.completion,
            confidenceAnalysis: trace.confidenceAnalysis,
            logprobs: trace.logprobs,
          });
        }
        return { comparisons };
      }),

    // Get explainability settings for a project
    getSettings: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        return await getExplainabilityConfig(input.projectId);
      }),

    // Update explainability settings
    updateSettings: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        enabled: z.boolean().optional(),
        logprobsInjection: z.enum(["always", "never", "sample"]).optional(),
        sampleRate: z.number().min(0).max(1).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        await updateExplainabilityConfig(input.projectId, {
          enabled: input.enabled,
          logprobsInjection: input.logprobsInjection,
          sampleRate: input.sampleRate,
        });
        return { success: true };
      }),

    // Get confidence trends over time (daily buckets)
    getConfidenceTrends: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        from: z.date().optional(),
        to: z.date().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        const allTraces = await getTracesWithConfidence(input.projectId, {
          limit: 200,
          from: input.from,
          to: input.to,
        });

        // Group by day
        const buckets = new Map<string, { total: number; confidence: number; risk: number; hallucinations: number }>();
        for (const t of allTraces) {
          const analysis = t.confidenceAnalysis as ConfidenceAnalysis | null;
          if (!analysis) continue;
          const day = t.timestamp.toISOString().slice(0, 10);
          const bucket = buckets.get(day) ?? { total: 0, confidence: 0, risk: 0, hallucinations: 0 };
          bucket.total++;
          bucket.confidence += analysis.overall_confidence;
          bucket.risk += analysis.hallucination_risk_score;
          bucket.hallucinations += (analysis.hallucination_candidates?.length ?? 0);
          buckets.set(day, bucket);
        }

        const trends = Array.from(buckets.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, b]) => ({
            date,
            avgConfidence: Math.round((b.confidence / b.total) * 10000) / 10000,
            avgRisk: Math.round((b.risk / b.total) * 10000) / 10000,
            traceCount: b.total,
            hallucinationCount: b.hallucinations,
          }));

        return { trends };
      }),

    // Get model-level breakdown of confidence metrics
    getModelBreakdown: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        from: z.date().optional(),
        to: z.date().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        const allTraces = await getTracesWithConfidence(input.projectId, {
          limit: 200,
          from: input.from,
          to: input.to,
        });

        // Group by model
        const models = new Map<string, {
          provider: string;
          total: number;
          confidence: number;
          risk: number;
          hallucinations: number;
          highRisk: number;
          decisionPoints: number;
        }>();

        for (const t of allTraces) {
          const analysis = t.confidenceAnalysis as ConfidenceAnalysis | null;
          if (!analysis) continue;
          const key = t.model;
          const m = models.get(key) ?? { provider: t.provider, total: 0, confidence: 0, risk: 0, hallucinations: 0, highRisk: 0, decisionPoints: 0 };
          m.total++;
          m.confidence += analysis.overall_confidence;
          m.risk += analysis.hallucination_risk_score;
          m.hallucinations += (analysis.hallucination_candidates?.length ?? 0);
          m.decisionPoints += (analysis.decision_points?.length ?? 0);
          if (analysis.hallucination_risk_score > 0.3) m.highRisk++;
          models.set(key, m);
        }

        const breakdown = Array.from(models.entries())
          .sort(([, a], [, b]) => b.total - a.total)
          .map(([model, m]) => ({
            model,
            provider: m.provider,
            traceCount: m.total,
            avgConfidence: Math.round((m.confidence / m.total) * 10000) / 10000,
            avgRisk: Math.round((m.risk / m.total) * 10000) / 10000,
            hallucinationCount: m.hallucinations,
            highRiskCount: m.highRisk,
            avgDecisionPoints: Math.round(m.decisionPoints / m.total * 10) / 10,
          }));

        return { breakdown };
      }),

    // Get aggregated decision points across traces
    getDecisionPointsAggregate: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        from: z.date().optional(),
        to: z.date().optional(),
        limit: z.number().min(1).max(100).default(50),
      }))
      .query(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        const allTraces = await getTracesWithConfidence(input.projectId, {
          limit: 200,
          from: input.from,
          to: input.to,
        });

        const decisionPoints: Array<{
          traceId: string;
          dbId: number;
          model: string;
          provider: string;
          chosen: string;
          chosenConfidence: number;
          alternative: string;
          alternativeConfidence: number;
          margin: number;
          timestamp: Date;
        }> = [];

        for (const t of allTraces) {
          const analysis = t.confidenceAnalysis as ConfidenceAnalysis | null;
          if (!analysis?.decision_points?.length) continue;
          for (const dp of analysis.decision_points) {
            decisionPoints.push({
              traceId: t.traceId,
              dbId: t.id,
              model: t.model,
              provider: t.provider,
              chosen: dp.chosen,
              chosenConfidence: dp.chosen_confidence,
              alternative: dp.alternative,
              alternativeConfidence: dp.alternative_confidence,
              margin: dp.margin,
              timestamp: t.timestamp,
            });
          }
        }

        // Sort by smallest margin (closest decisions first)
        decisionPoints.sort((a, b) => a.margin - b.margin);

        return {
          decisionPoints: decisionPoints.slice(0, input.limit),
          totalCount: decisionPoints.length,
        };
      }),

    // Get hallucination report across a project
    getHallucinationReport: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        limit: z.number().min(1).max(200).default(50),
        minRisk: z.number().min(0).max(1).default(0),
        from: z.date().optional(),
        to: z.date().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        await requireProject(input.projectId, org.id);
        const traces = await getTracesWithConfidence(input.projectId, {
          limit: input.limit,
          minRisk: input.minRisk,
          from: input.from,
          to: input.to,
        });

        // Build summary
        let totalTraces = traces.length;
        let highRiskCount = 0;
        let totalConfidence = 0;
        const candidates: Array<{
          traceId: string;
          model: string;
          provider: string;
          text: string;
          avgConfidence: number;
          timestamp: Date;
        }> = [];

        for (const t of traces) {
          const analysis = t.confidenceAnalysis as ConfidenceAnalysis | null;
          if (!analysis) continue;
          totalConfidence += analysis.overall_confidence;
          if (analysis.hallucination_risk_score > 0.3) highRiskCount++;
          if (analysis.hallucination_candidates?.length) {
            for (const hc of analysis.hallucination_candidates) {
              candidates.push({
                traceId: t.traceId,
                model: t.model,
                provider: t.provider,
                text: hc.text,
                avgConfidence: hc.avg_confidence,
                timestamp: t.timestamp,
              });
            }
          }
        }

        return {
          candidates: candidates.sort((a, b) => a.avgConfidence - b.avgConfidence),
          summary: {
            totalTraces,
            highRiskTraces: highRiskCount,
            avgConfidence: totalTraces > 0 ? Math.round((totalConfidence / totalTraces) * 10000) / 10000 : 0,
            totalHallucinationCandidates: candidates.length,
          },
        };
      }),
  }),

  // ─── Recommendations & Playbooks Router ───
  recommendations: router({
    // Generate or refresh recommendations for a project
    generate: protectedProcedure
      .input(z.object({ projectId: z.number(), force: z.boolean().optional() }))
      .mutation(async ({ input }) => {
        const result = await generateRecommendations(input.projectId, input.force ?? false);
        return {
          issueCount: result.detectorResults.length,
          fromCache: result.fromCache,
          baseline: result.baseline,
        };
      }),

    // Get active recommendations for a project
    getActive: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const db = (await getDb())!;
        const recs = await db
          .select()
          .from(recommendationsTable)
          .where(
            and(
              eq(recommendationsTable.projectId, input.projectId),
              eq(recommendationsTable.status, "active")
            )
          )
          .orderBy(desc(recommendationsTable.generatedAt));
        return recs;
      }),

    // Dismiss a recommendation
    dismiss: protectedProcedure
      .input(z.object({ recommendationId: z.number() }))
      .mutation(async ({ input }) => {
        const db = (await getDb())!;
        await db
          .update(recommendationsTable)
          .set({ status: "dismissed", dismissedAt: new Date() })
          .where(eq(recommendationsTable.id, input.recommendationId));
        return { success: true };
      }),

    // Get all playbooks for a project
    getPlaybooks: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const db = (await getDb())!;
        const pbs = await db
          .select()
          .from(playbooksTable)
          .where(eq(playbooksTable.projectId, input.projectId))
          .orderBy(desc(playbooksTable.createdAt));
        return pbs;
      }),

    // Get a single playbook with its steps
    getPlaybookDetail: protectedProcedure
      .input(z.object({ playbookId: z.number() }))
      .query(async ({ input }) => {
        const db = (await getDb())!;
        const [pb] = await db
          .select()
          .from(playbooksTable)
          .where(eq(playbooksTable.id, input.playbookId))
          .limit(1);
        if (!pb) return null;

        const steps = await db
          .select()
          .from(playbookStepsTable)
          .where(eq(playbookStepsTable.playbookId, input.playbookId))
          .orderBy(playbookStepsTable.stepOrder);

        return { ...pb, steps };
      }),

    // Toggle a playbook step completion
    toggleStep: protectedProcedure
      .input(z.object({ stepId: z.number(), completed: z.boolean() }))
      .mutation(async ({ input }) => {
        const db = (await getDb())!;
        await db
          .update(playbookStepsTable)
          .set({
            completed: input.completed,
            completedAt: input.completed ? new Date() : null,
          })
          .where(eq(playbookStepsTable.id, input.stepId));

        // Check if all steps are complete and update playbook status
        const [step] = await db
          .select({ playbookId: playbookStepsTable.playbookId })
          .from(playbookStepsTable)
          .where(eq(playbookStepsTable.id, input.stepId))
          .limit(1);

        if (step) {
          const allSteps = await db
            .select({ completed: playbookStepsTable.completed })
            .from(playbookStepsTable)
            .where(eq(playbookStepsTable.playbookId, step.playbookId));

          const allComplete = allSteps.every((s) => s.completed);
          const anyComplete = allSteps.some((s) => s.completed);

          await db
            .update(playbooksTable)
            .set({
              status: allComplete ? "resolved" : anyComplete ? "in_progress" : "not_started",
            })
            .where(eq(playbooksTable.id, step.playbookId));
        }

        return { success: true };
      }),

    // Get metric snapshots for progress tracking
    getSnapshots: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const db = (await getDb())!;
        const snapshots = await db
          .select()
          .from(recommendationSnapshots)
          .where(eq(recommendationSnapshots.projectId, input.projectId))
          .orderBy(desc(recommendationSnapshots.snapshotAt))
          .limit(20);
        return snapshots;
      }),
  }),

  // ─── Stripe Billing ───
  billing: router({
    // Get current plan info for the user's org
    getPlan: protectedProcedure.query(async ({ ctx }) => {
      const org = await requireOrg(ctx.user.id);
      const plan = org.plan || "free";
      const planConfig = PLANS[plan];
      let subscription = null;

      if (org.stripeSubscriptionId) {
        try {
          const sub = await getSubscription(org.stripeSubscriptionId);
          subscription = {
            id: sub.id,
            status: sub.status,
            currentPeriodEnd: sub.items.data[0]?.current_period_end
              ? new Date((sub.items.data[0].current_period_end as number) * 1000)
              : null,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          };
        } catch (err) {
          console.error("[Billing] Failed to fetch subscription:", err);
        }
      }

      return {
        plan,
        planName: planConfig?.name || "Free",
        requestLimit: planConfig?.requestLimit || 5000,
        dataRetentionDays: planConfig?.dataRetentionDays || 7,
        maxProjects: planConfig?.maxProjects || 1,
        maxTeamMembers: planConfig?.maxTeamMembers || 1,
        stripeCustomerId: org.stripeCustomerId,
        subscription,
      };
    }),

    // Create a Stripe Checkout session for upgrading
    createCheckout: protectedProcedure
      .input(z.object({ plan: z.enum(["pro", "team"]) }))
      .mutation(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);
        const origin = ctx.req.headers.origin || "https://prysmai.io";

        const url = await createCheckoutSession({
          planKey: input.plan,
          userId: ctx.user.id,
          userEmail: ctx.user.email || "",
          userName: ctx.user.name || undefined,
          orgId: org.id,
          origin,
        });

        return { url };
      }),

    // Create a Stripe Billing Portal session for managing subscription
    createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
      const org = await requireOrg(ctx.user.id);

      if (!org.stripeCustomerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active subscription found. Please upgrade first.",
        });
      }

      const origin = ctx.req.headers.origin || "https://prysmai.io";
      const url = await createBillingPortalSession({
        stripeCustomerId: org.stripeCustomerId,
        origin,
      });

      return { url };
    }),

    // Cancel subscription at period end
    cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
      const org = await requireOrg(ctx.user.id);

      if (!org.stripeSubscriptionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active subscription to cancel.",
        });
      }

      await cancelSubscription(org.stripeSubscriptionId);
      return { success: true };
    }),

    /**
     * verifyCheckout — Fallback for when the Stripe webhook hasn't fired yet.
     * After checkout completes, the user returns to /dashboard?checkout=success&plan=pro.
     * The frontend calls this procedure to poll Stripe directly and update the org plan
     * if the webhook hasn't processed yet.
     */
    verifyCheckout: protectedProcedure
      .input(z.object({ plan: z.enum(["pro", "team"]) }))
      .mutation(async ({ ctx, input }) => {
        const org = await requireOrg(ctx.user.id);

        // If the org already has the correct plan, no need to verify
        if (org.plan === input.plan && org.stripeSubscriptionId) {
          return { success: true, plan: org.plan, alreadyUpdated: true };
        }

        // Search for recent completed checkout sessions for this org
        try {
          const sessions = await stripe.checkout.sessions.list({
            limit: 5,
          });

          // Find a completed session matching this org
          const matchingSession = sessions.data.find(
            (s) =>
              s.status === "complete" &&
              s.metadata?.org_id === org.id.toString() &&
              s.metadata?.plan === input.plan &&
              s.customer &&
              s.subscription
          );

          if (matchingSession) {
            const db = (await getDb())!;
            await db
              .update(orgsTable)
              .set({
                plan: input.plan,
                stripeCustomerId: matchingSession.customer as string,
                stripeSubscriptionId: matchingSession.subscription as string,
              })
              .where(eq(orgsTable.id, org.id));

            console.log(
              `[Billing] verifyCheckout: Org ${org.id} upgraded to ${input.plan} (fallback)`
            );
            return { success: true, plan: input.plan, alreadyUpdated: false };
          }

          // No matching session found — webhook may still be pending
          return { success: false, plan: org.plan, alreadyUpdated: false };
        } catch (err: any) {
          console.error("[Billing] verifyCheckout error:", err.message);
          // Don't throw — the webhook will eventually process
          return { success: false, plan: org.plan, alreadyUpdated: false };
        }
      }),
  }),
});
export type AppRouter = typeof appRouter;
