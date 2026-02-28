import {
  bigint,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  index,
  uniqueIndex,
  boolean,
} from "drizzle-orm/mysql-core";

// ─── Users (existing, extended) ───

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  orgId: int("orgId"),
  onboarded: boolean("onboarded").default(false),
  resetToken: varchar("resetToken", { length: 128 }),
  resetTokenExpires: timestamp("resetTokenExpires"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Waitlist (existing) ───

export const waitlistSignups = mysqlTable("waitlist_signups", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  source: varchar("source", { length: 64 }).default("landing_page"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  inviteToken: varchar("inviteToken", { length: 128 }),
  inviteSentAt: timestamp("inviteSentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WaitlistSignup = typeof waitlistSignups.$inferSelect;
export type InsertWaitlistSignup = typeof waitlistSignups.$inferInsert;

// ─── Organizations ───

export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  plan: mysqlEnum("plan", ["free", "pro", "team", "enterprise"]).default("free").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  ownerId: int("ownerId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

// ─── Projects ───

export const projects = mysqlTable(
  "projects",
  {
    id: int("id").autoincrement().primaryKey(),
    orgId: int("orgId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    // Provider configuration: provider name, base URL, default model, encrypted upstream API key
    // LEGACY — kept for backward compat. New multi-provider routing uses providerKeys.
    providerConfig: json("providerConfig").$type<{
      provider: string;
      baseUrl: string;
      defaultModel?: string;
      apiKeyEncrypted?: string;
    }>(),
    // Multi-provider keys: one project can connect to multiple providers
    // { openai: { apiKey, baseUrl? }, anthropic: { apiKey, baseUrl? }, google: { apiKey, baseUrl? }, ... }
    providerKeys: json("providerKeys").$type<Record<string, { apiKey: string; baseUrl?: string }>>(),
    // Default provider when model name is ambiguous or unknown
    defaultProvider: varchar("defaultProvider", { length: 32 }),
    // Explainability (Layer 3a)
    explainabilityEnabled: boolean("explainabilityEnabled").default(true),
    logprobsInjection: mysqlEnum("logprobsInjection", ["always", "never", "sample"]).default("always"),
    logprobsSampleRate: decimal("logprobsSampleRate", { precision: 3, scale: 2 }).default("1.00"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("projects_org_slug_idx").on(table.orgId, table.slug),
  ]
);

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// ─── API Keys ───

export const apiKeys = mysqlTable(
  "api_keys",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    keyHash: varchar("keyHash", { length: 64 }).notNull(), // SHA-256 hash
    keyPrefix: varchar("keyPrefix", { length: 24 }).notNull(), // "sk-prysm-abc..." for display
    name: varchar("name", { length: 255 }),
    lastUsedAt: timestamp("lastUsedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    revokedAt: timestamp("revokedAt"),
  },
  (table) => [
    index("apikeys_project_idx").on(table.projectId),
    index("apikeys_hash_idx").on(table.keyHash),
  ]
);

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

// ─── Traces (LLM request/response records) ───

export const traces = mysqlTable(
  "traces",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    traceId: varchar("traceId", { length: 64 }).notNull(), // UUID string for external reference
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    // Request details
    model: varchar("model", { length: 128 }).notNull(),
    provider: varchar("provider", { length: 64 }).notNull(),
    promptMessages: json("promptMessages").$type<Array<{ role: string; content: string }>>(),
    // Response details
    completion: text("completion"),
    finishReason: varchar("finishReason", { length: 32 }),
    // Metrics
    status: mysqlEnum("status", ["success", "error", "timeout"]).default("success").notNull(),
    statusCode: int("statusCode"),
    errorMessage: text("errorMessage"),
    latencyMs: int("latencyMs"), // total round-trip
    ttftMs: int("ttftMs"), // time to first token (streaming)
    promptTokens: int("promptTokens").default(0),
    completionTokens: int("completionTokens").default(0),
    totalTokens: int("totalTokens").default(0),
    costUsd: decimal("costUsd", { precision: 12, scale: 6 }).default("0"),
    // Context
    temperature: decimal("temperature", { precision: 4, scale: 3 }),
    maxTokens: int("maxTokens"),
    topP: decimal("topP", { precision: 4, scale: 3 }),
    isStreaming: boolean("isStreaming").default(false),
    // Tool calls and logprobs
    toolCalls: json("toolCalls").$type<Array<{ id: string; type: string; function: { name: string; arguments: string } }>>(),
    logprobs: json("logprobs").$type<Record<string, unknown>>(),
    // Explainability (Layer 3a)
    confidenceAnalysis: json("confidenceAnalysis").$type<Record<string, unknown>>(),
    // User-provided metadata
    endUserId: varchar("endUserId", { length: 255 }),
    sessionId: varchar("sessionId", { length: 255 }),
    metadata: json("metadata").$type<Record<string, unknown>>(),
  },
  (table) => [
    index("traces_project_ts_idx").on(table.projectId, table.timestamp),
    index("traces_project_model_idx").on(table.projectId, table.model),
    index("traces_project_status_idx").on(table.projectId, table.status),
    index("traces_traceid_idx").on(table.traceId),
  ]
);

export type Trace = typeof traces.$inferSelect;
export type InsertTrace = typeof traces.$inferInsert;

// ─── Model Pricing (for cost calculation) ───

export const modelPricing = mysqlTable(
  "model_pricing",
  {
    id: int("id").autoincrement().primaryKey(),
    provider: varchar("provider", { length: 64 }).notNull(),
    model: varchar("model", { length: 128 }).notNull(),
    inputCostPer1k: decimal("inputCostPer1k", { precision: 10, scale: 6 }).notNull(),
    outputCostPer1k: decimal("outputCostPer1k", { precision: 10, scale: 6 }).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("pricing_provider_model_idx").on(table.provider, table.model),
  ]
);

export type ModelPricing = typeof modelPricing.$inferSelect;
export type InsertModelPricing = typeof modelPricing.$inferInsert;

// ─── Pre-aggregated Metrics ───

export const metrics = mysqlTable(
  "metrics",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    bucket: timestamp("bucket").notNull(), // start of the time bucket
    bucketSize: mysqlEnum("bucketSize", ["1m", "1h", "1d"]).notNull(),
    model: varchar("model", { length: 128 }), // null = all models combined
    requestCount: int("requestCount").default(0).notNull(),
    errorCount: int("errorCount").default(0).notNull(),
    totalTokens: bigint("totalTokens", { mode: "number" }).default(0).notNull(),
    totalPromptTokens: bigint("totalPromptTokens", { mode: "number" }).default(0).notNull(),
    totalCompletionTokens: bigint("totalCompletionTokens", { mode: "number" }).default(0).notNull(),
    totalCostUsd: decimal("totalCostUsd", { precision: 14, scale: 8 }).default("0").notNull(),
    latencyP50: int("latencyP50"),
    latencyP95: int("latencyP95"),
    latencyP99: int("latencyP99"),
    ttftP50: int("ttftP50"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("metrics_project_bucket_idx").on(table.projectId, table.bucketSize, table.bucket),
    uniqueIndex("metrics_unique_idx").on(table.projectId, table.bucket, table.bucketSize, table.model),
  ]
);

export type Metric = typeof metrics.$inferSelect;
export type InsertMetric = typeof metrics.$inferInsert;

// ─── Alert Configurations ───

export const alertConfigs = mysqlTable(
  "alert_configs",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    // What to monitor: error_rate, latency_p95, cost_per_hour, request_count
    metric: varchar("metric", { length: 64 }).notNull(),
    // Condition: gt (greater than), lt (less than), gte, lte
    condition: varchar("condition", { length: 16 }).notNull(),
    threshold: decimal("threshold", { precision: 14, scale: 6 }).notNull(),
    // Evaluation window in minutes (e.g., 5 = check last 5 minutes)
    windowMinutes: int("windowMinutes").default(5).notNull(),
    // Notification channels: array of { type: "email"|"slack"|"discord"|"webhook", target: string }
    channels: json("channels").$type<Array<{ type: string; target: string }>>().notNull(),
    // Cooldown: minimum minutes between alerts to prevent spam
    cooldownMinutes: int("cooldownMinutes").default(60).notNull(),
    lastTriggeredAt: timestamp("lastTriggeredAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("alerts_project_idx").on(table.projectId),
  ]
);

export type AlertConfig = typeof alertConfigs.$inferSelect;
export type InsertAlertConfig = typeof alertConfigs.$inferInsert;

// ─── Usage Records (billing/metering) ───

export const usageRecords = mysqlTable(
  "usage_records",
  {
    id: int("id").autoincrement().primaryKey(),
    orgId: int("orgId").notNull(),
    projectId: int("projectId").notNull(),
    periodStart: timestamp("periodStart").notNull(), // start of billing period (1st of month)
    periodEnd: timestamp("periodEnd").notNull(), // end of billing period
    requestCount: int("requestCount").default(0).notNull(),
    totalTokens: bigint("totalTokens", { mode: "number" }).default(0).notNull(),
    totalCostUsd: decimal("totalCostUsd", { precision: 14, scale: 8 }).default("0").notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("usage_org_project_period_idx").on(table.orgId, table.projectId, table.periodStart),
  ]
);

export type UsageRecord = typeof usageRecords.$inferSelect;
export type InsertUsageRecord = typeof usageRecords.$inferInsert;

// ─── Organization Members ───

export const orgMembers = mysqlTable(
  "org_members",
  {
    id: int("id").autoincrement().primaryKey(),
    orgId: int("orgId").notNull(),
    userId: int("userId"), // null until invite is accepted
    email: varchar("email", { length: 320 }).notNull(), // email of invited member
    role: mysqlEnum("role", ["owner", "admin", "member", "viewer"]).default("member").notNull(),
    status: mysqlEnum("status", ["pending", "active", "removed"]).default("pending").notNull(),
    inviteToken: varchar("inviteToken", { length: 128 }),
    invitedBy: int("invitedBy"),
    invitedAt: timestamp("invitedAt").defaultNow().notNull(),
    joinedAt: timestamp("joinedAt"),
  },
  (table) => [
    index("orgmembers_org_idx").on(table.orgId),
    index("orgmembers_user_idx").on(table.userId),
    uniqueIndex("orgmembers_org_email_idx").on(table.orgId, table.email),
  ]
);

export type OrgMember = typeof orgMembers.$inferSelect;
export type InsertOrgMember = typeof orgMembers.$inferInsert;

// ─── Security Events (threat detection log) ───

export const securityEvents = mysqlTable(
  "security_events",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    traceId: varchar("traceId", { length: 64 }),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    // Threat assessment
    threatScore: int("threatScore").notNull(),
    threatLevel: mysqlEnum("threatLevel", ["clean", "low", "medium", "high"]).notNull(),
    action: mysqlEnum("action", ["pass", "log", "warn", "block"]).notNull(),
    summary: text("summary"),
    // Source: input (prompt) or output (completion)
    source: mysqlEnum("source", ["input", "output"]).default("input").notNull(),
    // Breakdown scores
    injectionScore: int("injectionScore").default(0),
    piiScore: int("piiScore").default(0),
    policyScore: int("policyScore").default(0),
    toxicityScore: int("toxicityScore").default(0),
    // Details (JSON for flexibility)
    injectionMatches: json("injectionMatches").$type<Array<{ patternName: string; category: string; severity: number }>>(),
    piiTypes: json("piiTypes").$type<string[]>(),
    policyViolations: json("policyViolations").$type<string[]>(),
    toxicityCategories: json("toxicityCategories").$type<string[]>(),
    // Context
    model: varchar("model", { length: 128 }),
    inputPreview: text("inputPreview"), // first 200 chars of the prompt
    outputPreview: text("outputPreview"), // first 200 chars of the completion (for output events)
    processingTimeMs: int("processingTimeMs"),
  },
  (table) => [
    index("secevents_project_ts_idx").on(table.projectId, table.timestamp),
    index("secevents_project_level_idx").on(table.projectId, table.threatLevel),
    index("secevents_trace_idx").on(table.traceId),
  ]
);

export type SecurityEvent = typeof securityEvents.$inferSelect;
export type InsertSecurityEvent = typeof securityEvents.$inferInsert;

// ─── Security Config (per-project security settings) ───

export const securityConfigs = mysqlTable(
  "security_configs",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull().unique(),
    // Feature toggles
    injectionDetection: boolean("injectionDetection").default(true).notNull(),
    piiDetection: boolean("piiDetection").default(true).notNull(),
    piiRedactionMode: mysqlEnum("piiRedactionMode", ["none", "mask", "hash", "block"]).default("none").notNull(),
    contentPolicyEnabled: boolean("contentPolicyEnabled").default(true).notNull(),
    blockHighThreats: boolean("blockHighThreats").default(false).notNull(),
    // Output scanning
    outputScanning: boolean("outputScanning").default(false).notNull(),
    outputPiiDetection: boolean("outputPiiDetection").default(true).notNull(),
    outputToxicityDetection: boolean("outputToxicityDetection").default(true).notNull(),
    outputBlockThreats: boolean("outputBlockThreats").default(false).notNull(),
    // Per-category thresholds (JSON: { category: { threshold: number, action: "pass"|"log"|"warn"|"block" } })
    categoryThresholds: json("categoryThresholds").$type<Record<string, { threshold: number; action: string }>>(),
    // Custom rules
    customKeywords: json("customKeywords").$type<string[]>(),
    customPolicies: json("customPolicies").$type<Array<{ name: string; type: string; pattern: string; severity: number; action: string; description: string }>>(),
    // Timestamps
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  }
);

export type SecurityConfig = typeof securityConfigs.$inferSelect;
export type InsertSecurityConfig = typeof securityConfigs.$inferInsert;

// ─── Explainability Reports (Layer 3a) ───

export const explainabilityReports = mysqlTable(
  "explainability_reports",
  {
    id: int("id").autoincrement().primaryKey(),
    traceId: int("traceId").notNull(),
    projectId: int("projectId").notNull(),
    reportType: mysqlEnum("reportType", ["logprobs", "estimated", "sae"]).notNull(),
    explanation: text("explanation").notNull(),
    highlights: json("highlights").$type<Array<{ tokenIdx: number; annotation: string; color: string }>>(),
    modelUsed: varchar("modelUsed", { length: 128 }),
    tokensUsed: int("tokensUsed"),
    cost: decimal("cost", { precision: 10, scale: 6 }),
    generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  },
  (table) => [
    index("expl_project_idx").on(table.projectId),
    uniqueIndex("expl_trace_idx").on(table.traceId),
  ]
);

export type ExplainabilityReport = typeof explainabilityReports.$inferSelect;
export type InsertExplainabilityReport = typeof explainabilityReports.$inferInsert;

// ─── Recommendations (Direction 2: Automated Recommendations Engine) ───

export const recommendations = mysqlTable(
  "recommendations",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    detectorId: varchar("detectorId", { length: 64 }).notNull(), // e.g., "LOW_CONFIDENCE"
    severity: mysqlEnum("severity", ["critical", "warning", "info"]).notNull(),
    headline: varchar("headline", { length: 512 }).notNull(),
    problem: text("problem").notNull(), // LLM-generated problem description
    rootCause: text("rootCause").notNull(), // LLM-generated root cause
    evidence: json("evidence").$type<{
      metric: string;
      value: number;
      threshold: number;
      affectedTraces: number;
      totalTraces: number;
      sampleTraceIds: number[];
    }>().notNull(),
    status: mysqlEnum("status", ["active", "dismissed", "resolved"]).default("active").notNull(),
    generatedAt: timestamp("generatedAt").defaultNow().notNull(),
    dismissedAt: timestamp("dismissedAt"),
    resolvedAt: timestamp("resolvedAt"),
  },
  (table) => [
    index("rec_project_idx").on(table.projectId),
    index("rec_status_idx").on(table.projectId, table.status),
  ]
);

export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = typeof recommendations.$inferInsert;

// ─── Playbooks (Direction 3: Improvement Playbooks) ───

export const playbooks = mysqlTable(
  "playbooks",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    recommendationId: int("recommendationId").notNull(), // links to triggering recommendation
    title: varchar("title", { length: 256 }).notNull(),
    priority: mysqlEnum("priority", ["p1", "p2", "p3"]).notNull(),
    status: mysqlEnum("status", ["not_started", "in_progress", "resolved"]).default("not_started").notNull(),
    problem: text("problem").notNull(), // full problem statement
    rootCause: text("rootCause").notNull(), // full root cause analysis
    verification: text("verification").notNull(), // how to verify the fix
    // Snapshot of metrics at creation time (for before/after comparison)
    baselineMetrics: json("baselineMetrics").$type<{
      avgConfidence: number;
      hallucinationRate: number;
      avgLatency: number;
      traceCount: number;
    }>().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("pb_project_idx").on(table.projectId),
    index("pb_status_idx").on(table.projectId, table.status),
  ]
);

export type Playbook = typeof playbooks.$inferSelect;
export type InsertPlaybook = typeof playbooks.$inferInsert;

// ─── Playbook Steps ───

export const playbookSteps = mysqlTable(
  "playbook_steps",
  {
    id: int("id").autoincrement().primaryKey(),
    playbookId: int("playbookId").notNull(),
    stepOrder: int("stepOrder").notNull(),
    title: varchar("title", { length: 256 }).notNull(),
    description: text("description").notNull(), // detailed instruction
    codeExample: text("codeExample"), // optional code/config snippet
    expectedImpact: varchar("expectedImpact", { length: 256 }), // e.g., "Should improve confidence by ~15%"
    completed: boolean("completed").default(false).notNull(),
    completedAt: timestamp("completedAt"),
  },
  (table) => [
    index("ps_playbook_idx").on(table.playbookId),
  ]
);

export type PlaybookStep = typeof playbookSteps.$inferSelect;
export type InsertPlaybookStep = typeof playbookSteps.$inferInsert;

// ─── Recommendation Snapshots (periodic metrics for before/after comparison) ───

export const recommendationSnapshots = mysqlTable(
  "recommendation_snapshots",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    playbookId: int("playbookId"), // optional link to specific playbook
    avgConfidence: decimal("avgConfidence", { precision: 5, scale: 4 }),
    hallucinationRate: decimal("hallucinationRate", { precision: 5, scale: 4 }),
    avgLatency: int("avgLatency"),
    traceCount: int("traceCount"),
    snapshotAt: timestamp("snapshotAt").defaultNow().notNull(),
  },
  (table) => [
    index("snap_project_idx").on(table.projectId, table.snapshotAt),
  ]
);

export type RecommendationSnapshot = typeof recommendationSnapshots.$inferSelect;
export type InsertRecommendationSnapshot = typeof recommendationSnapshots.$inferInsert;
