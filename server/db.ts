import { eq, desc, sql, and, isNull, gte, lte, like, or, asc, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users, waitlistSignups,
  organizations, InsertOrganization,
  projects, InsertProject,
  apiKeys, InsertApiKey,
  traces, InsertTrace,
  modelPricing,
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

export async function updateProject(id: number, data: Partial<{ name: string; providerConfig: any }>) {
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
const DEFAULT_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 0.0025, output: 0.01 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-4-turbo": { input: 0.01, output: 0.03 },
  "gpt-4": { input: 0.03, output: 0.06 },
  "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
  "claude-3-5-sonnet-20241022": { input: 0.003, output: 0.015 },
  "claude-3-5-haiku-20241022": { input: 0.0008, output: 0.004 },
  "claude-3-opus-20240229": { input: 0.015, output: 0.075 },
  // Google Gemini models (per 1K tokens, converted from per 1M)
  "gemini-2.5-pro": { input: 0.00125, output: 0.01 },
  "gemini-2.5-flash": { input: 0.0003, output: 0.0025 },
  "gemini-2.5-flash-lite": { input: 0.0001, output: 0.0004 },
  "gemini-2.0-flash": { input: 0.0001, output: 0.0004 },
  "gemini-2.0-flash-lite": { input: 0.000075, output: 0.0003 },
  "gemini-3-pro-preview": { input: 0.002, output: 0.012 },
  "gemini-3-flash-preview": { input: 0.0005, output: 0.003 },
  "gemini-3.1-pro-preview": { input: 0.002, output: 0.012 },
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

import { metrics, InsertMetric, usageRecords, alertConfigs, InsertAlertConfig, orgMembers, InsertOrgMember } from "../drizzle/schema";

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
 * Check if org has exceeded free tier limit (10K requests/month).
 * Returns { allowed: boolean, currentCount: number, limit: number }
 */
export async function checkUsageLimit(orgId: number, plan: string = "free") {
  const limits: Record<string, number> = {
    free: 10000,
    pro: 100000,
    team: 500000,
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
