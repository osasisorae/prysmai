/**
 * WebSocket Live Feed
 * 
 * Provides real-time trace updates to connected dashboard clients.
 * Replaces the 5-second polling approach with push-based updates.
 */

import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

// Map of projectId -> Set of connected WebSocket clients
const projectClients = new Map<number, Set<WebSocket>>();

let wss: WebSocketServer | null = null;

/**
 * Initialize WebSocket server on the existing HTTP server.
 * Uses noServer mode + manual upgrade handling so we only claim
 * /ws/live-feed and leave all other WebSocket upgrades (e.g. Vite HMR) alone.
 */
export function initWebSocketServer(server: Server): void {
  wss = new WebSocketServer({ noServer: true });

  // Only handle upgrade requests for our specific path
  server.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;
    if (pathname === "/ws/live-feed") {
      wss!.handleUpgrade(request, socket, head, (ws) => {
        wss!.emit("connection", ws, request);
      });
    }
    // Do NOT call socket.destroy() for other paths — let Vite HMR handle them
  });

  wss.on("connection", (ws, req) => {
    // Parse projectId from query string: /ws/live-feed?projectId=123
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const projectIdStr = url.searchParams.get("projectId");
    const projectId = projectIdStr ? parseInt(projectIdStr, 10) : null;

    if (!projectId || isNaN(projectId)) {
      ws.close(4001, "Missing or invalid projectId");
      return;
    }

    // Register this client for the project
    if (!projectClients.has(projectId)) {
      projectClients.set(projectId, new Set());
    }
    projectClients.get(projectId)!.add(ws);

    console.log(`[WS] Client connected for project ${projectId} (${getClientCount(projectId)} total)`);

    // Send initial connection confirmation
    ws.send(JSON.stringify({ type: "connected", projectId }));

    // Handle client messages (e.g., ping/pong)
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
        }
      } catch {
        // Ignore malformed messages
      }
    });

    // Clean up on disconnect
    ws.on("close", () => {
      const clients = projectClients.get(projectId);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) {
          projectClients.delete(projectId);
        }
      }
      console.log(`[WS] Client disconnected from project ${projectId}`);
    });

    ws.on("error", (err) => {
      console.error(`[WS] Error for project ${projectId}:`, err.message);
    });
  });

  console.log("[WS] WebSocket live feed server initialized at /ws/live-feed");
}

/**
 * Broadcast a new trace event to all clients subscribed to a project
 */
export function broadcastTrace(projectId: number, trace: {
  id: number;
  traceId: string;
  model: string;
  provider: string;
  status: string;
  latencyMs: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  costUsd: string | null;
  timestamp: Date;
  isStreaming: boolean | null;
}): void {
  const clients = projectClients.get(projectId);
  if (!clients || clients.size === 0) return;

  const message = JSON.stringify({
    type: "trace",
    data: trace,
  });

  let sent = 0;
  const clientArray = Array.from(clients);
  for (const client of clientArray) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      sent++;
    }
  }

  if (sent > 0) {
    console.log(`[WS] Broadcast trace ${trace.traceId} to ${sent} clients for project ${projectId}`);
  }
}

/**
 * Get the number of connected clients for a project
 */
function getClientCount(projectId: number): number {
  return projectClients.get(projectId)?.size || 0;
}

/**
 * Get total connected clients across all projects
 */
export function getTotalClientCount(): number {
  let total = 0;
  for (const clients of Array.from(projectClients.values())) {
    total += clients.size;
  }
  return total;
}

/**
 * Broadcast a session-level event to all clients subscribed to a project.
 * Used by the MCP server to push governance session updates in real time.
 */
export function broadcastSessionEvent(projectId: number, event: {
  type: string;
  sessionId: string;
  [key: string]: unknown;
}): void {
  const clients = projectClients.get(projectId);
  if (!clients || clients.size === 0) return;

  const message = JSON.stringify({
    type: "session_event",
    data: event,
  });

  let sent = 0;
  const clientArray = Array.from(clients);
  for (const client of clientArray) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      sent++;
    }
  }

  if (sent > 0) {
    console.log(`[WS] Broadcast session event ${event.type} to ${sent} clients for project ${projectId}`);
  }
}
