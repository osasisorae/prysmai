# Prysm AI

**Interpretability and security infrastructure for AI agents.**

Prysm AI is an observability proxy that sits between your application and your LLM provider. Every request flows through Prysm, where it is captured, measured, and stored — giving you complete visibility into what your AI agents are doing, how much they cost, and where they fail.

---

## What It Does

Prysm AI provides a drop-in OpenAI-compatible proxy endpoint. Point your existing code at Prysm instead of OpenAI, and you get:

- **Full request/response capture** — every prompt and completion logged with metadata
- **Real-time metrics** — latency, token usage, cost, error rates, time-to-first-token
- **Cost tracking** — per-request cost calculation for 10+ models across OpenAI, Anthropic, and Google
- **Streaming support** — SSE passthrough with TTFT measurement and chunk reassembly
- **Dashboard** — overview metrics, request explorer, API key management, project settings
- **Multi-provider routing** — configure any OpenAI-compatible endpoint (OpenAI, Anthropic via proxy, vLLM, Ollama, etc.)

---

## Architecture

```
Your App  ──►  Prysm Proxy (/v1/chat/completions)  ──►  LLM Provider (OpenAI, etc.)
                     │
                     ▼
               Traces Database
                     │
                     ▼
              Prysm Dashboard
```

The system consists of three components:

| Component | Description | Technology |
|-----------|-------------|------------|
| **Proxy Gateway** | OpenAI-compatible reverse proxy that authenticates, forwards, and captures requests | Express.js, Node.js |
| **Database** | Stores traces, projects, API keys, organizations, and model pricing | MySQL/TiDB via Drizzle ORM |
| **Dashboard** | React SPA with real-time metrics, request explorer, and management UI | React 19, Tailwind CSS 4, Recharts, tRPC |

---

## Quick Start

### Prerequisites

- **Node.js** 22+ and **pnpm** 10+
- **MySQL** 8.0+ or **TiDB** (any version)

### 1. Clone the repository

```bash
git clone git@github.com:osasisorae/prysmai.git
cd prysmai
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values. See the [Environment Variables](#environment-variables) section below for details.

### 4. Set up the database

```bash
pnpm db:push
```

This generates and runs all Drizzle migrations against your configured database.

### 5. Start the development server

```bash
pnpm dev
```

The application starts at `http://localhost:3000`. The first time you visit `/dashboard`, you'll be guided through onboarding to create your organization, first project, and configure your LLM provider.

---

## Usage

### Sending requests through the proxy

Once you have a Prysm API key (generated in the dashboard), replace your OpenAI base URL with the Prysm proxy URL:

**curl:**

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-prysm-YOUR_KEY_HERE" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

**Python (OpenAI SDK):**

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-prysm-YOUR_KEY_HERE",
    base_url="http://localhost:3000/v1"
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)
```

**JavaScript/TypeScript (OpenAI SDK):**

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "sk-prysm-YOUR_KEY_HERE",
  baseURL: "http://localhost:3000/v1",
});

const response = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello!" }],
});
console.log(response.choices[0].message.content);
```

### Streaming

Streaming works identically — just set `stream: true`. Prysm passes through SSE events in real time while capturing metrics (including time-to-first-token) in the background.

```python
stream = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Tell me a story"}],
    stream=True
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="")
```

### Custom metadata headers

Attach metadata to any request for filtering and analysis in the dashboard:

| Header | Description | Example |
|--------|-------------|---------|
| `X-Prysm-User-Id` | Your end user's identifier | `user_12345` |
| `X-Prysm-Session-Id` | Conversation or session ID | `sess_abc` |
| `X-Prysm-Metadata` | Arbitrary JSON metadata | `{"agent":"support","version":"2.1"}` |

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer sk-prysm-YOUR_KEY" \
  -H "X-Prysm-User-Id: user_12345" \
  -H "X-Prysm-Session-Id: sess_abc" \
  -H 'X-Prysm-Metadata: {"agent":"support","version":"2.1"}' \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hi"}]}'
