/**
 * Security Proxy Middleware
 * 
 * Integrates threat assessment into the proxy pipeline.
 * Runs on every incoming request before forwarding to upstream.
 * 
 * Flow:
 * 1. Extract prompt text from request body
 * 2. Load project security config (with caching)
 * 3. Run rule-based threat assessment (all tiers)
 * 4. Run LLM deep scan (paid tiers only: Pro/Team/Enterprise)
 * 5. Merge results and determine final action
 * 6. Log security event to DB (including LLM scan data)
 * 7. Block if threat level is high and blocking is enabled
 * 8. Add security headers to response
 */

import { Request, Response, NextFunction } from "express";
import { assessThreat, type SecurityConfig, type ThreatAssessment } from "./threat-scorer";
import { deepScanPrompt, mergeScanResults, createSkippedResult, isPaidPlan, type LLMScanResult } from "./llm-scanner";
import { getDb } from "../db";
import { securityEvents, securityConfigs } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Config Cache (5-minute TTL) ────────────────────────────────────

const configCache = new Map<number, { config: Partial<SecurityConfig>; expiry: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getSecurityConfig(projectId: number): Promise<Partial<SecurityConfig>> {
  const cached = configCache.get(projectId);
  if (cached && Date.now() < cached.expiry) {
    return cached.config;
  }

  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const rows = await db
      .select()
      .from(securityConfigs)
      .where(eq(securityConfigs.projectId, projectId))
      .limit(1);

    if (rows.length === 0) {
      // No config = use defaults (all detection enabled, no blocking)
      const defaultConfig: Partial<SecurityConfig> = {};
      configCache.set(projectId, { config: defaultConfig, expiry: Date.now() + CACHE_TTL_MS });
      return defaultConfig;
    }

    const row = rows[0];
    const config: Partial<SecurityConfig> = {
      injectionDetection: row.injectionDetection,
      piiDetection: row.piiDetection,
      piiRedactionMode: row.piiRedactionMode as any,
      blockHighThreats: row.blockHighThreats,
      customKeywords: (row.customKeywords as string[]) ?? [],
    };

    // Merge custom policies if present
    if (row.customPolicies && Array.isArray(row.customPolicies)) {
      config.contentPolicies = [
        ...require("./threat-scorer").DEFAULT_CONTENT_POLICIES,
        ...row.customPolicies.map((p: any) => ({
          name: p.name,
          type: p.type as "keyword" | "regex" | "topic",
          pattern: p.pattern,
          severity: p.severity,
          action: p.action as "flag" | "block",
          description: p.description,
        })),
      ];
    }

    configCache.set(projectId, { config, expiry: Date.now() + CACHE_TTL_MS });
    return config;
  } catch (err) {
    console.error("[Security] Failed to load config for project", projectId, err);
    return {};
  }
}

// ─── Extract prompt text from request body ──────────────────────────

function extractPromptText(body: any): string {
  if (!body) return "";

  // Chat completions format
  if (body.messages && Array.isArray(body.messages)) {
    return body.messages
      .map((m: any) => {
        if (typeof m.content === "string") return m.content;
        if (Array.isArray(m.content)) {
          return m.content
            .filter((c: any) => c.type === "text")
            .map((c: any) => c.text)
            .join(" ");
        }
        return "";
      })
      .join("\n");
  }

  // Legacy completions format
  if (body.prompt) {
    return typeof body.prompt === "string" ? body.prompt : body.prompt.join("\n");
  }

  // Embeddings format
  if (body.input) {
    return typeof body.input === "string" ? body.input : body.input.join("\n");
  }

  return "";
}

// ─── Log security event to DB ───────────────────────────────────────

async function logSecurityEvent(
  projectId: number,
  traceId: string | undefined,
  model: string,
  assessment: ThreatAssessment,
  inputText: string,
  llmResult?: LLMScanResult,
  orgPlan?: string
): Promise<void> {
  try {
    // Only log non-clean events to save DB space
    // BUT always log if LLM scan found something interesting
    const llmFoundThreat = llmResult?.scanned && llmResult.classification !== "safe";
    if (assessment.threatLevel === "clean" && !llmFoundThreat) return;

    const db = await getDb();
    if (!db) return;
    await db.insert(securityEvents).values({
      projectId,
      traceId,
      threatScore: assessment.threatScore,
      threatLevel: assessment.threatLevel,
      action: assessment.action,
      summary: assessment.summary,
      injectionScore: assessment.injectionScore,
      piiScore: assessment.piiScore,
      policyScore: assessment.policyScore,
      injectionMatches: assessment.injectionResult?.matches?.map((m) => ({
        patternName: m.patternName,
        category: m.category,
        severity: m.severity,
      })) ?? null,
      piiTypes: assessment.piiResult?.types ?? null,
      policyViolations: assessment.policyMatches?.map((m) => m.ruleName) ?? null,
      model,
      inputPreview: inputText.substring(0, 200),
      processingTimeMs: assessment.processingTimeMs,
      // LLM scan fields
      llmScanned: llmResult?.scanned ?? false,
      llmClassification: llmResult?.scanned ? llmResult.classification : null,
      llmConfidence: llmResult?.scanned ? llmResult.confidence.toFixed(2) : null,
      llmThreatScore: llmResult?.scanned ? llmResult.threatScore : null,
      llmAttackCategories: llmResult?.scanned && llmResult.attackCategories.length > 0
        ? llmResult.attackCategories : null,
      llmExplanation: llmResult?.scanned ? llmResult.explanation : null,
      llmIsJailbreak: llmResult?.scanned ? llmResult.isJailbreak : null,
      llmIsObfuscatedInjection: llmResult?.scanned ? llmResult.isObfuscatedInjection : null,
      llmIsDataExfiltration: llmResult?.scanned ? llmResult.isDataExfiltration : null,
      scanTier: (orgPlan as any) ?? "free",
    });
  } catch (err) {
    console.error("[Security] Failed to log security event:", err);
  }
}

