import { eq, desc, sql, and, isNull, gte, lte, like, or, asc, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users, waitlistSignups,
  organizations, InsertOrganization,
  projects, InsertProject,
  apiKeys, InsertApiKey,
  traces, InsertTrace,
  modelPricing,
  explainabilityReports, InsertExplainabilityReport,
  agentSessions, sessionEvents,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import crypto from "crypto";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── User helpers (existing) ───

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Waitlist helpers (existing) ───

export async function addWaitlistSignup(email: string, source: string = "landing_page") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.insert(waitlistSignups).values({ email, source });
    return { success: true };
  } catch (error: any) {
    if (error?.code === "ER_DUP_ENTRY" || error?.message?.includes("Duplicate")) {
      return { success: true, alreadyExists: true };
    }
    throw error;
  }
}

export async function getWaitlistCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(waitlistSignups);
  return result[0]?.count ?? 0;
}

export async function getWaitlistSignups() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(waitlistSignups).orderBy(desc(waitlistSignups.createdAt));
}

// ─── Organization helpers ───

export async function createOrganization(data: { name: string; slug: string; ownerId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(organizations).values(data).$returningId();
  // Link the owner to the org
  await db.update(users).set({ orgId: result[0].id }).where(eq(users.id, data.ownerId));
  return { id: result[0].id, ...data };
}

export async function getOrganizationById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getOrganizationByOwnerId(ownerId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(organizations).where(eq(organizations.ownerId, ownerId)).limit(1);
  return result[0] ?? null;
}

// ─── Project helpers ───

export async function createProject(data: { orgId: number; name: string; slug: string; providerConfig?: any }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projects).values({
    orgId: data.orgId,
    name: data.name,
    slug: data.slug,
    providerConfig: data.providerConfig ?? { provider: "openai", baseUrl: "https://api.openai.com/v1" },
  }).$returningId();
  return { id: result[0].id, ...data };
}

export async function getProjectsByOrgId(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).where(eq(projects.orgId, orgId)).orderBy(desc(projects.createdAt));
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function updateProject(id: number, data: Partial<{ name: string; providerConfig: any; providerKeys: any; defaultProvider: string | null }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projects).set(data).where(eq(projects.id, id));
}

// ─── API Key helpers ───

function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const randomBytes = crypto.randomBytes(32).toString("hex");
  const raw = `sk-prysm-${randomBytes}`;
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const prefix = `sk-prysm-${randomBytes.slice(0, 8)}...`;
  return { raw, hash, prefix };
}

export function hashApiKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function createApiKey(projectId: number, name?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { raw, hash, prefix } = generateApiKey();
  await db.insert(apiKeys).values({
    projectId,
    keyHash: hash,
    keyPrefix: prefix,
    name: name ?? "Default",
  });
  // Return the raw key only once — it cannot be retrieved again
  return { key: raw, prefix };
}

export async function getApiKeysByProjectId(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: apiKeys.id,
    keyPrefix: apiKeys.keyPrefix,
    name: apiKeys.name,
    lastUsedAt: apiKeys.lastUsedAt,
    createdAt: apiKeys.createdAt,
    revokedAt: apiKeys.revokedAt,
  }).from(apiKeys)
    .where(and(eq(apiKeys.projectId, projectId), isNull(apiKeys.revokedAt)))
    .orderBy(desc(apiKeys.createdAt));
}

export async function revokeApiKey(keyId: number, projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.projectId, projectId)));
}

export async function lookupApiKey(keyHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
    .limit(1);
  if (!result[0]) return undefined;
  // Update lastUsedAt
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, result[0].id));
  return result[0];
}

// ─── Trace helpers ───

export async function insertTrace(data: InsertTrace) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(traces).values(data);
}

export async function getTraces(projectId: number, opts: {
  limit?: number;
  offset?: number;
  status?: string;
  model?: string;
  search?: string;
  from?: Date;
  to?: Date;
} = {}) {
  const db = await getDb();
  if (!db) return { traces: [], total: 0 };

  const conditions = [eq(traces.projectId, projectId)];
  if (opts.status && opts.status !== "all") {
    conditions.push(eq(traces.status, opts.status as any));
  }
  if (opts.model) {
    conditions.push(eq(traces.model, opts.model));
  }
  if (opts.from) {
    conditions.push(gte(traces.timestamp, opts.from));
  }
  if (opts.to) {
    conditions.push(lte(traces.timestamp, opts.to));
  }

  const where = and(...conditions);
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  const [rows, countResult] = await Promise.all([
    db.select({
      id: traces.id,
      traceId: traces.traceId,
      timestamp: traces.timestamp,
      model: traces.model,
      provider: traces.provider,
      status: traces.status,
      statusCode: traces.statusCode,
      latencyMs: traces.latencyMs,
      promptTokens: traces.promptTokens,
      completionTokens: traces.completionTokens,
      totalTokens: traces.totalTokens,
      costUsd: traces.costUsd,
      isStreaming: traces.isStreaming,
      endUserId: traces.endUserId,
      confidenceAnalysis: traces.confidenceAnalysis,
    }).from(traces)
      .where(where)
      .orderBy(desc(traces.timestamp))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(traces).where(where),
  ]);

  return { traces: rows, total: countResult[0]?.count ?? 0 };
}

export async function getTraceById(traceId: string, projectId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(traces)
    .where(and(eq(traces.traceId, traceId), eq(traces.projectId, projectId)))
    .limit(1);
  return result[0] ?? undefined;
}

// ─── Metrics helpers ───

export async function getProjectMetrics(projectId: number, from: Date, to: Date) {
  const db = await getDb();
  if (!db) return null;

  const where = and(
    eq(traces.projectId, projectId),
    gte(traces.timestamp, from),
    lte(traces.timestamp, to),
  );

  const [summary, statusBreakdown, modelBreakdown] = await Promise.all([
    db.select({
      totalRequests: sql<number>`count(*)`,
      totalTokens: sql<number>`COALESCE(sum(${traces.totalTokens}), 0)`,
      totalCost: sql<string>`COALESCE(sum(${traces.costUsd}), 0)`,
      avgLatency: sql<number>`COALESCE(avg(${traces.latencyMs}), 0)`,
      p50Latency: sql<number>`0`, // simplified — TiDB doesn't support PERCENTILE_CONT
      p99Latency: sql<number>`COALESCE(max(${traces.latencyMs}), 0)`,
      errorCount: sql<number>`sum(case when ${traces.status} = 'error' then 1 else 0 end)`,
      successCount: sql<number>`sum(case when ${traces.status} = 'success' then 1 else 0 end)`,
    }).from(traces).where(where),

    db.select({
      status: traces.status,
      count: sql<number>`count(*)`,
    }).from(traces).where(where).groupBy(traces.status),

    db.select({
      model: traces.model,
      count: sql<number>`count(*)`,
      totalTokens: sql<number>`COALESCE(sum(${traces.totalTokens}), 0)`,
      totalCost: sql<string>`COALESCE(sum(${traces.costUsd}), 0)`,
      avgLatency: sql<number>`COALESCE(avg(${traces.latencyMs}), 0)`,
    }).from(traces).where(where).groupBy(traces.model),
  ]);

  return {
    summary: summary[0],
    statusBreakdown,
    modelBreakdown,
  };
}

