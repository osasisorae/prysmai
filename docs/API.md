# Prysm AI — API Reference

Complete reference for the Prysm AI proxy and dashboard APIs.

---

## Proxy API

### Chat Completions

```
POST /v1/chat/completions
```

OpenAI-compatible chat completions endpoint. Accepts the same request format as the OpenAI API and returns the same response format.

**Authentication:** `Authorization: Bearer sk-prysm-{key}`

**Request Body:**

```json
{
  "model": "gpt-4o-mini",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "max_tokens": 1000,
  "stream": false
}
```

All standard OpenAI parameters are supported and forwarded to the upstream provider.

**Response (non-streaming):**

Standard OpenAI chat completion response with additional Prysm headers:

```
HTTP/1.1 200 OK
X-Prysm-Trace-Id: 550e8400-e29b-41d4-a716-446655440000
X-Prysm-Latency-Ms: 847

{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "model": "gpt-4o-mini",
  "choices": [...],
  "usage": {
    "prompt_tokens": 12,
    "completion_tokens": 8,
    "total_tokens": 20
  }
}
```

**Response (streaming):**

Standard SSE stream with `X-Prysm-Trace-Id` in the initial headers.

**Error Responses:**

| Status | Meaning |
|--------|---------|
| 401 | Invalid or missing `sk-prysm-*` API key |
| 502 | Upstream provider connection failed |
| 4xx/5xx | Upstream provider error (status code forwarded as-is) |

**Custom Headers:**

| Header | Type | Description |
|--------|------|-------------|
| `X-Prysm-User-Id` | Request | Tag the request with your end user's ID |
| `X-Prysm-Session-Id` | Request | Tag with a session or conversation ID |
| `X-Prysm-Metadata` | Request | Arbitrary JSON metadata (must be valid JSON string) |
| `X-Prysm-Trace-Id` | Response | Unique trace ID for this request |
| `X-Prysm-Latency-Ms` | Response | Round-trip latency in milliseconds |

---

### Health Check

```
GET /v1/health
```

Returns the proxy service status. No authentication required.

**Response:**

```json
{
  "status": "ok",
  "service": "prysm-proxy",
  "version": "0.1.0"
}
```

---

## Dashboard API (tRPC)

All dashboard endpoints are served via tRPC at `/api/trpc`. They require an authenticated session (OAuth login).

### Organizations

**`org.create`** — Create a new organization

```typescript
// Input
{ name: string }

// Output
{ id: number, name: string, slug: string, plan: "free" }
```

**`org.getByUser`** — Get the current user's organization

```typescript
// Output
{ id: number, name: string, slug: string, plan: string } | null
```

---

### Projects

**`project.create`** — Create a project

```typescript
// Input
{ orgId: number, name: string, providerConfig?: { provider: string, baseUrl: string, defaultModel?: string, apiKeyEncrypted?: string } }

// Output
{ id: number, orgId: number, name: string, slug: string }
```

**`project.list`** — List projects in an organization

```typescript
// Input
{ orgId: number }

// Output
Array<{ id, orgId, name, slug, providerConfig, createdAt }>
```

**`project.getById`** — Get project details

```typescript
// Input
{ id: number }

// Output
{ id, orgId, name, slug, providerConfig, createdAt, updatedAt }
```

**`project.updateProvider`** — Update provider configuration

```typescript
// Input
{ projectId: number, config: { provider: string, baseUrl: string, defaultModel?: string, apiKeyEncrypted?: string } }
```

---

### API Keys

**`apiKey.create`** — Generate a new API key

```typescript
// Input
{ projectId: number, name?: string }

// Output
{ id: number, key: string, keyPrefix: string, name: string }
// Note: `key` is the full sk-prysm-* key, shown only once
```

**`apiKey.list`** — List API keys for a project

```typescript
// Input
{ projectId: number }

// Output
Array<{ id, keyPrefix, name, lastUsedAt, createdAt }>
// Note: full key is never returned after creation
```

**`apiKey.revoke`** — Revoke an API key

```typescript
// Input
{ id: number }
```

---

### Traces

**`traces.list`** — List traces with pagination and filtering

```typescript
// Input
{
  projectId: number,
  limit?: number,      // default 50
  offset?: number,     // default 0
  status?: "success" | "error" | "timeout",
  model?: string,
  search?: string      // searches in completion text
}

// Output
{
  traces: Array<{ id, traceId, timestamp, model, provider, status, statusCode, latencyMs, promptTokens, completionTokens, totalTokens, costUsd, isStreaming }>,
  total: number
}
```

**`traces.getById`** — Get full trace details including prompt and completion

```typescript
// Input
{ id: number }

// Output
{ id, traceId, timestamp, model, provider, promptMessages, completion, finishReason, status, statusCode, errorMessage, latencyMs, ttftMs, promptTokens, completionTokens, totalTokens, costUsd, temperature, maxTokens, topP, isStreaming, endUserId, sessionId, metadata }
```

---

### Metrics

**`metrics.overview`** — Aggregated metrics for a project

```typescript
// Input
{ projectId: number, hours?: number }  // default 24 hours

// Output
{
  totalRequests: number,
  totalTokens: number,
  totalCost: number,
  avgLatency: number,
  errorCount: number,
  errorRate: number
}
```

**`metrics.timeseries`** — Time-bucketed metrics for charts

```typescript
// Input
{ projectId: number, hours?: number, buckets?: number }

// Output
Array<{ bucket: string, requests: number, tokens: number, cost: number, avgLatency: number, errors: number }>
```

**`metrics.modelBreakdown`** — Per-model usage breakdown

```typescript
// Input
{ projectId: number, hours?: number }

// Output
Array<{ model: string, requests: number, tokens: number, cost: number, avgLatency: number }>
```
