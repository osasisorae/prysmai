/**
 * Event Ingester — validates, normalizes, and stores incoming session events.
 *
 * Handles the conversion from MCP tool call payloads to typed session events.
 * Also triggers async side-effects (code security scanning, trace linking).
 */

import {
  insertEvent,
  insertEventsBatch,
  getLatestSequenceNumber,
  type InsertEventInput,
} from "./session-manager";

// ─── Event Validation ───

const VALID_EVENT_TYPES = new Set([
  "llm_call", "tool_call", "tool_result", "code_generated", "code_executed",
  "file_read", "file_write", "decision", "error", "delegation",
  "user_input", "session_start", "session_end",
]);

export interface RawEvent {
  event_type: string;
  data: Record<string, unknown>;
  timestamp?: number;
}

export interface IngestResult {
  eventIds: number[];
  errors: Array<{ index: number; error: string }>;
}

/**
 * Ingest a batch of events from an MCP check_behavior call.
 * Validates each event, assigns sequence numbers, and stores them.
 */
export async function ingestEvents(
  sessionDbId: number,
  projectId: number,
  rawEvents: RawEvent[]
): Promise<IngestResult> {
  const eventIds: number[] = [];
  const errors: Array<{ index: number; error: string }> = [];

  // Get the current max sequence number for this session
  let currentSeq = await getLatestSequenceNumber(sessionDbId);

  for (let i = 0; i < rawEvents.length; i++) {
    const raw = rawEvents[i];

    // Validate event type
    if (!raw.event_type || !VALID_EVENT_TYPES.has(raw.event_type)) {
      errors.push({ index: i, error: `Invalid event_type: ${raw.event_type}` });
      continue;
    }

    if (!raw.data || typeof raw.data !== "object") {
      errors.push({ index: i, error: "Missing or invalid data field" });
      continue;
    }

    currentSeq++;
    const now = raw.timestamp ?? Date.now();

    try {
      const input = normalizeEvent(raw, sessionDbId, projectId, now, currentSeq);
      const id = await insertEvent(input);
      eventIds.push(id);
    } catch (err: any) {
      errors.push({ index: i, error: err.message ?? "Unknown error" });
    }
  }

  return { eventIds, errors };
}

/**
 * Normalize a raw event into the typed InsertEventInput format.
 * Extracts denormalized fields from event_data for query performance.
 */
function normalizeEvent(
  raw: RawEvent,
  sessionDbId: number,
  projectId: number,
  timestamp: number,
  sequenceNumber: number
): InsertEventInput {
  const base: InsertEventInput = {
    sessionDbId,
    projectId,
    eventType: raw.event_type,
    eventData: raw.data,
    eventTimestamp: timestamp,
    sequenceNumber,
  };

  // Denormalize type-specific fields for query performance
  switch (raw.event_type) {
    case "tool_call":
      base.toolName = asString(raw.data.tool_name) ?? asString(raw.data.toolName);
      base.toolInput = asObject(raw.data.input) ?? asObject(raw.data.tool_input);
      base.toolOutput = asObject(raw.data.output) ?? asObject(raw.data.tool_output);
      base.toolSuccess = asBoolean(raw.data.success) ?? asBoolean(raw.data.tool_success);
      base.toolDurationMs = asNumber(raw.data.duration_ms) ?? asNumber(raw.data.tool_duration_ms);
      break;

    case "tool_result":
      base.toolName = asString(raw.data.tool_name) ?? asString(raw.data.toolName);
      base.toolOutput = asObject(raw.data.result) ?? asObject(raw.data.output);
      base.toolSuccess = asBoolean(raw.data.success);
      base.toolDurationMs = asNumber(raw.data.duration_ms);
      break;

    case "code_generated":
      base.codeLanguage = asString(raw.data.language);
      base.codeContent = asString(raw.data.code);
      base.codeFilePath = asString(raw.data.file_path) ?? asString(raw.data.filePath);
      break;

    case "llm_call":
      base.model = asString(raw.data.model);
      base.promptTokens = asNumber(raw.data.prompt_tokens) ?? asNumber(raw.data.promptTokens);
      base.completionTokens = asNumber(raw.data.completion_tokens) ?? asNumber(raw.data.completionTokens);
      base.costCents = asNumber(raw.data.cost_cents) ?? asNumber(raw.data.costCents);
      base.traceId = asNumber(raw.data.trace_id) ?? asNumber(raw.data.traceId);
      break;

    case "file_read":
    case "file_write":
      base.codeFilePath = asString(raw.data.path) ?? asString(raw.data.file_path);
      base.codeLanguage = asString(raw.data.language);
      break;

    case "delegation":
      // Delegation events store sub-agent info in eventData
      break;

    case "error":
      // Error events store error details in eventData
      break;
  }

  return base;
}

// ─── Type coercion helpers ───

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === "number" && !isNaN(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (!isNaN(n)) return n;
  }
  return undefined;
}

function asBoolean(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  return undefined;
}

function asObject(v: unknown): Record<string, unknown> | undefined {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return undefined;
}
