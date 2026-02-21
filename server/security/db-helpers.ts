/**
 * Security DB Helpers
 * 
 * CRUD operations for security_configs and security_events tables.
 */

import { getDb } from "../db";
import { securityConfigs, securityEvents } from "../../drizzle/schema";
import { eq, desc, and, gte, sql, count } from "drizzle-orm";

// ─── Security Config CRUD ───────────────────────────────────────────

export async function getSecurityConfigForProject(projectId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(securityConfigs)
    .where(eq(securityConfigs.projectId, projectId))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertSecurityConfig(
  projectId: number,
  config: {
    injectionDetection?: boolean;
    piiDetection?: boolean;
    piiRedactionMode?: "none" | "mask" | "hash" | "block";
    contentPolicyEnabled?: boolean;
    blockHighThreats?: boolean;
    customKeywords?: string[];
    customPolicies?: any[];
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getSecurityConfigForProject(projectId);

  if (existing) {
    await db
      .update(securityConfigs)
      .set({
        ...config,
        customKeywords: config.customKeywords !== undefined ? config.customKeywords : undefined,
        customPolicies: config.customPolicies !== undefined ? config.customPolicies : undefined,
        updatedAt: new Date(),
      })
      .where(eq(securityConfigs.id, existing.id));
    return { ...existing, ...config };
  } else {
    const result = await db.insert(securityConfigs).values({
      projectId,
      injectionDetection: config.injectionDetection ?? true,
      piiDetection: config.piiDetection ?? true,
      piiRedactionMode: config.piiRedactionMode ?? "none",
      contentPolicyEnabled: config.contentPolicyEnabled ?? true,
      blockHighThreats: config.blockHighThreats ?? false,
      customKeywords: config.customKeywords ?? [],
      customPolicies: config.customPolicies ?? [],
    });
    return { id: Number((result as any)[0]?.insertId), projectId, ...config };
  }
}

// ─── Security Events Queries ────────────────────────────────────────

export async function getSecurityEvents(
  projectId: number,
  options: {
    limit?: number;
    offset?: number;
    threatLevel?: string;
    since?: Date;
  } = {}
) {
  const db = await getDb();
  if (!db) return [];

  const { limit = 50, offset = 0, threatLevel, since } = options;

  const conditions = [eq(securityEvents.projectId, projectId)];
  if (threatLevel) {
    conditions.push(eq(securityEvents.threatLevel, threatLevel as any));
  }
  if (since) {
    conditions.push(gte(securityEvents.timestamp, since));
  }

  return await db
    .select()
    .from(securityEvents)
    .where(and(...conditions))
    .orderBy(desc(securityEvents.timestamp))
    .limit(limit)
    .offset(offset);
}

export async function getSecurityStats(projectId: number, since?: Date) {
  const db = await getDb();
  if (!db) return { total: 0, clean: 0, low: 0, medium: 0, high: 0, blocked: 0 };

  const conditions = [eq(securityEvents.projectId, projectId)];
  if (since) {
    conditions.push(gte(securityEvents.timestamp, since));
  }

  const rows = await db
    .select({
      threatLevel: securityEvents.threatLevel,
      action: securityEvents.action,
      count: count(),
    })
    .from(securityEvents)
    .where(and(...conditions))
    .groupBy(securityEvents.threatLevel, securityEvents.action);

  const stats = { total: 0, clean: 0, low: 0, medium: 0, high: 0, blocked: 0 };
  for (const row of rows) {
    const c = Number(row.count);
    stats.total += c;
    if (row.threatLevel === "clean") stats.clean += c;
    if (row.threatLevel === "low") stats.low += c;
    if (row.threatLevel === "medium") stats.medium += c;
    if (row.threatLevel === "high") stats.high += c;
    if (row.action === "block") stats.blocked += c;
  }
  return stats;
}

export async function getSecurityTimeline(projectId: number, days: number = 7) {
  const db = await getDb();
  if (!db) return [];

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      date: sql<string>`DATE(${securityEvents.timestamp})`.as("date"),
      threatLevel: securityEvents.threatLevel,
      count: count(),
    })
    .from(securityEvents)
    .where(and(
      eq(securityEvents.projectId, projectId),
      gte(securityEvents.timestamp, since)
    ))
    .groupBy(sql`DATE(${securityEvents.timestamp})`, securityEvents.threatLevel)
    .orderBy(sql`DATE(${securityEvents.timestamp})`);

  return rows;
}

export async function getTopInjectionPatterns(projectId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  // Get recent injection events and aggregate pattern matches
  const events = await db
    .select({
      injectionMatches: securityEvents.injectionMatches,
    })
    .from(securityEvents)
    .where(and(
      eq(securityEvents.projectId, projectId),
      gte(securityEvents.injectionScore, 1)
    ))
    .orderBy(desc(securityEvents.timestamp))
    .limit(100);

  // Aggregate pattern names
  const patternCounts = new Map<string, number>();
  for (const event of events) {
    const matches = event.injectionMatches as any[];
    if (!matches) continue;
    for (const match of matches) {
      const name = match.patternName ?? match.category ?? "unknown";
      patternCounts.set(name, (patternCounts.get(name) ?? 0) + 1);
    }
  }

  return Array.from(patternCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