export async function getRequestTimeline(projectId: number, from: Date, to: Date, bucketMinutes: number = 60) {
  const db = await getDb();
  if (!db) return [];

  // Use raw SQL with explicit GROUP BY expression (not alias) to satisfy only_full_group_by
  const fromStr = from.toISOString().slice(0, 19).replace('T', ' ');
  const toStr = to.toISOString().slice(0, 19).replace('T', ' ');

  const result = await db.execute(
    sql`SELECT
      DATE_FORMAT(\`timestamp\`, '%Y-%m-%d %H:00:00') AS bucket,
      COUNT(*) AS \`count\`,
      COALESCE(AVG(latencyMs), 0) AS avgLatency,
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS errorCount,
      COALESCE(SUM(costUsd), 0) AS totalCost
    FROM traces
    WHERE projectId = ${projectId}
      AND \`timestamp\` >= ${fromStr}
      AND \`timestamp\` <= ${toStr}
    GROUP BY DATE_FORMAT(\`timestamp\`, '%Y-%m-%d %H:00:00')
    ORDER BY DATE_FORMAT(\`timestamp\`, '%Y-%m-%d %H:00:00')`
  );

  // drizzle execute returns [rows, fields] for mysql2
  const rows = (Array.isArray(result) && Array.isArray(result[0])) ? result[0] : result;
  return (rows as any[]).map((r: any) => ({
    bucket: r.bucket,
    count: Number(r.count),
    avgLatency: Number(r.avgLatency),
    errorCount: Number(r.errorCount),
    totalCost: String(r.totalCost),
  }));
}

// ─── Model pricing helpers ───

export async function getModelPrice(provider: string, model: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(modelPricing)
    .where(and(eq(modelPricing.provider, provider), eq(modelPricing.model, model)))
    .limit(1);
  return result[0] ?? undefined;
}

export function calculateCost(
  promptTokens: number,
  completionTokens: number,
  inputCostPer1k: number,
  outputCostPer1k: number,
): number {
  return (promptTokens / 1000) * inputCostPer1k + (completionTokens / 1000) * outputCostPer1k;
}

// Default pricing table (fallback when DB has no entry)
// All values are cost per 1K tokens (USD). Source: official pricing pages, Feb 2026.
// OpenAI: https://developers.openai.com/api/docs/pricing/
// Anthropic: https://platform.claude.com/docs/en/about-claude/pricing
// Google: https://ai.google.dev/gemini-api/docs/pricing
const DEFAULT_PRICING: Record<string, { input: number; output: number }> = {
  // ─── OpenAI GPT-5.x series ───
  "gpt-5.2": { input: 0.00175, output: 0.014 },
  "gpt-5.1": { input: 0.00125, output: 0.01 },
  "gpt-5": { input: 0.00125, output: 0.01 },
  "gpt-5-mini": { input: 0.00025, output: 0.002 },
  "gpt-5-nano": { input: 0.00005, output: 0.0004 },
  "gpt-5.2-pro": { input: 0.021, output: 0.168 },
  "gpt-5-pro": { input: 0.015, output: 0.12 },
  "gpt-5.2-chat": { input: 0.00175, output: 0.014 },
  "gpt-5.1-chat": { input: 0.00125, output: 0.01 },
  "gpt-5-chat": { input: 0.00125, output: 0.01 },
  "gpt-5.2-codex": { input: 0.00175, output: 0.014 },
  "gpt-5.1-codex": { input: 0.00125, output: 0.01 },
  "gpt-5-codex": { input: 0.00125, output: 0.01 },
  // ─── OpenAI GPT-4.1 series ───
  "gpt-4.1": { input: 0.002, output: 0.008 },
  "gpt-4.1-mini": { input: 0.0004, output: 0.0016 },
  "gpt-4.1-nano": { input: 0.0001, output: 0.0004 },
  // ─── OpenAI GPT-4o series ───
  "gpt-4o": { input: 0.0025, output: 0.01 },
  "gpt-4o-2024-05-13": { input: 0.005, output: 0.015 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  // ─── OpenAI o-series (reasoning) ───
  "o1": { input: 0.015, output: 0.06 },
  "o1-pro": { input: 0.15, output: 0.6 },
  "o1-mini": { input: 0.0011, output: 0.0044 },
  "o3": { input: 0.002, output: 0.008 },
  "o3-pro": { input: 0.02, output: 0.08 },
  "o3-mini": { input: 0.0011, output: 0.0044 },
  "o4-mini": { input: 0.0011, output: 0.0044 },
  // ─── OpenAI legacy ───
  "gpt-4-turbo": { input: 0.01, output: 0.03 },
  "gpt-4": { input: 0.03, output: 0.06 },
  "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
  // ─── OpenAI embeddings ───
  "text-embedding-3-small": { input: 0.00002, output: 0 },
  "text-embedding-3-large": { input: 0.00013, output: 0 },
  "text-embedding-ada": { input: 0.0001, output: 0 },

  // ─── Anthropic Claude 4.x series ───
  "claude-opus-4.6": { input: 0.005, output: 0.025 },
  "claude-opus-4.5": { input: 0.005, output: 0.025 },
  "claude-opus-4.1": { input: 0.015, output: 0.075 },
  "claude-opus-4": { input: 0.015, output: 0.075 },
  "claude-sonnet-4.6": { input: 0.003, output: 0.015 },
  "claude-sonnet-4.5": { input: 0.003, output: 0.015 },
  "claude-sonnet-4": { input: 0.003, output: 0.015 },
  "claude-haiku-4.5": { input: 0.001, output: 0.005 },
  // ─── Anthropic Claude 3.x series (legacy) ───
  "claude-3.7-sonnet": { input: 0.003, output: 0.015 },
  "claude-3-5-sonnet": { input: 0.003, output: 0.015 },
  "claude-3-5-haiku": { input: 0.0008, output: 0.004 },
  "claude-3-opus": { input: 0.015, output: 0.075 },
  "claude-3-haiku": { input: 0.00025, output: 0.00125 },

  // ─── Google Gemini 3.x series (preview) ───
  "gemini-3.1-pro-preview": { input: 0.002, output: 0.012 },
  "gemini-3-pro-preview": { input: 0.002, output: 0.012 },
  "gemini-3-flash-preview": { input: 0.0005, output: 0.003 },
  // ─── Google Gemini 2.5 series ───
  "gemini-2.5-pro": { input: 0.00125, output: 0.01 },
  "gemini-2.5-flash": { input: 0.0003, output: 0.0025 },
  "gemini-2.5-flash-lite": { input: 0.0001, output: 0.0004 },
  // ─── Google Gemini 2.0 series ───
  "gemini-2.0-flash": { input: 0.0001, output: 0.0004 },
  "gemini-2.0-flash-lite": { input: 0.000075, output: 0.0003 },
  // ─── Google Gemini 1.5 series (legacy) ───
  "gemini-1.5-pro": { input: 0.00125, output: 0.005 },
  "gemini-1.5-flash": { input: 0.000075, output: 0.0003 },
};

export function getDefaultPricing(model: string): { input: number; output: number } | undefined {
  // Try exact match first, then prefix match
  if (DEFAULT_PRICING[model]) return DEFAULT_PRICING[model];
  for (const [key, val] of Object.entries(DEFAULT_PRICING)) {
    if (model.startsWith(key)) return val;
  }
  return undefined;
}

/**
 * DB-driven pricing lookup with hardcoded fallback.
 * Checks model_pricing table first (exact match, then prefix), falls back to DEFAULT_PRICING.
 */
export async function getPricingForModel(provider: string, model: string): Promise<{ input: number; output: number } | undefined> {
  const db = await getDb();
  if (db) {
    // Exact match
    const exact = await db.select().from(modelPricing)
      .where(and(eq(modelPricing.provider, provider), eq(modelPricing.model, model)))
      .limit(1);
    if (exact[0]) {
      return { input: Number(exact[0].inputCostPer1k), output: Number(exact[0].outputCostPer1k) };
    }
    // Prefix match: find rows where the model starts with the DB model name
    const allForProvider = await db.select().from(modelPricing)
      .where(eq(modelPricing.provider, provider));
    for (const row of allForProvider) {
      if (model.startsWith(row.model)) {
        return { input: Number(row.inputCostPer1k), output: Number(row.outputCostPer1k) };
      }
    }
  }
  // Fallback to hardcoded defaults
  return getDefaultPricing(model);
}

// ─── Distinct models for a project ───

export async function getDistinctModels(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.selectDistinct({ model: traces.model })
    .from(traces)
    .where(eq(traces.projectId, projectId));
  return result.map(r => r.model);
}

// ─── Latency distribution for histogram ───

export async function getLatencyDistribution(projectId: number, from: Date, to: Date) {
  const db = await getDb();
  if (!db) return [];

  const fromStr = from.toISOString().slice(0, 19).replace('T', ' ');
  const toStr = to.toISOString().slice(0, 19).replace('T', ' ');

  // Bucket latencies into ranges: 0-100, 100-200, ..., 900-1000, 1000-2000, 2000-5000, 5000+
  const result = await db.execute(
    sql`SELECT
      CASE
        WHEN latencyMs < 100 THEN '0-100'
        WHEN latencyMs < 200 THEN '100-200'
        WHEN latencyMs < 300 THEN '200-300'
        WHEN latencyMs < 500 THEN '300-500'
        WHEN latencyMs < 1000 THEN '500-1000'
        WHEN latencyMs < 2000 THEN '1000-2000'
        WHEN latencyMs < 5000 THEN '2000-5000'
        ELSE '5000+'
      END AS bucket,
      COUNT(*) AS \`count\`,
      MIN(latencyMs) AS minMs,
      MAX(latencyMs) AS maxMs
    FROM traces
    WHERE projectId = ${projectId}
      AND \`timestamp\` >= ${fromStr}
      AND \`timestamp\` <= ${toStr}
      AND latencyMs IS NOT NULL
    GROUP BY CASE
        WHEN latencyMs < 100 THEN '0-100'
        WHEN latencyMs < 200 THEN '100-200'
        WHEN latencyMs < 300 THEN '200-300'
        WHEN latencyMs < 500 THEN '300-500'
        WHEN latencyMs < 1000 THEN '500-1000'
        WHEN latencyMs < 2000 THEN '1000-2000'
        WHEN latencyMs < 5000 THEN '2000-5000'
        ELSE '5000+'
      END
    ORDER BY MIN(latencyMs)`
  );

  const rows = (Array.isArray(result) && Array.isArray(result[0])) ? result[0] : result;
  return (rows as any[]).map((r: any) => ({
    bucket: String(r.bucket),
    count: Number(r.count),
  }));
}

// ─── Pre-aggregated Metrics Pipeline ───

import { metrics, InsertMetric, usageRecords, usageAlerts, alertConfigs, InsertAlertConfig, orgMembers, InsertOrgMember } from "../drizzle/schema";

/**
 * Compute approximate percentile from a sorted array of numbers.
 * Uses nearest-rank method.
 */
function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, idx)];
}

