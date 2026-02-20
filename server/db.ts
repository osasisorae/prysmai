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
  "gemini-2.0-flash": { input: 0.0001, output: 0.0004 },
  "gemini-1.5-pro": { input: 0.00125, output: 0.005 },
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
