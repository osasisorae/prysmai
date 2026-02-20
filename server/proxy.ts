/**
 * Prysm AI Proxy Gateway — Layer 1
 *
 * OpenAI-compatible reverse proxy that:
 * 1. Authenticates via sk-prysm-* API keys
 * 2. Detects provider and translates format if needed (Anthropic)
 * 3. Forwards requests to the upstream LLM provider
 * 4. Captures full request/response + metrics
 * 5. Logs everything to the traces table
 *
 * Endpoints:
 *   POST /api/v1/chat/completions
 *   POST /api/v1/completions
 *   POST /api/v1/embeddings
 *   GET  /api/v1/health
 */

import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  hashApiKey,
  lookupApiKey,
  getProjectById,
  insertTrace,
  getPricingForModel,
  calculateCost,
  incrementUsage,
  checkUsageLimit,
} from "./db";
import type { InsertTrace } from "../drizzle/schema";
import {
  translateRequestToAnthropic,
  translateResponseToOpenAI,
  translateStreamEvent,
  createStreamState,
  getAnthropicHeaders,
  getAnthropicBaseUrl,
} from "./anthropic-translator";

const proxyRouter = Router();

// ─── Auth middleware: extract and validate sk-prysm-* key ───

interface AuthResult {
  projectId: number;
  orgId: number | null;
  provider: string;
  baseUrl: string;
  upstreamApiKey: string;
  rateLimited?: boolean;
  currentCount?: number;
  limit?: number;
}

async function authenticateProxyRequest(req: Request): Promise<AuthResult | null> {
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

  const config = project.providerConfig as {
    provider: string;
    baseUrl: string;
    apiKeyEncrypted?: string;
  } | null;

  if (!config?.apiKeyEncrypted) return null;

  // Check usage limits (free tier enforcement)
  const org = project.orgId;
  if (org) {
    const usageCheck = await checkUsageLimit(org, "free"); // TODO: look up actual plan from org
    if (!usageCheck.allowed) {
      return { rateLimited: true, currentCount: usageCheck.currentCount, limit: usageCheck.limit } as any;
    }
  }

  return {
    projectId: project.id,
    orgId: project.orgId,
    provider: config.provider ?? "openai",
    baseUrl: config.baseUrl ?? "https://api.openai.com/v1",
    upstreamApiKey: config.apiKeyEncrypted, // stored as plaintext for MVP
  };
}

// ─── Helper: resolve cost from DB pricing (async) with hardcoded fallback ───

async function resolveCost(
  provider: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
): Promise<number> {
  const pricing = await getPricingForModel(provider, model);
  if (!pricing) return 0;
  return calculateCost(promptTokens, completionTokens, pricing.input, pricing.output);
}

// ─── Helper: detect if provider is Anthropic ───

function isAnthropic(provider: string): boolean {
  return provider.toLowerCase() === "anthropic";
}

// ─── Helper: extract common trace metadata from request ───

function extractTraceMetadata(req: Request) {
  return {
    endUserId: (req.headers["x-prysm-user-id"] as string) ?? undefined,
    sessionId: (req.headers["x-prysm-session-id"] as string) ?? undefined,
    metadata: req.headers["x-prysm-metadata"]
      ? JSON.parse(req.headers["x-prysm-metadata"] as string)
      : undefined,
  };
}

// ═══════════════════════════════════════════════════════════════
// CHAT COMPLETIONS
// ═══════════════════════════════════════════════════════════════

// ─── Chat Completions: Non-streaming (OpenAI native) ───