/**
 * Aggregate traces into the pre-aggregated metrics table.
 * Computes metrics for a given time range and bucket size.
 * Uses INSERT ... ON DUPLICATE KEY UPDATE for idempotent upserts.
 */
export async function aggregateMetrics(
  projectId: number,
  bucketSize: "1m" | "1h" | "1d",
  from: Date,
  to: Date,
) {
  const db = await getDb();
  if (!db) return;

  // Determine the DATE_FORMAT pattern for bucketing
  const formatPattern = bucketSize === "1m"
    ? "%Y-%m-%d %H:%i:00"
    : bucketSize === "1h"
      ? "%Y-%m-%d %H:00:00"
      : "%Y-%m-%d 00:00:00";

  const fromStr = from.toISOString().slice(0, 19).replace("T", " ");
  const toStr = to.toISOString().slice(0, 19).replace("T", " ");

  // Get all traces in the time range, grouped by model
  const rawTraces = await db.execute(
    sql`SELECT
      DATE_FORMAT(\`timestamp\`, ${formatPattern}) AS bucket,
      model,
      latencyMs,
      ttftMs,
      status,
      totalTokens,
      promptTokens,
      completionTokens,
      costUsd
    FROM traces
    WHERE projectId = ${projectId}
      AND \`timestamp\` >= ${fromStr}
      AND \`timestamp\` <= ${toStr}
    ORDER BY \`timestamp\``
  );

  const rows = (Array.isArray(rawTraces) && Array.isArray(rawTraces[0])) ? rawTraces[0] : rawTraces;

  // Group by (bucket, model)
  const groups = new Map<string, {
    bucket: string;
    model: string;
    latencies: number[];
    ttfts: number[];
    requestCount: number;
    errorCount: number;
    totalTokens: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalCostUsd: number;
  }>();

  for (const row of rows as any[]) {
    const key = `${row.bucket}|${row.model || "unknown"}`;
    if (!groups.has(key)) {
      groups.set(key, {
        bucket: row.bucket,
        model: row.model || "unknown",
        latencies: [],
        ttfts: [],
        requestCount: 0,
        errorCount: 0,
        totalTokens: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalCostUsd: 0,
      });
    }
    const g = groups.get(key)!;
    g.requestCount++;
    if (row.status === "error") g.errorCount++;
    if (row.latencyMs != null) g.latencies.push(Number(row.latencyMs));
    if (row.ttftMs != null) g.ttfts.push(Number(row.ttftMs));
    g.totalTokens += Number(row.totalTokens || 0);
    g.totalPromptTokens += Number(row.promptTokens || 0);
    g.totalCompletionTokens += Number(row.completionTokens || 0);
    g.totalCostUsd += Number(row.costUsd || 0);
  }

  // Upsert each group into the metrics table
  for (const g of Array.from(groups.values())) {
    g.latencies.sort((a: number, b: number) => a - b);
    g.ttfts.sort((a: number, b: number) => a - b);

    const p50 = percentile(g.latencies, 50);
    const p95 = percentile(g.latencies, 95);
    const p99 = percentile(g.latencies, 99);
    const ttftP50 = g.ttfts.length > 0 ? percentile(g.ttfts, 50) : null;

    await db.insert(metrics).values({
      projectId,
      bucket: new Date(g.bucket),
      bucketSize,
      model: g.model,
      requestCount: g.requestCount,
      errorCount: g.errorCount,
      totalTokens: g.totalTokens,
      totalPromptTokens: g.totalPromptTokens,
      totalCompletionTokens: g.totalCompletionTokens,
      totalCostUsd: g.totalCostUsd.toFixed(8),
      latencyP50: p50,
      latencyP95: p95,
      latencyP99: p99,
      ttftP50,
    }).onDuplicateKeyUpdate({
      set: {
        requestCount: sql`VALUES(requestCount)`,
        errorCount: sql`VALUES(errorCount)`,
        totalTokens: sql`VALUES(totalTokens)`,
        totalPromptTokens: sql`VALUES(totalPromptTokens)`,
        totalCompletionTokens: sql`VALUES(totalCompletionTokens)`,
        totalCostUsd: sql`VALUES(totalCostUsd)`,
        latencyP50: sql`VALUES(latencyP50)`,
        latencyP95: sql`VALUES(latencyP95)`,
        latencyP99: sql`VALUES(latencyP99)`,
        ttftP50: sql`VALUES(ttftP50)`,
      },
    });
  }
}

/**
 * Run aggregation for all projects. Called by the scheduled job.
 */
export async function runMetricsAggregation() {
  const db = await getDb();
  if (!db) return;

  // Get all project IDs
  const allProjects = await db.select({ id: projects.id }).from(projects);

  const now = new Date();

  for (const project of allProjects) {
    // 1-hour buckets: aggregate the last 2 hours (overlap for safety)
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    await aggregateMetrics(project.id, "1h", twoHoursAgo, now);

    // 1-day buckets: aggregate the last 2 days (overlap for safety)
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    await aggregateMetrics(project.id, "1d", twoDaysAgo, now);
  }

  console.log(`[Metrics] Aggregation complete for ${allProjects.length} projects at ${now.toISOString()}`);
}