```

### Response headers

Every proxied response includes Prysm headers:

| Header | Description |
|--------|-------------|
| `X-Prysm-Trace-Id` | Unique trace ID for this request (UUID) |
| `X-Prysm-Latency-Ms` | Total round-trip latency in milliseconds |

---

## API Reference

### Proxy Endpoint

```
POST /v1/chat/completions
```

Accepts the standard OpenAI Chat Completions request format. Requires a `Bearer sk-prysm-*` API key in the Authorization header. Forwards to the upstream provider configured for the project associated with the API key.

### Health Check

```
GET /v1/health
```

Returns `{ "status": "ok", "service": "prysm-proxy", "version": "0.1.0" }`.

### Dashboard API (tRPC)

All dashboard operations are exposed via tRPC at `/api/trpc`. The key procedures:

| Procedure | Type | Auth | Description |
|-----------|------|------|-------------|
| `org.create` | mutation | protected | Create an organization |
| `org.getByUser` | query | protected | Get the current user's organization |
| `project.create` | mutation | protected | Create a project under an org |
| `project.list` | query | protected | List all projects in an org |
| `project.getById` | query | protected | Get project details by ID |
| `project.updateProvider` | mutation | protected | Update provider configuration |
| `apiKey.create` | mutation | protected | Generate a new `sk-prysm-*` API key |
| `apiKey.list` | query | protected | List API keys for a project |
| `apiKey.revoke` | mutation | protected | Revoke an API key |
| `traces.list` | query | protected | List traces with pagination and filters |
| `traces.getById` | query | protected | Get full trace details |
| `metrics.overview` | query | protected | Aggregated metrics (requests, tokens, cost, latency) |
| `metrics.timeseries` | query | protected | Time-bucketed metrics for charts |
| `metrics.modelBreakdown` | query | protected | Per-model usage breakdown |

---

## Database Schema

The database contains 7 tables:

| Table | Purpose |
|-------|---------|
| `users` | Authenticated users with roles (user/admin) |
| `waitlist_signups` | Pre-launch waitlist email captures |
| `organizations` | Multi-tenant organizations with billing plans |
| `projects` | Projects within orgs, each with provider configuration |
| `api_keys` | SHA-256 hashed API keys mapped to projects |
| `traces` | Full LLM request/response records with metrics |
| `model_pricing` | Per-model cost rates for cost calculation |

The schema is defined in `drizzle/schema.ts` and managed via Drizzle ORM migrations.

---

## Environment Variables

Create a `.env` file from `.env.example` with the following variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | MySQL/TiDB connection string (e.g., `mysql://user:pass@host:port/dbname`) |
| `JWT_SECRET` | Yes | Secret key for signing session cookies |
| `VITE_APP_ID` | Yes | OAuth application ID |
| `OAUTH_SERVER_URL` | Yes | OAuth backend base URL |
| `VITE_OAUTH_PORTAL_URL` | Yes | OAuth login portal URL (frontend) |
| `OWNER_OPEN_ID` | No | Owner's OAuth open ID |
| `OWNER_NAME` | No | Owner's display name |
| `RESEND_API_KEY` | No | Resend API key for transactional emails |
| `BUILT_IN_FORGE_API_URL` | No | Forge API URL for built-in LLM access |
| `BUILT_IN_FORGE_API_KEY` | No | Forge API bearer token |

---

## Project Structure

