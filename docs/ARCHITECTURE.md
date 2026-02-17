# Prysm AI — Architecture

This document describes the technical architecture of Prysm AI's Layer 1 observability system.

---

## System Overview

Prysm AI operates as a transparent reverse proxy between your application and your LLM provider. The system captures every request and response, computes metrics, and stores them for analysis through the dashboard.

```
┌─────────────┐     ┌──────────────────────┐     ┌──────────────┐
│  Your App   │────►│   Prysm Proxy        │────►│  LLM Provider│
│             │◄────│  /v1/chat/completions │◄────│  (OpenAI etc)│
└─────────────┘     └──────────┬───────────┘     └──────────────┘
                               │
                    ┌──────────▼───────────┐
                    │   MySQL / TiDB       │
                    │   (traces, metrics,  │
                    │    projects, keys)   │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   React Dashboard    │
                    │   (tRPC queries)     │
                    └──────────────────────┘
```

---

## Component Details

### 1. Proxy Gateway (`server/proxy.ts`)

The proxy is an Express router mounted at `/v1`. It handles a single endpoint:

**`POST /v1/chat/completions`**

The request lifecycle:

1. **Authentication** — Extract the `Bearer sk-prysm-*` token from the Authorization header. SHA-256 hash it and look up the corresponding API key record in the database. Resolve the associated project and its provider configuration.

2. **Forwarding** — Construct the upstream request using the project's configured base URL and API key. Forward the full request body (model, messages, temperature, etc.) to the upstream provider.

3. **Capture** — For non-streaming requests, parse the JSON response to extract token counts, finish reason, and completion text. For streaming requests, pass through SSE chunks in real time while buffering them to reconstruct the full response.

4. **Metrics** — Calculate latency (total round-trip), time-to-first-token (streaming only), and cost (using the model pricing table). Attach Prysm headers (`X-Prysm-Trace-Id`, `X-Prysm-Latency-Ms`) to the response.

5. **Logging** — Insert a trace record asynchronously (fire-and-forget) to avoid adding latency to the response path.

### 2. Database Layer (`drizzle/schema.ts`, `server/db.ts`)

The database uses Drizzle ORM with MySQL/TiDB. The schema consists of 7 tables organized into three domains:

**Identity & Access:**
- `users` — Authenticated users with OAuth integration and role-based access (user/admin)
- `organizations` — Multi-tenant organizations with billing plan tiers
- `projects` — Projects within organizations, each with independent provider configuration
- `api_keys` — SHA-256 hashed API keys mapped to projects

**Observability:**
- `traces` — The core data table. Every LLM request/response is stored as a trace with full prompt messages, completion text, token counts, latency, cost, status, and optional user-provided metadata.

**Configuration:**
- `model_pricing` — Per-model cost rates for input and output tokens
- `waitlist_signups` — Pre-launch email captures

The `db.ts` file provides typed helper functions that encapsulate all database queries, keeping the tRPC routers and proxy code clean.

### 3. API Layer (`server/routers.ts`)

The dashboard API uses tRPC 11 with Superjson serialization. Procedures are organized into namespaces:

- `org.*` — Organization CRUD
- `project.*` — Project management and provider configuration
- `apiKey.*` — API key generation, listing, and revocation
- `traces.*` — Trace listing with pagination, filtering, and detail retrieval
- `metrics.*` — Aggregated metrics (overview, timeseries, model breakdown)

All dashboard procedures use `protectedProcedure`, which requires an authenticated session. The proxy endpoint uses its own API key authentication, independent of the dashboard auth.

### 4. Dashboard (`client/src/pages/`)

The React frontend uses a sidebar layout (`DashboardShell.tsx`) with four main views:

- **Overview** (`Dashboard.tsx`) — Four metric cards (total requests, total tokens, total cost, average latency), a time-series area chart, model usage breakdown, and a live request feed showing the 10 most recent traces.

- **Request Explorer** (`RequestExplorer.tsx`) — Paginated table of all traces with status indicators, model tags, latency, token counts, and cost. Clicking a row opens a detail panel showing the full prompt messages and completion text.

- **API Keys** (`ApiKeys.tsx`) — Create, view, and revoke API keys. Includes a quick-start code snippet that dynamically generates curl/Python/JS examples with the correct proxy URL and key.

- **Settings** (`Settings.tsx`) — Project-level configuration including provider selection, base URL, default model, and upstream API key management.

---

## Authentication

The system uses two independent authentication mechanisms:

| Context | Method | Token Format |
|---------|--------|-------------|
| Dashboard | OAuth 2.0 + JWT session cookie | HTTP-only cookie |
| Proxy | API key in Authorization header | `Bearer sk-prysm-{64 hex chars}` |

API keys are generated as `sk-prysm-` followed by 64 random hex characters. Only the SHA-256 hash is stored in the database. The full key is shown once at creation time and cannot be retrieved afterward.

---

## Cost Calculation

Cost is calculated per-request using the formula:

```
cost = (prompt_tokens / 1000) × input_rate + (completion_tokens / 1000) × output_rate
```

Rates are looked up from a hardcoded pricing table covering 10 popular models. The table supports prefix matching, so `gpt-4o-2024-08-06` resolves to the `gpt-4o` pricing entry. Custom pricing can be added to the `model_pricing` database table for override.

---

## Streaming Architecture

For streaming requests (`stream: true`), the proxy:

1. Opens an SSE connection to the upstream provider with `stream_options: { include_usage: true }`
2. Passes through each SSE chunk to the client in real time (zero buffering delay)
3. Simultaneously parses each chunk to extract delta content, finish reason, and usage stats
4. Records time-to-first-token (TTFT) when the first content delta arrives
5. After the stream completes, assembles the full completion text and logs the trace

This design ensures the client experiences no additional latency from Prysm's instrumentation.

---

## Data Flow

```
Request arrives at /v1/chat/completions
    │
    ▼
Extract Bearer token → SHA-256 hash → DB lookup
    │
    ▼
Resolve project → Get provider config (baseUrl, apiKey)
    │
    ▼
Forward to upstream provider
    │
    ├── Non-streaming: await JSON response
    │       │
    │       ▼
    │   Parse usage, calculate cost, return response
    │
    └── Streaming: pipe SSE chunks to client
            │
            ▼
        Buffer chunks, measure TTFT, reassemble completion
    │
    ▼
Insert trace record (async, fire-and-forget)
```

---

## Security Considerations

- API keys are stored as SHA-256 hashes — the raw key exists only in memory during request processing
- Upstream provider API keys are stored in the project's `providerConfig` JSON field (plaintext for MVP; encryption planned for production)
- The dashboard requires OAuth authentication; all tRPC procedures use `protectedProcedure`
- The proxy endpoint is independent of dashboard auth — it only validates `sk-prysm-*` keys
- CORS and cookie security are handled by the framework layer (`server/_core/`)