/**
 * Get pre-aggregated metrics from the metrics table.
 * Falls back to raw trace queries if metrics table is empty for the range.
 */
export async function getAggregatedMetrics(
  projectId: number,
  bucketSize: "1h" | "1d",
  from: Date,
  to: Date,
) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select()
    .from(metrics)
    .where(and(
      eq(metrics.projectId, projectId),
      eq(metrics.bucketSize, bucketSize),
      gte(metrics.bucket, from),
      lte(metrics.bucket, to),
    ))
    .orderBy(asc(metrics.bucket));

  return result;
}

/**
 * Get overall percentile latencies from the metrics table.
 */
export async function getLatencyPercentiles(
  projectId: number,
  from: Date,
  to: Date,
) {
  const db = await getDb();
  if (!db) return { p50: 0, p95: 0, p99: 0 };

  // If we have pre-aggregated data, compute weighted percentiles from 1h buckets
  const hourlyMetrics = await db.select()
    .from(metrics)
    .where(and(
      eq(metrics.projectId, projectId),
      eq(metrics.bucketSize, "1h"),
      gte(metrics.bucket, from),
      lte(metrics.bucket, to),
    ));

  if (hourlyMetrics.length > 0) {
    // Weighted average of percentiles (approximate but fast)
    let totalRequests = 0;
    let weightedP50 = 0;
    let weightedP95 = 0;
    let weightedP99 = 0;

    for (const m of hourlyMetrics) {
      const w = m.requestCount;
      totalRequests += w;
      weightedP50 += (m.latencyP50 ?? 0) * w;
      weightedP95 += (m.latencyP95 ?? 0) * w;
      weightedP99 += (m.latencyP99 ?? 0) * w;
    }

    if (totalRequests > 0) {
      return {
        p50: Math.round(weightedP50 / totalRequests),
        p95: Math.round(weightedP95 / totalRequests),
        p99: Math.round(weightedP99 / totalRequests),
      };
    }
  }

  // Fallback: compute from raw traces (for when metrics haven't been aggregated yet)
  const fromStr = from.toISOString().slice(0, 19).replace("T", " ");
  const toStr = to.toISOString().slice(0, 19).replace("T", " ");

  const rawResult = await db.execute(
    sql`SELECT latencyMs FROM traces
    WHERE projectId = ${projectId}
      AND \`timestamp\` >= ${fromStr}
      AND \`timestamp\` <= ${toStr}
      AND latencyMs IS NOT NULL
    ORDER BY latencyMs`
  );

  const rawRows = (Array.isArray(rawResult) && Array.isArray(rawResult[0])) ? rawResult[0] : rawResult;
  const latencies = (rawRows as any[]).map((r: any) => Number(r.latencyMs));

  if (latencies.length === 0) return { p50: 0, p95: 0, p99: 0 };

  return {
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
  };
}

// ─── Usage tracking helpers ───

export async function incrementUsage(orgId: number, projectId: number) {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const periodStartStr = periodStart.toISOString().slice(0, 19).replace("T", " ");
  const periodEndStr = periodEnd.toISOString().slice(0, 19).replace("T", " ");

  // Upsert: increment request_count for the current billing period
  await db.execute(
    sql`INSERT INTO usage_records (orgId, projectId, periodStart, periodEnd, requestCount)
    VALUES (${orgId}, ${projectId}, ${periodStartStr}, ${periodEndStr}, 1)
    ON DUPLICATE KEY UPDATE requestCount = requestCount + 1`
  );
}

export async function getUsageForOrg(orgId: number) {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const result = await db.select()
    .from(usageRecords)
    .where(and(
      eq(usageRecords.orgId, orgId),
      gte(usageRecords.periodStart, periodStart),
    ));

  const totalRequests = result.reduce((sum, r) => sum + (r.requestCount ?? 0), 0);
  return {
    totalRequests,
    records: result,
    period: {
      start: periodStart,
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    },
  };
}

/**
 * Check if org has exceeded tier limit (5K free / 50K pro / 250K team / unlimited enterprise).
 * Returns { allowed: boolean, currentCount: number, limit: number }
 */
export async function checkUsageLimit(orgId: number, plan: string = "free") {
  const limits: Record<string, number> = {
    free: 5000,
    pro: 50000,
    team: 250000,
    enterprise: Infinity,
  };

  const limit = limits[plan] ?? limits.free;
  const usage = await getUsageForOrg(orgId);
  const currentCount = usage?.totalRequests ?? 0;

  return {
    allowed: currentCount < limit,
    currentCount,
    limit,
    plan,
  };
}

/**
 * Get the org's plan by project ID (used by proxy for tier enforcement).
 * Returns the plan string or 'free' as fallback.
 */
export async function getOrgPlanByProjectId(projectId: number): Promise<string> {
  const db = await getDb();
  if (!db) return "free";

  const result = await db
    .select({ plan: organizations.plan })
    .from(projects)
    .innerJoin(organizations, eq(projects.orgId, organizations.id))
    .where(eq(projects.id, projectId))
    .limit(1);

  return result[0]?.plan ?? "free";
}

// ─── Alert config helpers ───

export async function getAlertConfigs(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(alertConfigs)
    .where(eq(alertConfigs.projectId, projectId))
    .orderBy(desc(alertConfigs.createdAt));
}

export async function createAlertConfig(data: InsertAlertConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(alertConfigs).values(data).$returningId();
  return { id: result[0].id, ...data };
}

export async function updateAlertConfig(id: number, projectId: number, data: Partial<InsertAlertConfig>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(alertConfigs)
    .set(data)
    .where(and(eq(alertConfigs.id, id), eq(alertConfigs.projectId, projectId)));
}

export async function deleteAlertConfig(id: number, projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(alertConfigs)
    .where(and(eq(alertConfigs.id, id), eq(alertConfigs.projectId, projectId)));
}

// ─── Org member helpers ───

export async function getOrgMembers(orgId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select({
    id: orgMembers.id,
    orgId: orgMembers.orgId,
    userId: orgMembers.userId,
    email: orgMembers.email,
    role: orgMembers.role,
    status: orgMembers.status,
    invitedAt: orgMembers.invitedAt,
    joinedAt: orgMembers.joinedAt,
    userName: users.name,
    userEmail: users.email,
  })
    .from(orgMembers)
    .leftJoin(users, eq(orgMembers.userId, users.id))
    .where(eq(orgMembers.orgId, orgId))
    .orderBy(desc(orgMembers.invitedAt));

  return result;
}

