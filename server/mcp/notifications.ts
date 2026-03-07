/**
 * MCP Notification Dispatch
 *
 * Sends server-initiated notifications to connected MCP clients.
 * Notifications are fire-and-forget — if no client is connected, they are dropped.
 */

import type { Server } from "@modelcontextprotocol/sdk/server/index.js";

// Store a reference to the MCP server for sending notifications
let mcpServerRef: Server | null = null;

export function setMcpServer(server: Server): void {
  mcpServerRef = server;
}

// ─── Notification Types ───

export interface PolicyViolationNotification {
  session_id: string;
  policy_name: string;
  severity: string;
  description: string;
}

export interface BehavioralFlagNotification {
  session_id: string;
  detector_id: string;
  severity: number;
  evidence: Record<string, unknown>;
}

export interface SecurityAlertNotification {
  session_id: string;
  vulnerability_type: string;
  severity: string;
  file_path?: string;
}

// ─── Dispatch Functions ───

export async function notifyPolicyViolation(data: PolicyViolationNotification): Promise<void> {
  await sendNotification("prysm/policy_violation", data as unknown as Record<string, unknown>);
}

export async function notifyBehavioralFlag(data: BehavioralFlagNotification): Promise<void> {
  await sendNotification("prysm/behavioral_flag", data as unknown as Record<string, unknown>);
}

export async function notifySecurityAlert(data: SecurityAlertNotification): Promise<void> {
  await sendNotification("prysm/security_alert", data as unknown as Record<string, unknown>);
}

// ─── Internal ───

async function sendNotification(method: string, params: Record<string, unknown>): Promise<void> {
  if (!mcpServerRef) {
    // No MCP server initialized — drop notification silently
    return;
  }

  try {
    await mcpServerRef.notification({ method, params } as any);
  } catch (err) {
    // Notifications are best-effort — log and continue
    console.warn(`[MCP] Failed to send notification ${method}:`, err);
  }
}
