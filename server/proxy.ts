/**
 * Prysm AI Proxy Gateway — Layer 1
 *
 * OpenAI-compatible reverse proxy that:
 * 1. Authenticates via sk-prysm-* API keys
 * 2. Forwards requests to the upstream LLM provider
 * 3. Captures full request/response + metrics
 * 4. Logs everything to the traces table
 *
 * Endpoint: POST /api/v1/chat/completions
 */

import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  hashApiKey,
  lookupApiKey,
  getProjectById,
  insertTrace,
  getDefaultPricing,
  calculateCost,
} from "./db";
import type { InsertTrace } from "../drizzle/schema";

const proxyRouter = Router();

// ─── Auth middleware: extract and validate sk-prysm-* key ───

async function authenticateProxyRequest(req: Request): Promise<{
  projectId: number;
  provider: string;
  baseUrl: string;
  upstreamApiKey: string;
} | null> {
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

  return {
    projectId: project.id,
    provider: config.provider ?? "openai",
    baseUrl: config.baseUrl ?? "https://api.openai.com/v1",
    upstreamApiKey: config.apiKeyEncrypted, // stored as plaintext for MVP
  };
}

// ─── Non-streaming proxy ───

async function handleNonStreaming(
  req: Request,
  res: Response,
  auth: { projectId: number; provider: string; baseUrl: string; upstreamApiKey: string },
) {
  const traceId = uuidv4();
  const startTime = Date.now();
  const body = req.body;
  const model = body.model ?? "unknown";

  try {
    const upstreamUrl = `${auth.baseUrl}/chat/completions`;
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${auth.upstreamApiKey}`,
      },
      body: JSON.stringify({ ...body, stream: false }),
    });

    const latencyMs = Date.now() - startTime;
    const responseData = await upstreamResponse.json() as any;

    // Extract metrics
    const usage = responseData.usage ?? {};
    const promptTokens = usage.prompt_tokens ?? 0;
    const completionTokens = usage.completion_tokens ?? 0;
    const totalTokens = usage.total_tokens ?? promptTokens + completionTokens;
    const completion = responseData.choices?.[0]?.message?.content ?? "";
    const finishReason = responseData.choices?.[0]?.finish_reason ?? "";

    // Calculate cost
    const pricing = getDefaultPricing(model);
    const costUsd = pricing
      ? calculateCost(promptTokens, completionTokens, pricing.input, pricing.output)
      : 0;

    // Log trace
    const trace: InsertTrace = {
      projectId: auth.projectId,
      traceId,
      model,
      provider: auth.provider,
      promptMessages: body.messages,
      completion,
      finishReason,
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
      endUserId: (req.headers["x-prysm-user-id"] as string) ?? undefined,
      sessionId: (req.headers["x-prysm-session-id"] as string) ?? undefined,
      metadata: req.headers["x-prysm-metadata"]
        ? JSON.parse(req.headers["x-prysm-metadata"] as string)
        : undefined,
    };

    // Fire-and-forget trace insert
    insertTrace(trace).catch((err) =>
      console.error("[Proxy] Failed to insert trace:", err)
    );

    // Add Prysm headers to response
    res.set("X-Prysm-Trace-Id", traceId);
    res.set("X-Prysm-Latency-Ms", latencyMs.toString());
    res.status(upstreamResponse.status).json(responseData);
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;

    // Log error trace
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

// ─── Streaming proxy ───

async function handleStreaming(
  req: Request,
  res: Response,
  auth: { projectId: number; provider: string; baseUrl: string; upstreamApiKey: string },
) {
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

          // Time to first token
          if (!ttftMs && parsed.choices?.[0]?.delta?.content) {
            ttftMs = Date.now() - startTime;
          }

          // Collect completion text
          const deltaContent = parsed.choices?.[0]?.delta?.content;
          if (deltaContent) {
            completionChunks.push(deltaContent);
          }

          // Finish reason
          if (parsed.choices?.[0]?.finish_reason) {
            finishReason = parsed.choices[0].finish_reason;
          }

          // Usage (sent in final chunk when stream_options.include_usage is true)
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

    // Calculate cost
    const pricing = getDefaultPricing(model);
    const costUsd = pricing
      ? calculateCost(promptTokens, completionTokens, pricing.input, pricing.output)
      : 0;

    // Log trace
    const trace: InsertTrace = {
      projectId: auth.projectId,
      traceId,
      model,
      provider: auth.provider,
      promptMessages: body.messages,
      completion,
      finishReason,
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
      endUserId: (req.headers["x-prysm-user-id"] as string) ?? undefined,
      sessionId: (req.headers["x-prysm-session-id"] as string) ?? undefined,
      metadata: req.headers["x-prysm-metadata"]
        ? JSON.parse(req.headers["x-prysm-metadata"] as string)
        : undefined,
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
        error: {
          message: "Upstream provider error",
          type: "proxy_error",
          prysm_trace_id: traceId,
        },
      });
    } else {
      res.end();
    }
  }
}

// ─── Main route ───

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

  const isStreaming = req.body.stream === true;

  if (isStreaming) {
    await handleStreaming(req, res, auth);
  } else {
    await handleNonStreaming(req, res, auth);
  }
});

// Health check
proxyRouter.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "prysm-proxy", version: "0.1.0" });
});

export { proxyRouter };