export async function inviteOrgMember(data: { orgId: number; email: string; role?: string; invitedBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if already invited
  const existing = await db.select().from(orgMembers)
    .where(and(eq(orgMembers.orgId, data.orgId), eq(orgMembers.email, data.email)))
    .limit(1);

  if (existing.length > 0) {
    return { success: false, error: "User already invited" };
  }

  // Generate invite token
  const inviteToken = crypto.randomBytes(48).toString("hex");

  const result = await db.insert(orgMembers).values({
    orgId: data.orgId,
    email: data.email,
    role: (data.role as "admin" | "member") ?? "member",
    invitedBy: data.invitedBy,
    inviteToken,
    status: "pending",
  }).$returningId();

  return { success: true, id: result[0].id, inviteToken };
}

export async function acceptOrgInvite(token: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Find the invite by token
  const invites = await db.select().from(orgMembers)
    .where(and(eq(orgMembers.inviteToken, token), eq(orgMembers.status, "pending")))
    .limit(1);

  if (invites.length === 0) {
    return { success: false, error: "Invalid or expired invite" };
  }

  const invite = invites[0];

  // Update the invite to active
  await db.update(orgMembers)
    .set({
      userId,
      status: "active",
      inviteToken: null,
      joinedAt: new Date(),
    })
    .where(eq(orgMembers.id, invite.id));

  // Also update the user's orgId
  await db.update(users)
    .set({ orgId: invite.orgId })
    .where(eq(users.id, userId));

  return { success: true, orgId: invite.orgId };
}

export async function getOrgInviteByToken(token: string) {
  const db = await getDb();
  if (!db) return null;

  const invites = await db.select({
    id: orgMembers.id,
    orgId: orgMembers.orgId,
    email: orgMembers.email,
    role: orgMembers.role,
    status: orgMembers.status,
    orgName: organizations.name,
  })
    .from(orgMembers)
    .leftJoin(organizations, eq(orgMembers.orgId, organizations.id))
    .where(eq(orgMembers.inviteToken, token))
    .limit(1);

  return invites.length > 0 ? invites[0] : null;
}

export async function removeOrgMember(memberId: number, orgId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(orgMembers)
    .where(and(eq(orgMembers.id, memberId), eq(orgMembers.orgId, orgId)));
}

// ─── Custom Pricing ───

export async function getCustomPricing(projectId: number) {
  const db = await getDb();
  if (!db) return [];

  // Get all custom pricing entries (project-specific ones stored in model_pricing)
  // We use a convention: provider field stores "custom:{projectId}" for project-specific pricing
  const result = await db.select().from(modelPricing)
    .where(eq(modelPricing.provider, `custom:${projectId}`))
    .orderBy(modelPricing.model);

  return result;
}

export async function upsertCustomPricing(data: {
  projectId: number;
  provider: string;
  model: string;
  inputCostPer1k: string;
  outputCostPer1k: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if entry exists for this project + model
  const customProvider = `custom:${data.projectId}`;
  const existing = await db.select().from(modelPricing)
    .where(and(
      eq(modelPricing.provider, customProvider),
      eq(modelPricing.model, data.model)
    ))
    .limit(1);

  if (existing.length > 0) {
    await db.update(modelPricing)
      .set({
        inputCostPer1k: data.inputCostPer1k,
        outputCostPer1k: data.outputCostPer1k,
      })
      .where(eq(modelPricing.id, existing[0].id));
    return { success: true, id: existing[0].id };
  }

  // Also upsert into the global pricing table for the actual provider
  // so the proxy can pick it up
  const globalExisting = await db.select().from(modelPricing)
    .where(and(
      eq(modelPricing.provider, data.provider),
      eq(modelPricing.model, data.model)
    ))
    .limit(1);

  if (globalExisting.length > 0) {
    await db.update(modelPricing)
      .set({
        inputCostPer1k: data.inputCostPer1k,
        outputCostPer1k: data.outputCostPer1k,
      })
      .where(eq(modelPricing.id, globalExisting[0].id));
  } else {
    await db.insert(modelPricing).values({
      provider: data.provider,
      model: data.model,
      inputCostPer1k: data.inputCostPer1k,
      outputCostPer1k: data.outputCostPer1k,
    });
  }

  // Insert the custom:projectId entry for tracking
  const result = await db.insert(modelPricing).values({
    provider: customProvider,
    model: data.model,
    inputCostPer1k: data.inputCostPer1k,
    outputCostPer1k: data.outputCostPer1k,
  }).$returningId();

  return { success: true, id: result[0].id };
}

export async function deleteCustomPricing(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(modelPricing).where(eq(modelPricing.id, id));
}


// ═══════════════════════════════════════════════════════════════
// EXPLAINABILITY (Layer 3a)
// ═══════════════════════════════════════════════════════════════

export interface ExplainabilityConfig {
  enabled: boolean;
  logprobsInjection: "always" | "never" | "sample";
  sampleRate: number;
}

/**
 * Get explainability configuration for a project.
 * Returns defaults (enabled, always inject) if project not found or DB unavailable.
 */
export async function getExplainabilityConfig(projectId: number): Promise<ExplainabilityConfig> {
  const defaults: ExplainabilityConfig = {
    enabled: true,
    logprobsInjection: "always",
    sampleRate: 1.0,
  };
  try {
    const db = await getDb();
    if (!db) return defaults;
    const result = await db.select({
      explainabilityEnabled: projects.explainabilityEnabled,
      logprobsInjection: projects.logprobsInjection,
      logprobsSampleRate: projects.logprobsSampleRate,
    }).from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!result[0]) return defaults;
    return {
      enabled: result[0].explainabilityEnabled ?? true,
      logprobsInjection: (result[0].logprobsInjection as "always" | "never" | "sample") ?? "always",
      sampleRate: parseFloat(result[0].logprobsSampleRate ?? "1.00"),
    };
  } catch (err) {
    console.error("[Explainability] Failed to get config:", err);
    return defaults;
  }
}

/**
 * Update explainability settings for a project.
 */
export async function updateExplainabilityConfig(
  projectId: number,
  config: Partial<ExplainabilityConfig>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = {};
  if (config.enabled !== undefined) updateData.explainabilityEnabled = config.enabled;
  if (config.logprobsInjection !== undefined) updateData.logprobsInjection = config.logprobsInjection;
  if (config.sampleRate !== undefined) updateData.logprobsSampleRate = config.sampleRate.toFixed(2);
  await db.update(projects).set(updateData).where(eq(projects.id, projectId));
}

/**
 * Get or create an explainability report for a trace.
 */
export async function getExplainabilityReport(traceId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(explainabilityReports).where(eq(explainabilityReports.traceId, traceId)).limit(1);
  return result[0] ?? undefined;
}

/**
 * Insert an explainability report (upsert — replace if exists).
 */
export async function upsertExplainabilityReport(data: InsertExplainabilityReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Try to insert; if trace already has a report, update it
  const existing = await db.select({ id: explainabilityReports.id })
    .from(explainabilityReports)
    .where(eq(explainabilityReports.traceId, data.traceId))
    .limit(1);
  if (existing.length > 0) {
    await db.update(explainabilityReports).set({
      explanation: data.explanation,
      highlights: data.highlights,
      modelUsed: data.modelUsed,
      tokensUsed: data.tokensUsed,
      cost: data.cost,
      generatedAt: new Date(),
    }).where(eq(explainabilityReports.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await db.insert(explainabilityReports).values(data).$returningId();
    return result[0].id;
  }
}

/**
 * Update the confidenceAnalysis JSON on a trace.
 */
export async function updateTraceConfidenceAnalysis(traceDbId: number, analysis: Record<string, unknown>) {
  const db = await getDb();
  if (!db) return;
  await db.update(traces).set({ confidenceAnalysis: analysis }).where(eq(traces.id, traceDbId));
}

/**
 * Get traces with confidence analysis for a project (for hallucination report).
 */
export async function getTracesWithConfidence(
  projectId: number,
  options: { limit?: number; minRisk?: number; from?: Date; to?: Date } = {},
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(traces.projectId, projectId)];
  if (options.from) conditions.push(gte(traces.timestamp, options.from));
  if (options.to) conditions.push(lte(traces.timestamp, options.to));

  const result = await db.select({
    id: traces.id,
    traceId: traces.traceId,
    model: traces.model,
    provider: traces.provider,
    completion: traces.completion,
    confidenceAnalysis: traces.confidenceAnalysis,
    timestamp: traces.timestamp,
  })
    .from(traces)
    .where(and(...conditions))
    .orderBy(desc(traces.timestamp))
    .limit(options.limit ?? 100);

  // Filter by minRisk in application layer (JSON field)
  if (options.minRisk !== undefined && options.minRisk > 0) {
    return result.filter((t) => {
      const analysis = t.confidenceAnalysis as any;
      return analysis?.hallucination_risk_score >= options.minRisk!;
    });
  }
  return result;
}


/**
 * Get a trace by its numeric database ID (for explainability lookups).
 */
export async function getTraceByDbId(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(traces).where(eq(traces.id, id)).limit(1);
  return result[0] ?? undefined;
}


// ─── Usage Alert Check ───

const USAGE_ALERT_THRESHOLDS = [80, 90, 100]; // percent thresholds

/**
 * Check if usage has crossed an alert threshold and send email if needed.
 * Called after each incrementUsage to avoid separate polling.
 * 
 * Returns the threshold that was triggered (or null if no alert needed).
 */
export async function checkAndSendUsageAlert(
  orgId: number,
  plan: string
): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  const limits: Record<string, number> = {
    free: 5000,
    pro: 50000,
    team: 250000,
    enterprise: Infinity,
  };

  const limit = limits[plan] ?? limits.free;
  if (limit === Infinity) return null; // Enterprise has no limit

  const usage = await getUsageForOrg(orgId);
  if (!usage) return null;

  const currentCount = usage.totalRequests;
  const percentUsed = Math.round((currentCount / limit) * 100);

  // Find the highest threshold that has been crossed
  const crossedThreshold = USAGE_ALERT_THRESHOLDS
    .filter((t) => percentUsed >= t)
    .sort((a, b) => b - a)[0];

  if (!crossedThreshold) return null;

  // Check if we already sent this threshold alert for this billing period
  const periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const periodStartStr = periodStart.toISOString().slice(0, 19).replace("T", " ");

  const existing = await db
    .select()
    .from(usageAlerts)
    .where(
      and(
        eq(usageAlerts.orgId, orgId),
        eq(usageAlerts.threshold, crossedThreshold),
        gte(usageAlerts.periodStart, periodStart)
      )
    )
    .limit(1);

  if (existing.length > 0) return null; // Already sent

  // Get org details and owner email
  const org = await getOrganizationById(orgId);
  if (!org) return null;

  const owner = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, org.ownerId))
    .limit(1);

  const ownerEmail = owner[0]?.email;
  if (!ownerEmail) return null;

  // Record that we're sending this alert (prevent duplicates)
  try {
    await db.insert(usageAlerts).values({
      orgId,
      periodStart,
      threshold: crossedThreshold,
      emailTo: ownerEmail,
    });
  } catch (err: any) {
    // Duplicate key = already sent (race condition protection)
    if (err?.code === "ER_DUP_ENTRY") return null;
    throw err;
  }

  // Send the email (async, don't block the request)
  const { sendUsageAlertEmail } = await import("./usageAlertEmail");
  const siteUrl = process.env.SITE_URL || "https://prysmai.io";

  sendUsageAlertEmail({
    email: ownerEmail,
    orgName: org.name,
    currentPlan: plan,
    currentUsage: currentCount,
    limit,
    percentUsed,
    siteUrl,
  }).catch((err) => {
    console.error("[UsageAlert] Failed to send email:", err);
  });

  console.log(
    `[UsageAlert] Sent ${crossedThreshold}% alert to ${ownerEmail} for org ${org.name} (${currentCount}/${limit})`
  );

  return crossedThreshold;
}