async function handleChatNonStreaming(req: Request, res: Response, auth: AuthResult) {
  const traceId = uuidv4();
  const startTime = Date.now();
  const body = req.body;
  const model = body.model ?? "unknown";

  try {
    let upstreamUrl: string;
    let upstreamHeaders: Record<string, string>;
    let upstreamBody: string;

    if (isAnthropic(auth.provider)) {
      // Translate OpenAI → Anthropic
      const anthropicReq = translateRequestToAnthropic({ ...body, stream: false });
      const baseUrl = getAnthropicBaseUrl(auth.baseUrl !== "https://api.openai.com/v1" ? auth.baseUrl : undefined);
      upstreamUrl = `${baseUrl}/messages`;
      upstreamHeaders = getAnthropicHeaders(auth.upstreamApiKey);
      upstreamBody = JSON.stringify(anthropicReq);
    } else {
      // OpenAI / OpenAI-compatible (vLLM, Ollama, TGI)
      upstreamUrl = `${auth.baseUrl}/chat/completions`;
      upstreamHeaders = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${auth.upstreamApiKey}`,
      };
      upstreamBody = JSON.stringify({ ...body, stream: false });
    }

    const upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      headers: upstreamHeaders,
      body: upstreamBody,
    });

    const latencyMs = Date.now() - startTime;
    const rawResponse = await upstreamResponse.json() as any;

    // Translate response if Anthropic
    const responseData = isAnthropic(auth.provider)
      ? translateResponseToOpenAI(rawResponse, model)
      : rawResponse;

    // Extract metrics
    const usage = responseData.usage ?? {};
    const promptTokens = usage.prompt_tokens ?? 0;
    const completionTokens = usage.completion_tokens ?? 0;
    const totalTokens = usage.total_tokens ?? promptTokens + completionTokens;
    const completion = responseData.choices?.[0]?.message?.content ?? "";
    const finishReason = responseData.choices?.[0]?.finish_reason ?? "";
    const toolCalls = responseData.choices?.[0]?.message?.tool_calls ?? undefined;
    const logprobs = responseData.choices?.[0]?.logprobs ?? undefined;

    // Calculate cost (DB-driven)
    const costUsd = await resolveCost(auth.provider, model, promptTokens, completionTokens);

    const meta = extractTraceMetadata(req);

    // Log trace
    const trace: InsertTrace = {
      projectId: auth.projectId,
      traceId,
      model,
      provider: auth.provider,
      promptMessages: body.messages,
      completion,
      finishReason,
      toolCalls: toolCalls?.length ? toolCalls : undefined,
      logprobs: logprobs ?? undefined,
      status: upstreamResponse.ok ? "success" : "error",
      statusCode: upstreamResponse.status,
      errorMessage: upstreamResponse.ok ? undefined : JSON.stringify(rawResponse),
      latencyMs,
      promptTokens,
      completionTokens,
      totalTokens,
      costUsd: costUsd.toFixed(6),
      temperature: body.temperature?.toString(),
      maxTokens: body.max_tokens,
      topP: body.top_p?.toString(),
      isStreaming: false,
      ...meta,
    };

    insertTrace(trace).catch((err) =>
      console.error("[Proxy] Failed to insert trace:", err)
    );

    res.set("X-Prysm-Trace-Id", traceId);
    res.set("X-Prysm-Latency-Ms", latencyMs.toString());
    res.status(upstreamResponse.ok ? 200 : upstreamResponse.status).json(responseData);
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    const trace: InsertTrace = {
      projectId: auth.projectId,
      traceId,
      model,
      provider: auth.provider,
      promptMessages: body.messages,
      status: "error",
      statusCode: 502,
      errorMessage: error.message ?? "Upstream connection failed",
      latencyMs,
      isStreaming: false,
    };
    insertTrace(trace).catch(console.error);

    res.set("X-Prysm-Trace-Id", traceId);
    res.status(502).json({
      error: {
        message: "Upstream provider error",
        type: "proxy_error",
        prysm_trace_id: traceId,
      },
    });
  }
}

// ─── Chat Completions: Streaming (OpenAI native) ───

async function handleChatStreamingOpenAI(req: Request, res: Response, auth: AuthResult) {
  const traceId = uuidv4();
  const startTime = Date.now();
  const body = req.body;
  const model = body.model ?? "unknown";
  let ttftMs: number | undefined;
  let completionChunks: string[] = [];
  let finishReason = "";
  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;
  let toolCallsAccum: Record<number, { id: string; type: string; function: { name: string; arguments: string } }> = {};
  let logprobsAccum: any[] = [];

  try {
    const upstreamUrl = `${auth.baseUrl}/chat/completions`;
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${auth.upstreamApiKey}`,
      },
      body: JSON.stringify({ ...body, stream: true, stream_options: { include_usage: true } }),
    });

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      const errorText = await upstreamResponse.text();
      const latencyMs = Date.now() - startTime;
      const trace: InsertTrace = {
        projectId: auth.projectId,
        traceId,
        model,
        provider: auth.provider,
        promptMessages: body.messages,
        status: "error",
        statusCode: upstreamResponse.status,
        errorMessage: errorText,
        latencyMs,
        isStreaming: true,
      };
      insertTrace(trace).catch(console.error);
      res.set("X-Prysm-Trace-Id", traceId);
      res.status(upstreamResponse.status).send(errorText);
      return;
    }

    // Set SSE headers
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Prysm-Trace-Id": traceId,
    });
    res.flushHeaders();

    const reader = upstreamResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // Forward raw SSE data to client
      res.write(chunk);

      // Parse SSE events for metrics
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);

          if (!ttftMs && parsed.choices?.[0]?.delta?.content) {
            ttftMs = Date.now() - startTime;
          }

          const deltaContent = parsed.choices?.[0]?.delta?.content;
          if (deltaContent) completionChunks.push(deltaContent);

          const deltaToolCalls = parsed.choices?.[0]?.delta?.tool_calls;
          if (deltaToolCalls) {
            for (const tc of deltaToolCalls) {
              const idx = tc.index ?? 0;
              if (!toolCallsAccum[idx]) {
                toolCallsAccum[idx] = { id: tc.id ?? "", type: tc.type ?? "function", function: { name: "", arguments: "" } };
              }
              if (tc.id) toolCallsAccum[idx].id = tc.id;
              if (tc.function?.name) toolCallsAccum[idx].function.name += tc.function.name;
              if (tc.function?.arguments) toolCallsAccum[idx].function.arguments += tc.function.arguments;
            }
          }

          const chunkLogprobs = parsed.choices?.[0]?.logprobs;
          if (chunkLogprobs?.content) logprobsAccum.push(...chunkLogprobs.content);

          if (parsed.choices?.[0]?.finish_reason) finishReason = parsed.choices[0].finish_reason;

          if (parsed.usage) {
            promptTokens = parsed.usage.prompt_tokens ?? 0;
            completionTokens = parsed.usage.completion_tokens ?? 0;
            totalTokens = parsed.usage.total_tokens ?? promptTokens + completionTokens;
          }
        } catch {
          // Skip unparseable lines
        }
      }
    }

    res.end();

    const latencyMs = Date.now() - startTime;
    const completion = completionChunks.join("");
    const costUsd = await resolveCost(auth.provider, model, promptTokens, completionTokens);

    const toolCallsFinal = Object.keys(toolCallsAccum).length > 0 ? Object.values(toolCallsAccum) : undefined;
    const logprobsFinal = logprobsAccum.length > 0 ? { content: logprobsAccum } : undefined;
    const meta = extractTraceMetadata(req);

    const trace: InsertTrace = {
      projectId: auth.projectId,
      traceId,
      model,
      provider: auth.provider,
      promptMessages: body.messages,
      completion,
      finishReason,
      toolCalls: toolCallsFinal,
      logprobs: logprobsFinal,
      status: "success",
      statusCode: 200,
      latencyMs,
      ttftMs,
      promptTokens,
      completionTokens,
      totalTokens,
      costUsd: costUsd.toFixed(6),
      temperature: body.temperature?.toString(),
      maxTokens: body.max_tokens,
      topP: body.top_p?.toString(),
      isStreaming: true,
      ...meta,
    };

    insertTrace(trace).catch((err) =>
      console.error("[Proxy] Failed to insert trace:", err)
    );
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    const trace: InsertTrace = {
      projectId: auth.projectId,
      traceId,
      model,
      provider: auth.provider,
      promptMessages: body.messages,
      status: "error",
      statusCode: 502,
      errorMessage: error.message ?? "Upstream connection failed",
      latencyMs,
      isStreaming: true,
    };
    insertTrace(trace).catch(console.error);

    if (!res.headersSent) {
      res.set("X-Prysm-Trace-Id", traceId);
      res.status(502).json({
        error: { message: "Upstream provider error", type: "proxy_error", prysm_trace_id: traceId },
      });
    } else {
      res.end();
    }
  }
}

