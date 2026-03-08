/**
 * MCP Server — Streamable HTTP Transport
 *
 * Exposes Prysm governance tools via the Model Context Protocol.
 * Connected agents (Manus, Claude Code, Codex CLI) can call:
 *   - prysm_session_start
 *   - prysm_check_behavior
 *   - prysm_scan_code
 *   - prysm_session_end
 *
 * Transport: Streamable HTTP at POST /api/mcp
 * Auth: Bearer sk-prysm-* API key (same as proxy gateway)
 *
 * Architecture: Each request creates a fresh Server + Transport pair.
 * The MCP SDK's Server class can only be connected to one transport at a time,
 * so we create a new instance per request to handle concurrent/sequential calls.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Express, Request, Response } from "express";
import { hashApiKey, lookupApiKey, getProjectById } from "../db";
import { registerTools, setDetectionEngine } from "./tools";
import { registerResources } from "./resources";

// Behavioral detection engine — loaded once, shared across all request-scoped servers
let detectBehaviorFn: ((sessionId: number, projectId: number, isRealtime: boolean) => Promise<any>) | null = null;

/**
 * Create a fresh MCP server instance scoped to a single request.
 * Each request gets its own Server so there's no "already connected" conflict.
 */
function createMcpServer(projectId: number): Server {
  const server = new Server(
    {
      name: "prysm-governance",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // Provide a closure that returns the authenticated project ID for this request
  const getProjectId = () => projectId;

  // Register tools and resources on this request-scoped server
  registerTools(server, getProjectId);
  registerResources(server, getProjectId);

  // Wire up the detection engine if available
  if (detectBehaviorFn) {
    setDetectionEngine(detectBehaviorFn);
  }

  return server;
}

/**
 * Authenticate an MCP request using the same sk-prysm-* API key scheme as the proxy.
 * Returns the project ID if valid, null otherwise.
 */
async function authenticateMcpRequest(req: Request): Promise<number | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer sk-prysm-")) {
    return null;
  }

  const rawKey = authHeader.replace("Bearer ", "");
  const keyHash = hashApiKey(rawKey);
  const apiKeyRecord = await lookupApiKey(keyHash);

  if (!apiKeyRecord) return null;

  const project = await getProjectById(apiKeyRecord.projectId);
  if (!project) return null;

  return project.id;
}

/**
 * Register the MCP endpoint on the Express app.
 * POST /api/mcp — handles all MCP JSON-RPC messages via Streamable HTTP transport.
 */
export function registerMcpRoutes(app: Express): void {
  // Lazy-load the behavioral detection engine to avoid circular imports
  setTimeout(async () => {
    try {
      const { runDetection } = await import("../behavioral/engine");
      detectBehaviorFn = runDetection;
      setDetectionEngine(runDetection);
      console.log("[MCP] Behavioral detection engine connected");
    } catch {
      console.log("[MCP] Behavioral detection engine not available yet (will be connected later)");
    }
  }, 1000);

  // POST /api/mcp — Streamable HTTP transport (one Server per request)
  app.post("/api/mcp", async (req: Request, res: Response) => {
    let mcpServer: Server | null = null;

    try {
      // Authenticate
      const projectId = await authenticateMcpRequest(req);
      if (!projectId) {
        res.status(401).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Unauthorized. Provide a valid sk-prysm-* API key in the Authorization header.",
          },
          id: req.body?.id ?? null,
        });
        return;
      }

      // Create a fresh server + transport for this request
      mcpServer = createMcpServer(projectId);

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless mode
      });

      // Connect the server to the transport
      await mcpServer.connect(transport);

      // Handle the request — this writes the response
      await transport.handleRequest(req, res, req.body);

      // Clean up: close the server so it releases the transport
      await mcpServer.close();
      mcpServer = null;
    } catch (err: any) {
      console.error("[MCP] Request error:", err);

      // Attempt cleanup on error
      if (mcpServer) {
        try {
          await mcpServer.close();
        } catch {
          // Ignore cleanup errors
        }
      }

      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: req.body?.id ?? null,
        });
      }
    }
  });

  // GET /api/mcp — health check / server metadata
  app.get("/api/mcp", (_req: Request, res: Response) => {
    res.json({
      name: "prysm-governance",
      version: "1.0.0",
      protocol: "mcp",
      transport: "streamable-http",
      tools: ["prysm_session_start", "prysm_check_behavior", "prysm_scan_code", "prysm_session_end"],
      resources: ["prysm://policies", "prysm://models", "prysm://session/{id}/status", "prysm://session/{id}/report"],
    });
  });

  console.log("[MCP] Governance MCP server registered at /api/mcp");
}