// ─── Unified Trace Model ───
// Correlates LLM traces, session events, and agent sessions into a single timeline.

export interface UnifiedTimelineEvent {
  id: string;           // unique composite id
  source: "trace" | "session_event";
  eventType: string;
  timestamp: number;    // UTC ms
  // LLM trace fields (when source=trace)
  traceId?: string;
  model?: string | null;
  provider?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  latencyMs?: number | null;
  status?: string | null;
  costUsd?: string | null;
  completion?: string | null;
  // Session event fields (when source=session_event)
  sessionEventId?: number;
  toolName?: string | null;
  toolSuccess?: boolean | null;
  toolDurationMs?: number | null;
  codeLanguage?: string | null;
  codeFilePath?: string | null;
  eventData?: Record<string, unknown> | null;
  sequenceNumber?: number | null;
  behavioralFlags?: Array<{ flag: string; severity: number }> | null;
  // Session context (always present when session exists)
  sessionId?: string | null;
  agentType?: string | null;
  sessionStatus?: string | null;
}

/**
 * Get a unified timeline for a project, merging LLM traces and session events
 * into a single chronologically-ordered stream.
 */
export async function getUnifiedTimeline(
  projectId: number,
  opts: {
    sessionId?: string;
    from?: number;
    to?: number;
    eventTypes?: string[];
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ events: UnifiedTimelineEvent[]; total: number }> {
  const db = await getDb();
  if (!db) return { events: [], total: 0 };

  const limit = opts.limit ?? 100;
  const offset = opts.offset ?? 0;

  // Build WHERE conditions for traces
  const traceConditions = [eq(traces.projectId, projectId)];
  if (opts.from) traceConditions.push(gte(traces.timestamp, new Date(opts.from)));
  if (opts.to) traceConditions.push(lte(traces.timestamp, new Date(opts.to)));
  if (opts.sessionId) traceConditions.push(eq(traces.sessionId, opts.sessionId));

  // Build WHERE conditions for session events
  const eventConditions = [eq(sessionEvents.projectId, projectId)];
  if (opts.from) eventConditions.push(gte(sessionEvents.eventTimestamp, opts.from));
  if (opts.to) eventConditions.push(lte(sessionEvents.eventTimestamp, opts.to));

  // If filtering by sessionId, join through agent_sessions
  let sessionDbId: number | null = null;
  if (opts.sessionId) {
    const [session] = await db
      .select({ id: agentSessions.id })
      .from(agentSessions)
      .where(and(eq(agentSessions.projectId, projectId), eq(agentSessions.sessionId, opts.sessionId)))
      .limit(1);
    if (session) {
      sessionDbId = session.id;
      eventConditions.push(eq(sessionEvents.sessionId, session.id));
    }
  }

  // Filter by event types if specified
  const wantTraces = !opts.eventTypes || opts.eventTypes.includes("llm_call") || opts.eventTypes.includes("trace");
  const wantEvents = !opts.eventTypes || opts.eventTypes.some(t => t !== "trace");

  const allEvents: UnifiedTimelineEvent[] = [];

  // Fetch LLM traces
  if (wantTraces) {
    const traceRows = await db
      .select()
      .from(traces)
      .where(and(...traceConditions))
      .orderBy(desc(traces.timestamp))
      .limit(limit + offset);

    for (const t of traceRows) {
      allEvents.push({
        id: `trace-${t.id}`,
        source: "trace",
        eventType: "llm_call",
        timestamp: t.timestamp.getTime(),
        traceId: t.traceId,
        model: t.model,
        provider: t.provider,
        promptTokens: t.promptTokens,
        completionTokens: t.completionTokens,
        totalTokens: t.totalTokens,
        latencyMs: t.latencyMs,
        status: t.status,
        costUsd: t.costUsd,
        completion: t.completion?.slice(0, 200),
        sessionId: t.sessionId,
      });
    }
  }

  // Fetch session events
  if (wantEvents) {
    const eventTypeFilter = opts.eventTypes?.filter(t => t !== "trace");

    let eventQuery = db
      .select({
        event: sessionEvents,
        session: {
          sessionId: agentSessions.sessionId,
          agentType: agentSessions.agentType,
          status: agentSessions.status,
        },
      })
      .from(sessionEvents)
      .leftJoin(agentSessions, eq(sessionEvents.sessionId, agentSessions.id))
      .where(and(...eventConditions))
      .orderBy(desc(sessionEvents.eventTimestamp))
      .limit(limit + offset);

    const eventRows = await eventQuery;

    for (const row of eventRows) {
      const e = row.event;
      // Skip llm_call events that are already represented by traces (avoid duplicates)
      if (e.eventType === "llm_call" && e.traceId && wantTraces) continue;

      allEvents.push({
        id: `event-${e.id}`,
        source: "session_event",
        eventType: e.eventType,
        timestamp: e.eventTimestamp,
        sessionEventId: e.id,
        toolName: e.toolName,
        toolSuccess: e.toolSuccess,
        toolDurationMs: e.toolDurationMs,
        codeLanguage: e.codeLanguage,
        codeFilePath: e.codeFilePath,
        eventData: e.eventData,
        sequenceNumber: e.sequenceNumber,
        behavioralFlags: e.behavioralFlags,
        sessionId: row.session?.sessionId ?? null,
        agentType: row.session?.agentType ?? null,
        sessionStatus: row.session?.status ?? null,
        // LLM fields from event data if present
        model: e.model,
        promptTokens: e.promptTokens,
        completionTokens: e.completionTokens,
        latencyMs: e.toolDurationMs,
      });
    }
  }

  // Sort by timestamp descending
  allEvents.sort((a, b) => b.timestamp - a.timestamp);

  const total = allEvents.length;
  const paged = allEvents.slice(offset, offset + limit);

  return { events: paged, total };
}

/**
 * Get a trace tree: given a session, build the parent-child relationships
 * between agent runs, LLM calls, and tool calls.
 */
export interface TraceTreeNode {
  id: string;
  type: "agent_run" | "llm_call" | "tool_call" | "decision" | "delegation" | "code" | "file_op" | "error" | "other";
  label: string;
  timestamp: number;
  durationMs?: number | null;
  success?: boolean | null;
  children: TraceTreeNode[];
  metadata?: Record<string, unknown>;
}

export async function getTraceTree(
  projectId: number,
  sessionId: string
): Promise<TraceTreeNode | null> {
  const db = await getDb();
  if (!db) return null;

  // Find the session
  const [session] = await db
    .select()
    .from(agentSessions)
    .where(and(eq(agentSessions.projectId, projectId), eq(agentSessions.sessionId, sessionId)))
    .limit(1);

  if (!session) return null;

  // Get all events for this session
  const events = await db
    .select()
    .from(sessionEvents)
    .where(eq(sessionEvents.sessionId, session.id))
    .orderBy(asc(sessionEvents.sequenceNumber));

  // Build the tree: root is the agent run
  const root: TraceTreeNode = {
    id: `session-${session.id}`,
    type: "agent_run",
    label: `${session.agentType} session`,
    timestamp: session.startedAt,
    durationMs: session.durationMs,
    success: session.status === "completed",
    children: [],
    metadata: {
      status: session.status,
      outcome: session.outcome,
      totalEvents: session.totalEvents,
      totalTokens: session.totalTokens,
      behaviorScore: session.behaviorScore,
    },
  };

  // Map events to tree nodes
  for (const e of events) {
    const node = eventToTreeNode(e);
    root.children.push(node);
  }

  return root;
}

function eventToTreeNode(e: any): TraceTreeNode {
  const data = e.eventData as Record<string, unknown> | null;

  switch (e.eventType) {
    case "llm_call":
      return {
        id: `event-${e.id}`,
        type: "llm_call",
        label: `LLM: ${e.model || data?.model || "unknown"}`,
        timestamp: e.eventTimestamp,
        durationMs: e.toolDurationMs,
        success: true,
        children: [],
        metadata: {
          model: e.model,
          promptTokens: e.promptTokens,
          completionTokens: e.completionTokens,
          costCents: e.costCents,
          traceId: e.traceId,
        },
      };
    case "tool_call":
    case "tool_result":
      return {
        id: `event-${e.id}`,
        type: "tool_call",
        label: `Tool: ${e.toolName || "unknown"}`,
        timestamp: e.eventTimestamp,
        durationMs: e.toolDurationMs,
        success: e.toolSuccess,
        children: [],
        metadata: {
          toolName: e.toolName,
          toolInput: e.toolInput,
          toolOutput: e.toolOutput,
        },
      };
    case "decision":
      return {
        id: `event-${e.id}`,
        type: "decision",
        label: `Decision: ${(data?.description as string)?.slice(0, 80) || ""}`,
        timestamp: e.eventTimestamp,
        children: [],
        metadata: data ?? undefined,
      };
    case "delegation":
      return {
        id: `event-${e.id}`,
        type: "delegation",
        label: `Delegate → ${data?.target || "sub-agent"}`,
        timestamp: e.eventTimestamp,
        children: [],
        metadata: data ?? undefined,
      };
    case "code_generated":
    case "code_executed":
      return {
        id: `event-${e.id}`,
        type: "code",
        label: `${e.eventType === "code_generated" ? "Gen" : "Exec"} ${e.codeLanguage || ""} ${e.codeFilePath || ""}`.trim(),
        timestamp: e.eventTimestamp,
        children: [],
        metadata: {
          language: e.codeLanguage,
          filePath: e.codeFilePath,
        },
      };
    case "file_read":
    case "file_write":
      return {
        id: `event-${e.id}`,
        type: "file_op",
        label: `${e.eventType === "file_read" ? "Read" : "Write"}: ${(data?.path as string) || ""}`,
        timestamp: e.eventTimestamp,
        children: [],
        metadata: data ?? undefined,
      };
    case "error":
      return {
        id: `event-${e.id}`,
        type: "error",
        label: `Error: ${(data?.message as string)?.slice(0, 80) || "unknown"}`,
        timestamp: e.eventTimestamp,
        success: false,
        children: [],
        metadata: data ?? undefined,
      };
    default:
      return {
        id: `event-${e.id}`,
        type: "other",
        label: e.eventType,
        timestamp: e.eventTimestamp,
        children: [],
        metadata: data ?? undefined,
      };
  }
}

/**
 * Get tool performance metrics for a project.
 * Aggregates tool call success rates, latency stats, and usage frequency.
 */
export interface ToolPerformanceMetrics {
  toolName: string;
  totalCalls: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  maxLatencyMs: number;
  minLatencyMs: number;
  totalDurationMs: number;
}

export async function getToolPerformance(
  projectId: number,
  opts: {
    from?: number;
    to?: number;
    sessionId?: string;
    limit?: number;
  } = {}
): Promise<ToolPerformanceMetrics[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [
    eq(sessionEvents.projectId, projectId),
    sql`${sessionEvents.toolName} IS NOT NULL`,
  ];

  if (opts.from) conditions.push(gte(sessionEvents.eventTimestamp, opts.from));
  if (opts.to) conditions.push(lte(sessionEvents.eventTimestamp, opts.to));

  if (opts.sessionId) {
    const [session] = await db
      .select({ id: agentSessions.id })
      .from(agentSessions)
      .where(and(eq(agentSessions.projectId, projectId), eq(agentSessions.sessionId, opts.sessionId)))
      .limit(1);
    if (session) {
      conditions.push(eq(sessionEvents.sessionId, session.id));
    }
  }

  const rows = await db
    .select({
      toolName: sessionEvents.toolName,
      totalCalls: count().as("total_calls"),
      successCount: sql<number>`SUM(CASE WHEN ${sessionEvents.toolSuccess} = true THEN 1 ELSE 0 END)`.as("success_count"),
      failureCount: sql<number>`SUM(CASE WHEN ${sessionEvents.toolSuccess} = false THEN 1 ELSE 0 END)`.as("failure_count"),
      avgLatencyMs: sql<number>`AVG(${sessionEvents.toolDurationMs})`.as("avg_latency"),
      maxLatencyMs: sql<number>`MAX(${sessionEvents.toolDurationMs})`.as("max_latency"),
      minLatencyMs: sql<number>`MIN(${sessionEvents.toolDurationMs})`.as("min_latency"),
      totalDurationMs: sql<number>`SUM(${sessionEvents.toolDurationMs})`.as("total_duration"),
    })
    .from(sessionEvents)
    .where(and(...conditions))
    .groupBy(sessionEvents.toolName)
    .orderBy(desc(sql`total_calls`))
    .limit(opts.limit ?? 50);

  return rows.map((r) => ({
    toolName: r.toolName || "unknown",
    totalCalls: r.totalCalls,
    successCount: r.successCount ?? 0,
    failureCount: r.failureCount ?? 0,
    successRate: r.totalCalls > 0 ? (r.successCount ?? 0) / r.totalCalls : 0,
    avgLatencyMs: Math.round(r.avgLatencyMs ?? 0),
    p50LatencyMs: 0, // computed client-side from raw data
    p95LatencyMs: 0,
    maxLatencyMs: r.maxLatencyMs ?? 0,
    minLatencyMs: r.minLatencyMs ?? 0,
    totalDurationMs: r.totalDurationMs ?? 0,
  }));
}

/**
 * Get tool call timeline — raw tool calls ordered by time for latency distribution charts.
 */
export async function getToolCallTimeline(
  projectId: number,
  opts: {
    toolName?: string;
    from?: number;
    to?: number;
    limit?: number;
  } = {}
): Promise<Array<{
  id: number;
  toolName: string;
  toolSuccess: boolean | null;
  toolDurationMs: number | null;
  eventTimestamp: number;
  sessionId: string | null;
  agentType: string | null;
}>> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [
    eq(sessionEvents.projectId, projectId),
    sql`${sessionEvents.toolName} IS NOT NULL`,
  ];

  if (opts.toolName) conditions.push(eq(sessionEvents.toolName, opts.toolName));
  if (opts.from) conditions.push(gte(sessionEvents.eventTimestamp, opts.from));
  if (opts.to) conditions.push(lte(sessionEvents.eventTimestamp, opts.to));

  const rows = await db
    .select({
      id: sessionEvents.id,
      toolName: sessionEvents.toolName,
      toolSuccess: sessionEvents.toolSuccess,
      toolDurationMs: sessionEvents.toolDurationMs,
      eventTimestamp: sessionEvents.eventTimestamp,
      sessionExternalId: agentSessions.sessionId,
      agentType: agentSessions.agentType,
    })
    .from(sessionEvents)
    .leftJoin(agentSessions, eq(sessionEvents.sessionId, agentSessions.id))
    .where(and(...conditions))
    .orderBy(desc(sessionEvents.eventTimestamp))
    .limit(opts.limit ?? 200);

  return rows.map((r) => ({
    id: r.id,
    toolName: r.toolName || "unknown",
    toolSuccess: r.toolSuccess,
    toolDurationMs: r.toolDurationMs,
    eventTimestamp: r.eventTimestamp,
    sessionId: r.sessionExternalId,
    agentType: r.agentType,
  }));
}