// ─── Chat Completions: Streaming (Anthropic translated) ───

async function handleChatStreamingAnthropic(req: Request, res: Response, auth: AuthResult) {
  const traceId = uuidv4();
  const startTime = Date.now();
  const body = req.body;
  const model = body.model ?? "unknown";
  let ttftMs: number | undefined;
  let completionChunks: string[] = [];

  try {
    const anthropicReq = translateRequestToAnthropic({ ...body, stream: true });
    const baseUrl = getAnthropicBaseUrl(auth.baseUrl !== "https://api.openai.com/v1" ? auth.baseUrl : undefined);
    const upstreamUrl = `${baseUrl}/messages`;

    const upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      headers: getAnthropicHeaders(auth.upstreamApiKey),
      body: JSON.stringify({ ...anthropicReq, stream: true }),
    });

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      const errorText = await upstreamResponse.text();
      const latencyMs = Date.now() - startTime;
      const trace: InsertTrace = {
        projectId: auth.projectId,
        traceId,
        model,
        provider: auth.provider,
        promptMessages: body.messages,
        status: "error",
        statusCode: upstreamResponse.status,
        errorMessage: errorText,
        latencyMs,
        isStreaming: true,
      };
      insertTrace(trace).catch(console.error);
      res.set("X-Prysm-Trace-Id", traceId);
      res.status(upstreamResponse.status).send(errorText);
      return;
    }

    // Set SSE headers
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Prysm-Trace-Id": traceId,
    });
    res.flushHeaders();

    const reader = upstreamResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const streamState = createStreamState(model);
    let toolCallsAccum: Array<{ id: string; type: string; function: { name: string; arguments: string } }> = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // Parse Anthropic SSE events
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      let currentEventType = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEventType = line.slice(7).trim();
          continue;
        }
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (!data) continue;

        try {
          const parsed = JSON.parse(data);
          parsed.type = parsed.type || currentEventType;

          // Track TTFT
          if (!ttftMs && parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
            ttftMs = Date.now() - startTime;
          }

          // Collect completion text
          if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
            completionChunks.push(parsed.delta.text || "");
          }

          // Collect tool calls
          if (parsed.type === "content_block_start" && parsed.content_block?.type === "tool_use") {
            toolCallsAccum.push({
              id: parsed.content_block.id,
              type: "function",
              function: { name: parsed.content_block.name, arguments: "" },
            });
          }
          if (parsed.type === "content_block_delta" && parsed.delta?.type === "input_json_delta") {
            if (toolCallsAccum.length > 0) {
              toolCallsAccum[toolCallsAccum.length - 1].function.arguments += parsed.delta.partial_json || "";
            }
          }

          // Translate to OpenAI SSE and forward
          const openaiChunk = translateStreamEvent(parsed, streamState);
          if (openaiChunk) {
            res.write(openaiChunk);
          }
        } catch {
          // Skip unparseable
        }
      }
    }

    res.end();

    const latencyMs = Date.now() - startTime;
    const completion = completionChunks.join("");
    const costUsd = await resolveCost(auth.provider, model, streamState.promptTokens, streamState.completionTokens);
    const meta = extractTraceMetadata(req);

    const trace: InsertTrace = {
      projectId: auth.projectId,
      traceId,
      model,
      provider: auth.provider,
      promptMessages: body.messages,
      completion,
      finishReason: streamState.finishReason || "stop",
      toolCalls: toolCallsAccum.length > 0 ? toolCallsAccum : undefined,
      status: "success",
      statusCode: 200,
      latencyMs,
      ttftMs,
      promptTokens: streamState.promptTokens,
      completionTokens: streamState.completionTokens,
      totalTokens: streamState.promptTokens + streamState.completionTokens,
      costUsd: costUsd.toFixed(6),
      temperature: body.temperature?.toString(),
      maxTokens: body.max_tokens,
      topP: body.top_p?.toString(),
      isStreaming: true,
      ...meta,
    };

    insertTrace(trace).catch((err) =>
      console.error("[Proxy] Failed to insert trace:", err)
    );
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    const trace: InsertTrace = {
      projectId: auth.projectId,
      traceId,
      model,
      provider: auth.provider,
      promptMessages: body.messages,
      status: "error",
      statusCode: 502,
      errorMessage: error.message ?? "Upstream connection failed",
      latencyMs,
      isStreaming: true,
    };
    insertTrace(trace).catch(console.error);

    if (!res.headersSent) {
      res.set("X-Prysm-Trace-Id", traceId);
      res.status(502).json({
        error: { message: "Upstream provider error", type: "proxy_error", prysm_trace_id: traceId },
      });
    } else {
      res.end();
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// LEGACY COMPLETIONS
// ═══════════════════════════════════════════════════════════════

async function handleCompletions(req: Request, res: Response, auth: AuthResult) {
  const traceId = uuidv4();
  const startTime = Date.now();
  const body = req.body;
  const model = body.model ?? "unknown";

  // Anthropic doesn't support legacy completions — return error
  if (isAnthropic(auth.provider)) {
    res.status(400).json({
      error: {
        message: "Anthropic does not support the legacy /completions endpoint. Use /chat/completions instead.",
        type: "invalid_request_error",
      },
    });
    return;
  }

  try {
    const upstreamUrl = `${auth.baseUrl}/completions`;
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${auth.upstreamApiKey}`,
      },
      body: JSON.stringify(body),
    });

    const latencyMs = Date.now() - startTime;
    const responseData = await upstreamResponse.json() as any;

    const usage = responseData.usage ?? {};
    const promptTokens = usage.prompt_tokens ?? 0;
    const completionTokens = usage.completion_tokens ?? 0;
    const totalTokens = usage.total_tokens ?? promptTokens + completionTokens;
    const completion = responseData.choices?.[0]?.text ?? "";
    const finishReason = responseData.choices?.[0]?.finish_reason ?? "";
    const logprobs = responseData.choices?.[0]?.logprobs ?? undefined;

    const costUsd = await resolveCost(auth.provider, model, promptTokens, completionTokens);
    const meta = extractTraceMetadata(req);

    const trace: InsertTrace = {
      projectId: auth.projectId,
      traceId,
      model,
      provider: auth.provider,
      promptMessages: [{ role: "user", content: body.prompt ?? "" }],
      completion,
      finishReason,
      logprobs: logprobs ?? undefined,
      status: upstreamResponse.ok ? "success" : "error",
      statusCode: upstreamResponse.status,
      errorMessage: upstreamResponse.ok ? undefined : JSON.stringify(responseData),
      latencyMs,
      promptTokens,
      completionTokens,
      totalTokens,
      costUsd: costUsd.toFixed(6),
      temperature: body.temperature?.toString(),
      maxTokens: body.max_tokens,
      topP: body.top_p?.toString(),
      isStreaming: false,
      ...meta,
    };

    insertTrace(trace).catch((err) =>
      console.error("[Proxy] Failed to insert trace:", err)
    );

    res.set("X-Prysm-Trace-Id", traceId);
    res.set("X-Prysm-Latency-Ms", latencyMs.toString());
    res.status(upstreamResponse.status).json(responseData);
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    const trace: InsertTrace = {
      projectId: auth.projectId,
      traceId,
      model,
      provider: auth.provider,
      promptMessages: [{ role: "user", content: req.body.prompt ?? "" }],
      status: "error",
      statusCode: 502,
      errorMessage: error.message ?? "Upstream connection failed",
      latencyMs,
      isStreaming: false,
    };
    insertTrace(trace).catch(console.error);

    res.set("X-Prysm-Trace-Id", traceId);
    res.status(502).json({
      error: { message: "Upstream provider error", type: "proxy_error", prysm_trace_id: traceId },
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// EMBEDDINGS
// ═══════════════════════════════════════════════════════════════

async function handleEmbeddings(req: Request, res: Response, auth: AuthResult) {
  const traceId = uuidv4();
  const startTime = Date.now();
  const body = req.body;
  const model = body.model ?? "text-embedding-3-small";

  // Anthropic doesn't support embeddings — return error
  if (isAnthropic(auth.provider)) {
    res.status(400).json({
      error: {
        message: "Anthropic does not support the /embeddings endpoint. Use an OpenAI-compatible embedding model.",
        type: "invalid_request_error",
      },
    });
    return;
  }

  try {
    const upstreamUrl = `${auth.baseUrl}/embeddings`;
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${auth.upstreamApiKey}`,
      },
      body: JSON.stringify(body),
    });

    const latencyMs = Date.now() - startTime;
    const responseData = await upstreamResponse.json() as any;

    const usage = responseData.usage ?? {};
    const promptTokens = usage.prompt_tokens ?? usage.total_tokens ?? 0;
    const totalTokens = usage.total_tokens ?? promptTokens;

    const costUsd = await resolveCost(auth.provider, model, promptTokens, 0);

    const inputText = typeof body.input === "string"
      ? body.input
      : Array.isArray(body.input)
        ? body.input.join(" | ")
        : JSON.stringify(body.input);

    const meta = extractTraceMetadata(req);

    const trace: InsertTrace = {
      projectId: auth.projectId,
      traceId,
      model,
      provider: auth.provider,
      promptMessages: [{ role: "user", content: inputText }],
      completion: `[embedding: ${responseData.data?.length ?? 0} vectors, ${responseData.data?.[0]?.embedding?.length ?? 0} dimensions]`,
      status: upstreamResponse.ok ? "success" : "error",
      statusCode: upstreamResponse.status,
      errorMessage: upstreamResponse.ok ? undefined : JSON.stringify(responseData),
      latencyMs,
      promptTokens,
      completionTokens: 0,
      totalTokens,
      costUsd: costUsd.toFixed(6),
      isStreaming: false,
      ...meta,
    };

    insertTrace(trace).catch((err) =>
      console.error("[Proxy] Failed to insert trace:", err)
    );

    res.set("X-Prysm-Trace-Id", traceId);
    res.set("X-Prysm-Latency-Ms", latencyMs.toString());
    res.status(upstreamResponse.status).json(responseData);
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    const trace: InsertTrace = {
      projectId: auth.projectId,
      traceId,
      model,
      provider: auth.provider,
      promptMessages: [{ role: "user", content: typeof req.body.input === "string" ? req.body.input : JSON.stringify(req.body.input) }],
      status: "error",
      statusCode: 502,
      errorMessage: error.message ?? "Upstream connection failed",
      latencyMs,
      isStreaming: false,
    };
    insertTrace(trace).catch(console.error);

    res.set("X-Prysm-Trace-Id", traceId);
    res.status(502).json({
      error: { message: "Upstream provider error", type: "proxy_error", prysm_trace_id: traceId },
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════

// Chat completions (streaming + non-streaming, OpenAI + Anthropic)
proxyRouter.post("/chat/completions", async (req: Request, res: Response) => {
  const auth = await authenticateProxyRequest(req);
  if (!auth) {
    return res.status(401).json({
      error: {
        message: "Invalid API key. Use a valid sk-prysm-* key.",
        type: "authentication_error",
      },
    });
  }
  if (auth.rateLimited) {
    return res.status(429).json({
      error: {
        message: `Rate limit exceeded. ${auth.currentCount}/${auth.limit} requests used this billing period.`,
        type: "rate_limit_error",
      },
    });
  }

  // Increment usage counter
  if (auth.orgId) incrementUsage(auth.orgId, auth.projectId).catch(console.error);

  const isStreaming = req.body.stream === true;
  if (isStreaming) {
    if (isAnthropic(auth.provider)) {
      await handleChatStreamingAnthropic(req, res, auth);
    } else {
      await handleChatStreamingOpenAI(req, res, auth);
    }
  } else {
    await handleChatNonStreaming(req, res, auth);
  }
});

// Legacy completions (non-chat)
proxyRouter.post("/completions", async (req: Request, res: Response) => {
  const auth = await authenticateProxyRequest(req);
  if (!auth) {
    return res.status(401).json({
      error: {
        message: "Invalid API key. Use a valid sk-prysm-* key.",
        type: "authentication_error",
      },
    });
  }
  if (auth.rateLimited) {
    return res.status(429).json({
      error: {
        message: `Rate limit exceeded. ${auth.currentCount}/${auth.limit} requests used this billing period.`,
        type: "rate_limit_error",
      },
    });
  }
  if (auth.orgId) incrementUsage(auth.orgId, auth.projectId).catch(console.error);
  await handleCompletions(req, res, auth);
});

// Embeddings
proxyRouter.post("/embeddings", async (req: Request, res: Response) => {
  const auth = await authenticateProxyRequest(req);
  if (!auth) {
    return res.status(401).json({
      error: {
        message: "Invalid API key. Use a valid sk-prysm-* key.",
        type: "authentication_error",
      },
    });
  }
  if (auth.rateLimited) {
    return res.status(429).json({
      error: {
        message: `Rate limit exceeded. ${auth.currentCount}/${auth.limit} requests used this billing period.`,
        type: "rate_limit_error",
      },
    });
  }
  if (auth.orgId) incrementUsage(auth.orgId, auth.projectId).catch(console.error);
  await handleEmbeddings(req, res, auth);
});

// Health check
proxyRouter.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "prysm-proxy",
    version: "0.3.0",
    endpoints: ["/chat/completions", "/completions", "/embeddings"],
    providers: ["openai", "anthropic", "vllm", "ollama", "tgi"],
  });
});

export { proxyRouter };
