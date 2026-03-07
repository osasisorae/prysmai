/**
 * MCP Resource Handlers
 *
 * Exposes read-only resources that MCP clients can query:
 *   prysm://policies          — Active governance policies for the project
 *   prysm://session/{id}/status — Current status and behavioral flags for a session
 *   prysm://session/{id}/report — Full governance report for a completed session
 *   prysm://models             — Supported LLM models
 */

import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  getActivePolicies,
  getSessionByExternalId,
  getAssessmentsForSession,
  getViolationsForSession,
  getSessionEvents,
} from "./session-manager";
import { getSupportedModels } from "../provider-router";

/**
 * Register all MCP resource handlers on the server.
 * The projectId is resolved from the authenticated context.
 */
export function registerResources(server: Server, getProjectId: () => number | null): void {
  // List available resources
  server.setRequestHandler(
    ListResourcesRequestSchema,
    async () => {
      return {
        resources: [
          {
            uri: "prysm://policies",
            name: "Governance Policies",
            description: "Active governance policies for the authenticated project",
            mimeType: "application/json",
          },
          {
            uri: "prysm://models",
            name: "Supported Models",
            description: "List of supported LLM models",
            mimeType: "application/json",
          },
        ],
      };
    }
  );

  // Read a specific resource
  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (request: any) => {
      const uri = request.params?.uri as string;
      const projectId = getProjectId();

      if (!projectId) {
        throw new Error("Not authenticated");
      }

      if (uri === "prysm://policies") {
        const policies = await getActivePolicies(projectId);
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(
                policies.map((p) => ({
                  id: p.id,
                  name: p.name,
                  type: p.policyType,
                  enforcement: p.enforcement,
                  rules: p.rules,
                })),
                null,
                2
              ),
            },
          ],
        };
      }

      if (uri === "prysm://models") {
        const models = getSupportedModels();
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(models, null, 2),
            },
          ],
        };
      }

      // Dynamic session resources: prysm://session/{sessionId}/status
      const statusMatch = uri.match(/^prysm:\/\/session\/([^/]+)\/status$/);
      if (statusMatch) {
        const sessionId = statusMatch[1];
        const session = await getSessionByExternalId(projectId, sessionId);
        if (!session) {
          throw new Error(`Session ${sessionId} not found`);
        }

        const events = await getSessionEvents(session.id, { limit: 10 });
        const assessments = await getAssessmentsForSession(session.id);

        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(
                {
                  sessionId: session.sessionId,
                  status: session.status,
                  agentType: session.agentType,
                  startedAt: session.startedAt,
                  totalEvents: session.totalEvents,
                  behaviorScore: session.behaviorScore,
                  behavioralFlags: session.behavioralFlags,
                  recentEvents: events.slice(-5).map((e) => ({
                    type: e.eventType,
                    timestamp: e.eventTimestamp,
                    toolName: e.toolName,
                  })),
                  latestAssessment: assessments[0]
                    ? {
                        score: assessments[0].overallScore,
                        type: assessments[0].assessmentType,
                        detectors: assessments[0].detectors,
                      }
                    : null,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Dynamic session resources: prysm://session/{sessionId}/report
      const reportMatch = uri.match(/^prysm:\/\/session\/([^/]+)\/report$/);
      if (reportMatch) {
        const sessionId = reportMatch[1];
        const session = await getSessionByExternalId(projectId, sessionId);
        if (!session) {
          throw new Error(`Session ${sessionId} not found`);
        }

        const assessments = await getAssessmentsForSession(session.id);
        const violations = await getViolationsForSession(session.id);

        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(
                {
                  sessionId: session.sessionId,
                  status: session.status,
                  outcome: session.outcome,
                  agentType: session.agentType,
                  startedAt: session.startedAt,
                  endedAt: session.endedAt,
                  durationMs: session.durationMs,
                  metrics: {
                    totalEvents: session.totalEvents,
                    totalLlmCalls: session.totalLlmCalls,
                    totalToolCalls: session.totalToolCalls,
                    totalTokens: session.totalTokens,
                    totalCostCents: session.totalCostCents,
                  },
                  behaviorScore: session.behaviorScore,
                  assessments: assessments.map((a) => ({
                    score: a.overallScore,
                    type: a.assessmentType,
                    detectors: a.detectors,
                    summary: a.summary,
                    recommendations: a.recommendations,
                  })),
                  violations: violations.map((v) => ({
                    severity: v.severity,
                    description: v.description,
                    status: v.status,
                    detectedAt: v.detectedAt,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      throw new Error(`Unknown resource: ${uri}`);
    }
  );
}