/**
 * Get agent decision explainability — for a given session, extract decision events
 * and correlate them with the LLM calls and tool calls that preceded/followed them.
 */
export interface AgentDecisionExplanation {
  decisionId: number;
  sequenceNumber: number;
  timestamp: number;
  description: string;
  // Context: what happened before this decision
  precedingEvents: Array<{
    eventType: string;
    toolName?: string | null;
    model?: string | null;
    summary: string;
    timestamp: number;
  }>;
  // Consequence: what happened after this decision
  followingEvents: Array<{
    eventType: string;
    toolName?: string | null;
    model?: string | null;
    summary: string;
    timestamp: number;
  }>;
  // The LLM call that likely produced this decision (closest preceding llm_call)
  triggeringLlmCall?: {
    model: string | null;
    promptTokens: number | null;
    completionTokens: number | null;
    traceId: number | null;
  } | null;
}

export async function getAgentDecisions(
  projectId: number,
  sessionId: string,
  opts: { contextWindow?: number } = {}
): Promise<AgentDecisionExplanation[]> {
  const db = await getDb();
  if (!db) return [];

  const contextWindow = opts.contextWindow ?? 5; // events before/after

  // Find the session
  const [session] = await db
    .select()
    .from(agentSessions)
    .where(and(eq(agentSessions.projectId, projectId), eq(agentSessions.sessionId, sessionId)))
    .limit(1);

  if (!session) return [];

  // Get all events for this session
  const events = await db
    .select()
    .from(sessionEvents)
    .where(eq(sessionEvents.sessionId, session.id))
    .orderBy(asc(sessionEvents.sequenceNumber));

  const decisions: AgentDecisionExplanation[] = [];

  for (let i = 0; i < events.length; i++) {
    const e = events[i];

    // Look for decision events, tool_call events (tool selection is a decision),
    // and delegation events
    const isDecision = e.eventType === "decision" || e.eventType === "delegation";
    const isToolSelection = e.eventType === "tool_call";

    if (!isDecision && !isToolSelection) continue;

    const data = e.eventData as Record<string, unknown> | null;
    let description = "";

    if (e.eventType === "decision") {
      description = (data?.description as string) || "Agent made a decision";
    } else if (e.eventType === "delegation") {
      description = `Delegated to ${data?.target || "sub-agent"}`;
    } else if (e.eventType === "tool_call") {
      description = `Selected tool: ${e.toolName || "unknown"}`;
    }

    // Preceding events (context)
    const preceding = events
      .slice(Math.max(0, i - contextWindow), i)
      .map((pe) => ({
        eventType: pe.eventType,
        toolName: pe.toolName,
        model: pe.model,
        summary: summarizeEventForExplain(pe),
        timestamp: pe.eventTimestamp,
      }));

    // Following events (consequence)
    const following = events
      .slice(i + 1, Math.min(events.length, i + 1 + contextWindow))
      .map((fe) => ({
        eventType: fe.eventType,
        toolName: fe.toolName,
        model: fe.model,
        summary: summarizeEventForExplain(fe),
        timestamp: fe.eventTimestamp,
      }));

    // Find the closest preceding LLM call (the one that likely produced this decision)
    let triggeringLlmCall: AgentDecisionExplanation["triggeringLlmCall"] = null;
    for (let j = i - 1; j >= 0; j--) {
      if (events[j].eventType === "llm_call") {
        triggeringLlmCall = {
          model: events[j].model,
          promptTokens: events[j].promptTokens,
          completionTokens: events[j].completionTokens,
          traceId: events[j].traceId,
        };
        break;
      }
    }

    decisions.push({
      decisionId: e.id,
      sequenceNumber: e.sequenceNumber,
      timestamp: e.eventTimestamp,
      description,
      precedingEvents: preceding,
      followingEvents: following,
      triggeringLlmCall,
    });
  }

  return decisions;
}

function summarizeEventForExplain(e: any): string {
  const data = e.eventData as Record<string, unknown> | null;
  switch (e.eventType) {
    case "llm_call":
      return `LLM call (${e.model || "unknown"})`;
    case "tool_call":
      return `Called ${e.toolName || "unknown"}`;
    case "tool_result":
      return `Result from ${e.toolName || "unknown"}: ${e.toolSuccess ? "success" : "failure"}`;
    case "code_generated":
      return `Generated ${e.codeLanguage || ""} code`;
    case "code_executed":
      return `Executed code${e.codeFilePath ? ` (${e.codeFilePath})` : ""}`;
    case "decision":
      return `Decision: ${(data?.description as string)?.slice(0, 80) || ""}`;
    case "delegation":
      return `Delegated to ${data?.target || "sub-agent"}`;
    case "error":
      return `Error: ${(data?.message as string)?.slice(0, 80) || ""}`;
    default:
      return e.eventType;
  }
}