// ─── Enhanced Assessment (rule-based + optional LLM) ────────────────

export interface EnhancedThreatAssessment extends ThreatAssessment {
  llmResult?: LLMScanResult;
  scanTier: string;
  llmEnhanced: boolean;
}

/**
 * Run tiered security assessment:
 * - Free tier: rule-based only (fast, zero cost)
 * - Paid tiers: rule-based + LLM deep scan (thorough)
 */
async function tieredAssessment(
  promptText: string,
  config: Partial<SecurityConfig>,
  orgPlan: string
): Promise<EnhancedThreatAssessment> {
  // Step 1: Always run rule-based assessment (all tiers)
  const ruleAssessment = assessThreat(promptText, config);

  // Step 2: For paid tiers, also run LLM deep scan
  let llmResult: LLMScanResult;
  if (isPaidPlan(orgPlan)) {
    // Run LLM scan in parallel-safe manner
    // Don't let LLM scan failure block the request
    llmResult = await deepScanPrompt(promptText);
  } else {
    llmResult = createSkippedResult();
  }

  // Step 3: Merge results if LLM scan was performed
  const merged = mergeScanResults(ruleAssessment.threatScore, llmResult);

  // If LLM enhanced the score, update the assessment
  const finalScore = merged.finalScore;
  const threatLevel = finalScore <= 20 ? "clean" as const
    : finalScore <= 50 ? "low" as const
    : finalScore <= 75 ? "medium" as const
    : "high" as const;

  // Determine action based on merged score
  const hasBlockPolicy = ruleAssessment.policyMatches.some((m) => m.action === "block");
  let action: "pass" | "log" | "warn" | "block" = "pass";
  if (hasBlockPolicy) action = "block";
  else if (threatLevel === "low") action = "log";
  else if (threatLevel === "medium") action = "warn";
  else if (threatLevel === "high") action = config.blockHighThreats ? "block" : "warn";

  // Build enhanced summary
  let summary = ruleAssessment.summary;
  if (merged.llmEnhanced && llmResult.classification !== "safe") {
    summary = `${summary}; LLM analysis: ${merged.combinedExplanation}`;
  }

  return {
    ...ruleAssessment,
    threatScore: finalScore,
    threatLevel,
    action,
    summary,
    processingTimeMs: ruleAssessment.processingTimeMs + (llmResult.processingTimeMs ?? 0),
    llmResult,
    scanTier: orgPlan,
    llmEnhanced: merged.llmEnhanced,
  };
}

// ─── Middleware ──────────────────────────────────────────────────────

/**
 * Security middleware for the proxy.
 * Attaches `req.securityAssessment` for downstream handlers.
 */
export async function securityMiddleware(
  req: Request & { securityAssessment?: ThreatAssessment; securityProjectId?: number },
  res: Response,
  next: NextFunction
): Promise<void> {
  // Skip if no project ID is set (auth hasn't run yet)
  const projectId = (req as any).__prysm_projectId;
  if (!projectId) {
    next();
    return;
  }

  try {
    const config = await getSecurityConfig(projectId);
    const promptText = extractPromptText(req.body);

    // Skip empty prompts
    if (!promptText.trim()) {
      next();
      return;
    }

    const assessment = assessThreat(promptText, config);

    // Attach to request for downstream use
    req.securityAssessment = assessment;
    req.securityProjectId = projectId;

    // Add security headers
    res.set("X-Prysm-Threat-Score", assessment.threatScore.toString());
    res.set("X-Prysm-Threat-Level", assessment.threatLevel);

    // Log event asynchronously
    const model = req.body?.model ?? "unknown";
    logSecurityEvent(projectId, undefined, model, assessment, promptText).catch(console.error);

    // Block if action is "block"
    if (assessment.action === "block") {
      res.status(403).json({
        error: {
          message: "Request blocked by security policy",
          type: "security_error",
          threat_level: assessment.threatLevel,
          threat_score: assessment.threatScore,
          details: assessment.summary,
        },
      });
      return;
    }

    next();
  } catch (err) {
    // Security should never block the request on internal errors
    console.error("[Security] Middleware error:", err);
    next();
  }
}

/**
 * Standalone function to run tiered security assessment on a request body.
 * Used by handlers that need to assess after auth but before forwarding.
 * 
 * @param projectId - The project ID for config lookup
 * @param body - The request body to analyze
 * @param orgPlan - The org's subscription plan (determines scan tier)
 * @param traceId - Optional trace ID for correlation
 */
export async function assessRequest(
  projectId: number,
  body: any,
  orgPlan: string = "free",
  traceId?: string
): Promise<EnhancedThreatAssessment | null> {
  try {
    const config = await getSecurityConfig(projectId);
    const promptText = extractPromptText(body);
    if (!promptText.trim()) return null;

    const assessment = await tieredAssessment(promptText, config, orgPlan);
    const model = body?.model ?? "unknown";

    // Log asynchronously (includes LLM scan data)
    logSecurityEvent(
      projectId,
      traceId,
      model,
      assessment,
      promptText,
      assessment.llmResult,
      orgPlan
    ).catch(console.error);

    return assessment;
  } catch (err) {
    console.error("[Security] Assessment error:", err);
    return null;
  }
}

// Export for testing
export { extractPromptText, getSecurityConfig, logSecurityEvent, configCache, tieredAssessment };