```
prysmai/
├── client/                    # React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx           # Landing page
│   │   │   ├── Blog.tsx           # Blog index + article pages
│   │   │   ├── Dashboard.tsx      # Metrics overview dashboard
│   │   │   ├── RequestExplorer.tsx # Trace table + detail panel
│   │   │   ├── ApiKeys.tsx        # API key management
│   │   │   ├── Settings.tsx       # Project & provider settings
│   │   │   ├── Onboarding.tsx     # First-time setup wizard
│   │   │   ├── DashboardShell.tsx # Dashboard layout wrapper
│   │   │   └── Admin.tsx          # Admin panel (waitlist)
│   │   ├── data/
│   │   │   └── blog-posts.ts     # Blog content (6 articles)
│   │   ├── components/           # Reusable UI components
│   │   ├── lib/trpc.ts           # tRPC client binding
│   │   └── App.tsx               # Routes & layout
│   └── public/                   # Static assets
├── server/
│   ├── proxy.ts                  # Proxy gateway (Layer 1)
│   ├── routers.ts                # tRPC procedures
│   ├── db.ts                     # Database helpers
│   ├── email.ts                  # Email service (Resend)
│   ├── storage.ts                # S3 file storage
│   ├── _core/                    # Framework plumbing (do not edit)
│   ├── *.test.ts                 # Vitest test files (6 files, 54 tests)
│   └── index.ts                  # Server entry point
├── drizzle/
│   ├── schema.ts                 # Database schema (7 tables)
│   └── migrations/               # Generated migrations
├── shared/                       # Shared types & constants
└── package.json
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server with hot reload |
| `pnpm build` | Build for production (Vite + esbuild) |
| `pnpm start` | Start production server |
| `pnpm test` | Run all Vitest tests |
| `pnpm db:push` | Generate and run database migrations |
| `pnpm check` | TypeScript type checking |
| `pnpm format` | Format code with Prettier |

---

## Cost Tracking

Prysm calculates per-request costs using built-in pricing for 10 models:

| Model | Input (per 1K tokens) | Output (per 1K tokens) |
|-------|----------------------|------------------------|
| gpt-4o | $0.0025 | $0.0100 |
| gpt-4o-mini | $0.00015 | $0.0006 |
| gpt-4-turbo | $0.0100 | $0.0300 |
| gpt-4 | $0.0300 | $0.0600 |
| gpt-3.5-turbo | $0.0005 | $0.0015 |
| claude-3-5-sonnet | $0.0030 | $0.0150 |
| claude-3-5-haiku | $0.0008 | $0.0040 |
| claude-3-opus | $0.0150 | $0.0750 |
| gemini-2.0-flash | $0.0001 | $0.0004 |
| gemini-1.5-pro | $0.00125 | $0.0050 |

Custom pricing can be added via the `model_pricing` database table.

---

## Testing

Run the full test suite:

```bash
pnpm test
```

The test suite includes 54 tests across 6 files:

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `layer1.test.ts` | 17 | API key hashing, cost calculation, pricing lookup, proxy contract |
| `blog.test.ts` | 23 | Blog post data integrity, ordering, navigation |
| `email.test.ts` | 5 | Email service validation |
| `waitlist.test.ts` | 4 | Waitlist signup flow |
| `admin.waitlist.test.ts` | 4 | Admin access control |
| `auth.logout.test.ts` | 1 | Authentication logout |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Tailwind CSS 4, Recharts, shadcn/ui |
| API Layer | tRPC 11 with Superjson |
| Backend | Express 4, Node.js 22 |
| Database | MySQL/TiDB via Drizzle ORM |
| Auth | OAuth 2.0 with JWT sessions |
| Email | Resend |
| Build | Vite 7, esbuild, TypeScript 5.9 |
| Testing | Vitest |

---

## Roadmap

Prysm AI is being built in three layers:

- **Layer 1 — Observability** (current): Proxy gateway, metrics, cost tracking, request explorer
- **Layer 2 — Security**: Prompt injection detection, jailbreak classification, PII scanning, content policy enforcement
- **Layer 3 — Interpretability**: Sparse autoencoder probes, feature activation monitoring, circuit-level anomaly detection

---

## License

Proprietary. All rights reserved.

---

## Contact

**Osarenren Isorae** — Founder, Prysm AI

- Website: [prysmai.io](https://prysmai.io)
- Email: hello@prysmai.io
