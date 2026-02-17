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
    providerConfig: json("providerConfig").$type<{
      provider: string;
      baseUrl: string;
      defaultModel?: string;
      apiKeyEncrypted?: string;
    }>(),
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
