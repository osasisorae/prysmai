/**
 * Trace Emitter
 * 
 * Wraps trace insertion with WebSocket broadcast.
 * Import this instead of calling insertTrace directly in the proxy.
 */

import { insertTrace } from "./db";
import { broadcastTrace } from "./ws-live-feed";
import type { InsertTrace } from "../drizzle/schema";

/**
 * Insert a trace into the database and broadcast it to connected WebSocket clients
 */
export async function emitTrace(trace: InsertTrace): Promise<void> {
  // Insert into DB
  await insertTrace(trace);

  // Broadcast to WebSocket clients
  if (trace.projectId) {
    broadcastTrace(trace.projectId, {
      id: 0, // Will be assigned by DB
      traceId: trace.traceId,
      model: trace.model,
      provider: trace.provider,
      status: trace.status ?? "success",
      latencyMs: trace.latencyMs ?? null,
      promptTokens: trace.promptTokens ?? null,
      completionTokens: trace.completionTokens ?? null,
      totalTokens: trace.totalTokens ?? null,
      costUsd: trace.costUsd ?? null,
      timestamp: new Date(),
      isStreaming: trace.isStreaming ?? null,
    });
  }
}
