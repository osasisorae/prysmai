/**
 * Shared documentation content for Prysm AI.
 * Single source of truth — consumed by:
 *   1. Docs.tsx (rendered as JSX)
 *   2. MCP docs server (returned as raw Markdown)
 *   3. Copy-as-MD feature (copied to clipboard)
 *
 * Each section has an id (matches anchor links), title, group, summary, and markdown content.
 */

export interface DocSection {
  id: string;
  title: string;
  group: string;
  summary: string;
  markdown: string;
}

export const DOC_GROUPS = [
  { key: "getting-started", label: "Getting Started" },
  { key: "sdk", label: "SDK & Integrations" },
  { key: "platform", label: "Platform" },
  { key: "security", label: "Security & Analysis" },
  { key: "reference", label: "Reference" },
  { key: "agent-tracing", label: "Agent Tracing" },
] as const;

export const DOCS: DocSection[] = [
  // ═══════════════════════════════════════════════════════════
  // GROUP: Getting Started
  // ═══════════════════════════════════════════════════════════
  {
    id: "overview",
    title: "Overview",
    group: "getting-started",
    summary: "What Prysm AI is, how it works, and what you get out of the box.",
    markdown: `# Overview

Prysm AI is an observability and security proxy for LLM applications. It sits between your application and your LLM provider, capturing every request and response with full metrics — latency, token counts, cost, errors, and the complete prompt/completion data. It also scans every request for prompt injection attacks, PII leakage, and content policy violations in real time.

Instead of adding logging code throughout your application, you route your LLM traffic through Prysm with a single configuration change. The proxy is fully OpenAI-compatible, so any application that uses the OpenAI SDK works with Prysm out of the box.

\`\`\`
Your App  →  Prysm Proxy  →  LLM Provider
              (OpenAI, Anthropic, Google Gemini, vLLM, Ollama, or any OpenAI-compatible endpoint)
              ↓ traces, metrics, cost, latency, alerts, security scanning — all captured automatically
\`\`\`

## What You Get

| Feature | Description |
|---------|-------------|
| Multi-provider proxy | OpenAI, Anthropic (auto-translated), Google Gemini, vLLM, Ollama, any OpenAI-compatible endpoint |
| Full trace capture | Every request/response logged with tokens, latency, cost, model, and metadata |
| Real-time dashboard | Live metrics charts, request explorer, model usage breakdown, WebSocket live feed |
| 3 proxy endpoints | Chat completions, text completions, and embeddings |
| Streaming support | SSE passthrough with Time to First Token (TTFT) measurement |
| Alerting engine | Email, Slack, Discord, and custom webhook alerts on metric thresholds |
| Team management | Invite members via email, assign roles, manage access |
| API key auth | \`sk-prysm-*\` keys with SHA-256 hashing, create/revoke from dashboard |
| Cost tracking | Automatic cost calculation for 10+ models, custom pricing for any model |
| Python SDK | Published on PyPI — one line to integrate |
| Governance layer | Behavioral detection, code security scanning, policy enforcement for AI agents |
| Prompt injection detection | 20+ attack patterns across 7 categories with configurable blocking |
| PII detection & redaction | 8 data types (email, phone, SSN, credit cards, API keys, IPs) with mask/hash/block modes |
| Content policy enforcement | 5 built-in policies + custom keywords, composite threat scoring (0–100) |
| Security dashboard | Real-time threat log, stats overview, and configuration management |
| Token confidence heatmap | Per-token confidence visualization with OKLCH color gradient |
| Hallucination detection | Automatic identification of low-confidence segments with risk scoring |
| MCP endpoint | Model Context Protocol server for direct agent-to-governance communication |
`,
  },
  {
    id: "getting-started",
    title: "Getting Started",
    group: "getting-started",
    summary: "Go from zero to full observability in under 5 minutes.",
    markdown: `# Getting Started

Get from zero to full observability in under 5 minutes.

## 1. Create Your Account

Sign up at \`prysmai.io\` and complete the onboarding wizard. You'll create an organization and your first project during setup.

## 2. Configure Your Provider

During onboarding (or later in Settings), configure which LLM provider your project uses. Prysm stores your provider API key securely and uses it to forward requests.

| Provider | Base URL | Notes |
|----------|----------|-------|
| OpenAI | \`https://api.openai.com/v1\` | Default. Works with GPT-4o, GPT-4o Mini, o1, etc. |
| Anthropic | \`https://api.anthropic.com/v1\` | Auto-translated to OpenAI format. Use \`claude-*\` model names. |
| Google Gemini | \`https://generativelanguage.googleapis.com/v1beta/openai\` | Native OpenAI-compatible endpoint. Use \`gemini-*\` model names. |
| vLLM / Ollama | Your server URL | Any OpenAI-compatible endpoint works. |

## 3. Create an API Key

Go to **Dashboard → API Keys → Create New Key**. Copy the key immediately — it's shown only once.

\`\`\`
sk-prysm-a1b2c3d4e5f6...
\`\`\`

## 4. Make Your First Request

\`\`\`python
from prysmai import PrysmClient

client = PrysmClient(prysm_key="sk-prysm-...").openai()

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Explain quantum computing"}],
)
print(response.choices[0].message.content)
\`\`\`

> **One Prysm key, all providers.** The code is identical across OpenAI, Anthropic, and Gemini — only the \`model\` name changes. Provider keys stay in your Prysm dashboard, never in your application code.

Open your Prysm dashboard. The request appears in the live feed within seconds, with full metrics: latency, token counts, cost, model, and the complete prompt/response.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| \`401 Unauthorized\` | Invalid or revoked Prysm API key | Create a new key in Dashboard → API Keys |
| \`502 Bad Gateway\` | Provider API key missing or invalid | Check Settings → Provider Configuration |
| Request not appearing in dashboard | Wrong base_url or key | Verify \`PrysmClient(prysm_key=...)\` matches your dashboard key |
| High latency on first request | Cold start | Normal for first request; subsequent requests are faster |
`,
  },

  // ═══════════════════════════════════════════════════════════
  // GROUP: SDK & Integrations
  // ═══════════════════════════════════════════════════════════
  {
    id: "python-sdk",
    title: "Python SDK",
    group: "sdk",
    summary: "PrysmClient, monitor(), context metadata, streaming, and async support.",
    markdown: `# Python SDK

The Prysm AI Python SDK (\`prysmai\`) is published on [PyPI](https://pypi.org/project/prysmai/). It requires Python 3.9+ and depends on \`openai\` (v1.0+) and \`httpx\` (v0.24+), both installed automatically.

\`\`\`bash
pip install prysmai
\`\`\`

> **Framework integrations (v0.5.0):** Install with optional dependencies for your framework:
> \`\`\`bash
> pip install prysmai[langgraph]    # LangGraph
> pip install prysmai[crewai]       # CrewAI
> pip install prysmai[llamaindex]   # LlamaIndex
> pip install prysmai[all]          # All frameworks
> \`\`\`

## PrysmClient

The primary entry point. Creates sync or async OpenAI clients routed through the Prysm proxy.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| \`prysm_key\` | \`str\` | \`PRYSM_API_KEY\` env | Your Prysm API key (\`sk-prysm-...\`) |
| \`base_url\` | \`str\` | \`prysmai.io/api/v1\` | Prysm proxy URL |
| \`timeout\` | \`float\` | \`120.0\` | Request timeout in seconds |

\`\`\`python
from prysmai import PrysmClient

prysm = PrysmClient(prysm_key="sk-prysm-...")

# Sync client
client = prysm.openai()

# Async client
async_client = prysm.async_openai()

# Use like any OpenAI client
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello!"}],
)
\`\`\`

> **Environment variable:** Set \`PRYSM_API_KEY\` in your environment and skip the \`prysm_key\` parameter:
> \`\`\`bash
> export PRYSM_API_KEY="sk-prysm-your-key-here"
> # Now just:
> client = PrysmClient().openai()
> \`\`\`

## monitor()

Alternative entry point for wrapping an existing OpenAI client. Useful if you already have a configured client and want to add Prysm observability on top.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| \`client\` | \`OpenAI \\| AsyncOpenAI\` | required | An OpenAI client instance |
| \`prysm_key\` | \`str\` | \`PRYSM_API_KEY\` env | Your Prysm API key |
| \`base_url\` | \`str\` | \`prysmai.io/api/v1\` | Prysm proxy URL |
| \`timeout\` | \`float\` | \`120.0\` | Request timeout in seconds |

\`\`\`python
from openai import OpenAI
from prysmai import monitor

monitored = monitor(OpenAI(), prysm_key="sk-prysm-...")

response = monitored.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello!"}],
)
\`\`\`

## Context & Metadata

Attach metadata to every request for filtering and grouping in your dashboard.

\`\`\`python
from prysmai import prysm_context

# Set globally — all requests will include these
prysm_context.set(
    user_id="user_123",
    session_id="sess_abc",
    metadata={"env": "production", "version": "1.2.0"}
)

# Scoped — only applies within the block
with prysm_context(user_id="user_456", metadata={"feature": "chat"}):
    response = client.chat.completions.create(...)
    # Tagged with user_456

# Back to user_123 outside the block
\`\`\`

| Method | Description |
|--------|-------------|
| \`prysm_context.set()\` | Set global context for all subsequent requests |
| \`prysm_context.get()\` | Get the current context object |
| \`prysm_context.clear()\` | Reset context to defaults |
| \`prysm_context(...)\` | Use as context manager for scoped metadata |
| \`governance_session_id\` | (v0.5.0) Auto-set when GovernanceSession is active |

## Streaming

Streaming works exactly as you'd expect — no changes needed. The proxy captures Time to First Token (TTFT), total latency, and the full streamed content.

\`\`\`python
stream = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Write a haiku about AI"}],
    stream=True,
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
\`\`\`

## Async Support

Full async support with the same API.

\`\`\`python
import asyncio
from prysmai import PrysmClient

async def main():
    client = PrysmClient(prysm_key="sk-prysm-...").async_openai()

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "Hello async!"}],
    )
    print(response.choices[0].message.content)

asyncio.run(main())
\`\`\`
`,
  },
  {
    id: "governance",
    title: "Governance",
    group: "sdk",
    summary: "GovernanceSession, behavioral detectors, code scanning, MCP endpoint, and governance dashboard.",
    markdown: `# Governance

The governance layer (v0.5.0) monitors agent sessions for behavioral anomalies, scans generated code for security vulnerabilities, and enforces policies across your AI operations. It works standalone or integrated into LangGraph and CrewAI workflows.

## GovernanceSession

The \`GovernanceSession\` context manager wraps an agent's work session. It communicates with the Prysm governance endpoint via the Model Context Protocol (MCP) to start sessions, report events, run behavioral checks, scan code, and generate end-of-session reports.

\`\`\`python
from prysmai import PrysmClient
from prysmai.governance import GovernanceSession

client = PrysmClient(prysm_key="sk-prysm-...")

with GovernanceSession(
    client,
    task="Fix authentication bug in user service",
    agent_type="claude_code",
    tools_available=["read_file", "write_file", "run_tests"],
) as gov:
    # Report events as your agent works
    gov.report_events([
        {"type": "llm_call", "model": "claude-sonnet-4-20250514", "tokens": 1500},
        {"type": "tool_call", "tool": "read_file", "args": {"path": "auth.py"}},
        {"type": "tool_call", "tool": "write_file", "args": {"path": "auth.py"}},
        {"type": "llm_call", "model": "claude-sonnet-4-20250514", "tokens": 800},
    ])

    # Run behavioral check mid-session
    result = gov.check_behavior()
    if result.get("triggered"):
        print(f"Behavioral anomaly: {result['detector']}")

    # Scan generated code
    scan = gov.scan_code(
        code="conn = mysql.connect(host='localhost', password='admin123')",
        language="python",
    )
    if scan.get("findings"):
        print(f"Security issues: {scan['findings']}")

# Session auto-ends, report generated
\`\`\`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| \`client\` | \`PrysmClient\` | required | Authenticated Prysm client |
| \`task\` | \`str\` | required | Description of what the agent is doing |
| \`agent_type\` | \`str\` | \`"generic"\` | Agent framework identifier |
| \`tools_available\` | \`list[str]\` | \`[]\` | Tools the agent has access to |
| \`auto_check\` | \`bool\` | \`False\` | Auto-run behavioral checks every N events |
| \`auto_check_interval\` | \`int\` | \`10\` | Events between auto-checks |

## Behavioral Detectors

Two high-confidence detectors ship with v0.5.0:

### Early Stopping Detector

Catches agents that quit before completing their stated task. Analyzes:
- **Unfollowed intents** — the agent stated it would do something (e.g., "I'll also run the tests") but never did
- **Incomplete tool sequences** — started a multi-step operation (read → modify → write) but stopped partway
- **Low action-to-LLM ratio** — too many LLM calls relative to actual tool usage (thinking without doing)

### Tool Undertriggering Detector

Identifies when agents have tools available but fail to use them when the task requires it:
- **Unused relevant tools** — task mentions "test" but \`run_tests\` was never called
- **Low tool diversity** — only used 1 of 5 available tools
- **Missing expected patterns** — code modification without subsequent testing

Both detectors produce evidence-based severity scores (0–100). Scores above 70 trigger alerts.

## Code Security Scanning

Scans agent-generated code for common vulnerabilities:

\`\`\`python
scan = gov.scan_code(
    code=agent_output,
    language="python",
)
# Returns: { findings: [...], severity: "high", details: "..." }
\`\`\`

Detected patterns include SQL injection, hardcoded credentials, unsafe deserialization, command injection, path traversal, and insecure cryptography.

## MCP Endpoint

The governance layer exposes a Model Context Protocol (MCP) server at \`/api/mcp\` for direct agent integration. Any MCP-compatible client (Claude Desktop, Cursor, Windsurf) can connect.

**Transport:** Streamable HTTP (JSON-RPC 2.0 over HTTP with SSE responses)

**Tools:**
| Tool | Description |
|------|-------------|
| \`session_start\` | Begin a new governance session |
| \`check_behavior\` | Run behavioral detection on current session |
| \`scan_code\` | Scan code for security vulnerabilities |
| \`session_end\` | End session and generate report |

**Resources:**
| URI Pattern | Description |
|-------------|-------------|
| \`session://{id}/report\` | Full session governance report |
| \`session://{id}/events\` | All events in a session |

## Governance Dashboard

Three new views in the web dashboard:

- **Session Explorer** — Browse all agent sessions with status, duration, event counts, and drill into individual session timelines
- **Governance Dashboard** — Aggregate metrics: sessions over time, detector trigger rates, severity distribution, top anomalies
- **Policy Manager** — Create and manage governance policies, view violations, set enforcement actions (log, alert, block)
`,
  },
  {
    id: "frameworks",
    title: "Framework Integrations",
    group: "sdk",
    summary: "LangGraph, CrewAI, and LlamaIndex integrations with optional governance.",
    markdown: `# Framework Integrations

Prysm integrates natively with popular agent frameworks. Each integration captures framework-specific telemetry and optionally enables governance monitoring.

## LangGraph

\`\`\`bash
pip install prysmai[langgraph]
\`\`\`

\`PrysmGraphMonitor\` provides graph-aware telemetry with node tracking, state transitions, and governance support.

\`\`\`python
from prysmai.integrations.langgraph import PrysmGraphMonitor

monitor = PrysmGraphMonitor(
    api_key="sk-prysm-...",
    governance=True,  # Enable behavioral detection
)

# Use as a callback handler in your LangGraph graph
graph = create_your_graph()
result = graph.invoke(
    {"messages": [("user", "Research quantum computing")]},
    config={"callbacks": [monitor]},
)

# Access governance results
if monitor.governance_session:
    report = monitor.governance_session.get_report()
\`\`\`

**What gets captured:**
| Event | Description |
|-------|-------------|
| Node execution | Which graph nodes ran, in what order, with timing |
| State transitions | State changes between nodes |
| LLM calls | All LLM invocations with model, tokens, latency |
| Tool calls | Tool invocations with arguments and results |
| Conditional routing | Which edges were taken at decision points |

### Governance with LangGraph

When \`governance=True\`, the monitor automatically:
1. Starts a governance session when the graph begins
2. Reports all captured events to the behavioral detection engine
3. Runs a final behavioral check when the graph completes
4. Generates a governance report accessible via \`monitor.governance_session\`

## CrewAI

\`\`\`bash
pip install prysmai[crewai]
\`\`\`

\`PrysmCrewMonitor\` captures crew execution telemetry including agent actions, task completions, and delegation events.

\`\`\`python
from prysmai.integrations.crewai import PrysmCrewMonitor

monitor = PrysmCrewMonitor(
    api_key="sk-prysm-...",
    governance=True,  # Enable behavioral detection
)

crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, write_task],
)

result = crew.kickoff(callbacks=[monitor])
\`\`\`

**What gets captured:**
| Event | Description |
|-------|-------------|
| Agent execution | Which agents ran, with timing |
| Task completion | Task results and duration |
| Tool usage | Tools called by each agent |
| Delegation | When agents delegate work to other agents |
| LLM calls | All underlying LLM invocations |

## LlamaIndex

\`\`\`bash
pip install prysmai[llamaindex]
\`\`\`

\`PrysmSpanHandler\` integrates with LlamaIndex's instrumentation system.

\`\`\`python
from prysmai.integrations.llamaindex import PrysmSpanHandler
import llama_index.core

llama_index.core.global_handler = PrysmSpanHandler(
    api_key="sk-prysm-...",
)

# All LlamaIndex operations are now traced
index = VectorStoreIndex.from_documents(documents)
response = index.as_query_engine().query("What is quantum computing?")
\`\`\`

> **All frameworks together:** You can use multiple integrations simultaneously. Each one captures its own telemetry and sends it to the same Prysm project.
`,
  },

  // ═══════════════════════════════════════════════════════════
  // GROUP: Platform
  // ═══════════════════════════════════════════════════════════
  {
    id: "dashboard",
    title: "Dashboard",
    group: "platform",
    summary: "Overview metrics, request explorer, API keys page, and settings.",
    markdown: `# Dashboard

The Prysm dashboard gives you a real-time view of your LLM usage. It's organized into four main sections, accessible from the sidebar navigation.

## Overview

The main dashboard page shows key metrics at a glance:

| Widget | What It Shows |
|--------|---------------|
| Metric cards | Total requests, total tokens, total cost, average latency (with p50/p95/p99) |
| Request volume chart | Requests over time, grouped by hour or day |
| Latency distribution | Histogram showing latency spread across requests |
| Error rate chart | Error percentage over time |
| Cost accumulation | Cumulative spend over time |
| Model usage breakdown | Pie chart of requests per model |
| Live trace feed | Real-time WebSocket feed of incoming requests |

## Request Explorer

A searchable, filterable table of every trace. Click any row to open the detail panel, which shows the full prompt messages, completion, token counts, latency, cost, model, status, tool calls, logprobs, and any metadata you attached.

Filter by model, status (success/error), date range, or search by content.

## API Keys Page

Create, view, and revoke API keys. Each key shows its prefix (\`sk-prysm-xxxx...\`), creation date, and a quick start code snippet.

## Settings

Manage your project configuration (provider, base URL, model, API key), alerts, team members, usage tracking, and custom model pricing.
`,
  },
  {
    id: "api-keys",
    title: "API Keys",
    group: "platform",
    summary: "Create, view, revoke, and rotate API keys for proxy authentication.",
    markdown: `# API Keys

API keys authenticate your requests to the Prysm proxy. Each key is scoped to a single project and uses the \`sk-prysm-\` prefix.

| Action | How |
|--------|-----|
| Create a key | Dashboard → API Keys → Create New Key. The full key is shown once — copy it immediately. |
| View keys | Dashboard → API Keys. Shows prefix, creation date, and status. |
| Revoke a key | Click the revoke button next to any key. Revoked keys stop working immediately. |
| Rotate a key | Create a new key, update your application, then revoke the old key. |

> **Security:** Keys are hashed with SHA-256 before storage. Prysm never stores or displays the full key after creation.
`,
  },
  {
    id: "alerts",
    title: "Alerts",
    group: "platform",
    summary: "Metric-based alerting with email, Slack, Discord, PagerDuty, and webhook channels.",
    markdown: `# Alerts

Set up alerts to get notified when your LLM metrics cross a threshold. Alerts are evaluated every 5 minutes against your recent trace data.

## Supported Metrics

| Metric | Description |
|--------|-------------|
| \`error_rate\` | Percentage of requests that returned an error |
| \`latency_p50\` | Median latency |
| \`latency_p95\` | 95th percentile latency |
| \`latency_p99\` | 99th percentile latency |
| \`cost_total\` | Total cost in USD within the evaluation window |
| \`request_count\` | Number of requests within the evaluation window |

## Conditions

Each alert uses a condition operator: \`gt\` (greater than), \`gte\`, \`lt\`, \`lte\`, \`eq\`.

Example: "Alert me when \`error_rate\` is \`gt\` \`5\`" fires when your error rate exceeds 5%.

## Notification Channels

| Channel | Target Format | Notes |
|---------|---------------|-------|
| Email | email@example.com | Sent via Resend |
| Slack | \`https://hooks.slack.com/services/...\` | Incoming webhook |
| Discord | \`https://discord.com/api/webhooks/...\` | Discord webhook |
| PagerDuty | Integration Key (32-char) | Events API v2 with auto-resolve |
| Webhook | \`https://your-server.com/alerts\` | POST with JSON payload |

## Setting Up Alerts

Go to **Settings → Alerts** in your dashboard. Click "Create Alert" and configure the name, metric, condition, threshold, evaluation window, cooldown period, and notification channels.
`,
  },
  {
    id: "team",
    title: "Team Management",
    group: "platform",
    summary: "Invite members, assign roles, and manage organization access.",
    markdown: `# Team Management

Invite team members to your organization so they can access the dashboard, create API keys, and manage projects.

| Action | How |
|--------|-----|
| Invite a member | Settings → Team → Invite. Enter their email address. |
| Remove a member | Click remove next to their name in the team list. |
| Transfer ownership | Contact support — ownership transfer requires verification. |

Members receive an email invitation and can join by creating a Prysm account (or signing in with an existing one). All members share access to the organization's projects, traces, and settings.
`,
  },
  {
    id: "cost-tracking",
    title: "Cost Tracking",
    group: "platform",
    summary: "Automatic cost calculation, custom model pricing, and usage limits.",
    markdown: `# Cost Tracking

Prysm automatically calculates the cost of every LLM request based on the model used and the token counts returned by the provider.

## Built-in Pricing

Pricing is pre-configured for popular models including GPT-4o, GPT-4o Mini, Claude Sonnet 4, Claude Haiku, Gemini 2.5 Flash, and more. Prices are updated as providers change their rates.

## Custom Model Pricing

For self-hosted models or providers not in the default list, set custom pricing in **Settings → Cost Tracking**. Specify the input and output cost per 1M tokens.

## Usage Limits

Free tier includes 10,000 requests per month. When you hit the limit, the proxy returns a \`429 Too Many Requests\` response. View your current usage in **Settings → Usage**.
`,
  },

  // ═══════════════════════════════════════════════════════════
  // GROUP: Security & Analysis
  // ═══════════════════════════════════════════════════════════
  {
    id: "security",
    title: "Security",
    group: "security",
    summary: "Prompt injection detection, PII redaction, content policies, and threat scoring.",
    markdown: `# Security

Prysm AI includes a built-in security layer that scans every LLM request in real time before forwarding it to the provider. The security engine detects prompt injection attacks, identifies and redacts PII, enforces content policies, and produces a composite threat score (0–100) for each request.

> Security scanning runs automatically on all proxied requests. No SDK changes required — your existing integration is already protected.

## How It Works

When a request arrives, the security middleware runs three detection engines in parallel:

| Engine | What It Detects | Action |
|--------|-----------------|--------|
| Injection Detector | Prompt injection attacks (20+ patterns across 7 categories) | Flag or block |
| PII Detector | Emails, phone numbers, SSNs, credit cards, API keys, IPs | Mask, hash, or block |
| Content Policy | Hate speech, violence, sexual content, self-harm, illegal activities | Flag or block |

Results are combined into a **composite threat score** (0–100): \`clean\` (0–19), \`low\` (20–39), \`medium\` (40–69), or \`high\` (70–100). When blocking is enabled, \`high\` requests are rejected with a \`403\` before reaching the LLM.

## Prompt Injection Detection

20+ attack patterns organized into 7 categories:

| Category | Example Patterns | Severity |
|----------|------------------|----------|
| Role Manipulation | "ignore previous instructions", "you are now DAN" | High (8–9) |
| Delimiter Injection | "---END SYSTEM---", "[INST]", markdown code fences | Medium (6–7) |
| Context Confusion | "the real instructions are", "admin override" | High (7–8) |
| Encoding Tricks | Base64 encoded instructions, hex-encoded payloads | Medium (6–7) |
| Extraction Attempts | "repeat your system prompt", "show your instructions" | High (7–8) |
| Jailbreak Phrases | "DAN mode", "developer mode", "no restrictions" | Critical (9–10) |
| Multi-language Attacks | Language-switching evasion, mixed-script injection | Medium (5–6) |

## PII Detection & Redaction

8 types of personally identifiable information detected:

| Data Type | Detection Method |
|-----------|-----------------|
| Email Addresses | RFC 5322 regex |
| Phone Numbers | International format regex |
| Social Security Numbers | US SSN format |
| Credit Card Numbers | Luhn algorithm + format |
| API Keys | Provider prefix patterns |
| IP Addresses | IPv4 and IPv6 regex |
| Private Keys | PEM header detection |
| Dates of Birth | Date format patterns |

### Redaction Modes

| Mode | Behavior | Example |
|------|----------|---------|
| \`mask\` | Replace with asterisks | \`user@example.com\` → \`****@*******.***\` |
| \`hash\` | Replace with SHA-256 hash | \`user@example.com\` → \`[SHA256:a1b2c3...]\` |
| \`block\` | Reject the entire request | Returns \`403\` with PII detected message |
| \`log\` | Log but don't modify | Request passes through, PII flagged in trace |

## Content Policies

5 built-in policy categories plus custom keyword lists. Each policy can be set to \`flag\` (log only) or \`block\` (reject request).

## Threat Scoring

The composite threat score combines all detection results with configurable weights. View scores in the Security Dashboard or via the \`X-Prysm-Scan-Result\` response header.
`,
  },
  {
    id: "explainability",
    title: "Explainability",
    group: "security",
    summary: "Token confidence heatmaps, hallucination detection, and decision point analysis.",
    markdown: `# Explainability

Prysm's explainability suite helps you understand why your models produce specific outputs.

## Token Confidence Heatmap

Per-token confidence visualization using logprobs data. Each token is colored on an OKLCH gradient from red (low confidence) to green (high confidence).

- **OpenAI & Gemini**: Native logprobs from the API
- **Anthropic**: Estimated confidence based on token patterns

## Hallucination Detection

Automatic identification of low-confidence segments within completions. The detector flags sequences where multiple consecutive tokens have low confidence scores, indicating the model may be generating unreliable content.

Risk levels: \`low\` (isolated low-confidence tokens), \`medium\` (short low-confidence sequences), \`high\` (extended low-confidence passages).

## "Why Did It Say That?"

LLM-powered explanations for any completion. Select a trace in the Request Explorer and click "Explain" to get a decision analysis covering:
- What the model likely prioritized in the prompt
- Why it chose specific phrasing or content
- Alternative responses it may have considered

## Decision Points Timeline

Visual timeline of high-entropy tokens where the model considered multiple alternatives. Each decision point shows the top candidate tokens and their probabilities, helping you understand where the model was most uncertain.

## Model Comparison

Side-by-side confidence and hallucination risk comparison across traces. Compare how different models handle the same prompt by viewing their confidence distributions together.
`,
  },

  // ═══════════════════════════════════════════════════════════
  // GROUP: Reference
  // ═══════════════════════════════════════════════════════════
  {
    id: "rest-api",
    title: "REST API",
    group: "reference",
    summary: "OpenAI-compatible proxy endpoints for chat completions, completions, and embeddings.",
    markdown: `# REST API

The Prysm proxy exposes OpenAI-compatible endpoints. Any HTTP client or SDK that works with OpenAI works with Prysm — just change the base URL and API key.

## Base URL

\`\`\`
https://prysmai.io/api/v1
\`\`\`

## Authentication

\`\`\`
Authorization: Bearer sk-prysm-your-key-here
\`\`\`

## Endpoints

### POST /chat/completions

Standard OpenAI chat completions endpoint. Supports all parameters including \`stream\`, \`tools\`, \`logprobs\`, \`response_format\`, etc.

\`\`\`bash
curl -X POST https://prysmai.io/api/v1/chat/completions \\
  -H "Authorization: Bearer sk-prysm-..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
\`\`\`

### POST /completions

Legacy text completions endpoint.

### POST /embeddings

Generate embeddings using any supported embedding model.

\`\`\`bash
curl -X POST https://prysmai.io/api/v1/embeddings \\
  -H "Authorization: Bearer sk-prysm-..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "text-embedding-3-small",
    "input": "Hello world"
  }'
\`\`\`

### GET /models

Lists all supported models grouped by provider.

## Custom Headers

| Header | Description |
|--------|-------------|
| \`X-Prysm-User-Id\` | Tag request with a user ID (alternative to SDK context) |
| \`X-Prysm-Session-Id\` | Tag request with a session ID |
| \`X-Prysm-Metadata\` | JSON string of custom metadata |
`,
  },
  {
    id: "providers",
    title: "Providers",
    group: "reference",
    summary: "Configuration for OpenAI, Anthropic, Google Gemini, and custom/self-hosted models.",
    markdown: `# Providers

Prysm supports multiple LLM providers through a unified OpenAI-compatible interface.

## OpenAI

Default provider. No special configuration needed — just use OpenAI model names (\`gpt-4o\`, \`gpt-4o-mini\`, \`o1\`, etc.).

## Anthropic

Prysm includes an automatic translation layer that converts OpenAI-format requests to Anthropic's native format and back. Use Claude model names directly:

\`\`\`python
response = client.chat.completions.create(
    model="claude-sonnet-4-20250514",
    messages=[{"role": "user", "content": "Hello!"}],
)
\`\`\`

Prysm detects the \`claude-*\` prefix and routes to your Anthropic provider key automatically.

## Google Gemini

Google's Gemini models support the OpenAI-compatible endpoint natively. Set the provider base URL to \`https://generativelanguage.googleapis.com/v1beta/openai\` and use your Google AI API key.

## Custom / Self-Hosted Models

Any endpoint that speaks the OpenAI API format works with Prysm. This includes vLLM, Ollama, Together AI, Fireworks, and any other OpenAI-compatible server.
`,
  },
  {
    id: "self-hosted",
    title: "Self-Hosted Proxy",
    group: "reference",
    summary: "Running the Prysm proxy on your own infrastructure.",
    markdown: `# Self-Hosted Proxy

Running the Prysm proxy on your own infrastructure? Point the SDK or your HTTP client at your instance:

\`\`\`python
client = PrysmClient(
    prysm_key="sk-prysm-...",
    base_url="http://localhost:3000/api/v1",
).openai()
\`\`\`

\`\`\`bash
curl -X POST http://localhost:3000/api/v1/chat/completions \\
  -H "Authorization: Bearer sk-prysm-your-key" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "Hello!"}]}'
\`\`\`

\`\`\`typescript
const client = new OpenAI({
  baseURL: "http://localhost:3000/api/v1",
  apiKey: "sk-prysm-your-key",
});
\`\`\`
`,
  },
  {
    id: "cicd",
    title: "CI/CD Integration",
    group: "sdk",
    summary: "Dynamic upstream API keys, custom header forwarding, and CI/CD pipeline integration with GitHub Actions and GitLab.",
    markdown: `# CI/CD Integration

Prysm supports dynamic upstream API keys and custom header forwarding, enabling seamless integration with CI/CD pipelines and AI gateway platforms like GitLab AI Gateway, AWS Bedrock, and Azure OpenAI Service.

## Dynamic Upstream API Key

Override the stored provider API key at request time by passing the \`X-Prysm-Upstream-Key\` header. This is useful when the API key is injected by a CI/CD runner or gateway at runtime.

\`\`\`bash
curl -X POST https://prysmai.io/api/v1/chat/completions \\
  -H "Authorization: Bearer sk-prysm-YOUR_KEY" \\
  -H "X-Prysm-Upstream-Key: glpat-xxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "claude-sonnet-4-20250514", "messages": [{"role": "user", "content": "Hello"}]}'
\`\`\`

## Custom Header Forwarding

Pass custom headers to the upstream provider via \`X-Prysm-Forward-Headers\` (JSON string). \`Content-Type\` and \`Authorization\` cannot be overridden for security.

\`\`\`bash
curl -X POST https://prysmai.io/api/v1/chat/completions \\
  -H "Authorization: Bearer sk-prysm-YOUR_KEY" \\
  -H "X-Prysm-Upstream-Key: $AI_GATEWAY_TOKEN" \\
  -H 'X-Prysm-Forward-Headers: {"X-Gitlab-Instance-Id": "ea8bf810-...", "X-Gitlab-Realm": "saas"}' \\
  -H "Content-Type: application/json" \\
  -d '{"model": "claude-sonnet-4-20250514", "messages": [{"role": "user", "content": "Review this code"}]}'
\`\`\`

## Python SDK Integration

\`\`\`python
import os
import openai
from prysmai import monitor

client = openai.OpenAI()
monitored = monitor(
    client,
    prysm_key="sk-prysm-...",
    upstream_api_key=os.environ["AI_GATEWAY_TOKEN"],
    forward_headers={
        "X-Gitlab-Instance-Id": os.environ.get("CI_SERVER_HOST", ""),
        "X-Gitlab-Realm": "saas",
    },
)

response = monitored.chat.completions.create(
    model="claude-sonnet-4-20250514",
    messages=[{"role": "user", "content": "Hello"}],
)
\`\`\`

## GitHub Actions Example

\`\`\`yaml
# .github/workflows/ai-tests.yml
name: AI Agent Tests with Prysm Observability

on:
  pull_request:
    branches: [main]

jobs:
  test-langgraph:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Install dependencies
        run: pip install prysmai[langgraph] pytest -r requirements.txt
      - name: Run LangGraph tests with Prysm
        env:
          PRYSM_API_KEY: \${{ secrets.PRYSM_API_KEY }}
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
        run: pytest tests/ -v
\`\`\`

| Header | Required | Description |
|--------|----------|-------------|
| \`X-Prysm-Upstream-Key\` | Optional | Overrides the stored provider API key for this request |
| \`X-Prysm-Forward-Headers\` | Optional | JSON string of headers to forward to the upstream provider |
`,
  },
  {
    id: "endpoints",
    title: "All Endpoints",
    group: "reference",
    summary: "Complete reference of all proxy endpoints including WebSocket live feed.",
    markdown: `# All Endpoints

All endpoints require a valid \`sk-prysm-*\` API key in the \`Authorization: Bearer\` header unless noted.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | \`/api/v1/chat/completions\` | Chat completions (OpenAI-compatible). Supports streaming. |
| POST | \`/api/v1/completions\` | Text completions (legacy). Supports streaming. |
| POST | \`/api/v1/embeddings\` | Generate embeddings for text input. |
| GET | \`/api/v1/models\` | List all supported models grouped by provider. No auth required. |
| GET | \`/api/v1/health\` | Health check. Returns status, supported models, and version. No auth required. |
| POST | \`/api/mcp\` | MCP governance endpoint (JSON-RPC 2.0 over Streamable HTTP). |

## WebSocket Live Feed

Connect to the WebSocket endpoint to receive real-time trace events.

\`\`\`javascript
const ws = new WebSocket("wss://prysmai.io/ws/live-feed?projectId=YOUR_PROJECT_ID");

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "trace") {
    console.log("New trace:", data.trace);
  }
};
\`\`\`
`,
  },
  {
    id: "response-headers",
    title: "Response Headers",
    group: "reference",
    summary: "Security scan headers and rate limit headers returned on every proxy response.",
    markdown: `# Response Headers

Every response from the Prysm proxy includes headers that expose security scan results and rate limit information.

## Security Scan Headers

| Header | Example | Description |
|--------|---------|-------------|
| \`X-Prysm-Threat-Score\` | \`0.12\` | Input threat score (0.0-1.0). Higher = more suspicious. |
| \`X-Prysm-Threat-Level\` | \`clean\` | Human-readable threat classification. |
| \`X-Prysm-Scan-Result\` | \`No threats detected\` | Summary of the input scan. |
| \`X-Prysm-Scan-Tier\` | \`standard\` | Which scanning tier was applied. |
| \`X-Prysm-Off-Topic\` | \`false\` | Whether the input was flagged as off-topic. |
| \`X-Prysm-Output-Threat-Score\` | \`0.05\` | Output threat score. |
| \`X-Prysm-Output-Flags\` | \`none\` | Comma-separated output scan flags. |
| \`X-Prysm-Output-Scan-Result\` | \`clean\` | Summary of the output scan. |
| \`X-Prysm-Entities-Detected\` | \`PERSON:2,ORG:1\` | NER entities found in the output. |
| \`X-Prysm-ML-Toxicity-Flags\` | \`none\` | ML toxicity dimensions that exceeded threshold. |
| \`X-Prysm-Policy-Violations\` | \`none\` | Output policy rules that were violated. |

## Rate Limit Headers

| Header | Example | Description |
|--------|---------|-------------|
| \`X-RateLimit-Limit\` | \`60\` | Maximum requests allowed in the current window. |
| \`X-RateLimit-Remaining\` | \`47\` | Requests remaining in the current window. |
| \`X-RateLimit-Reset\` | \`1709654400\` | Unix timestamp when the rate limit window resets. |
| \`Retry-After\` | \`30\` | Seconds to wait before retrying (only on 429 responses). |

> **Tip:** Use \`X-RateLimit-Remaining\` to implement proactive throttling. When it drops below 10, start adding delays between requests.
`,
  },
  {
    id: "advanced",
    title: "Advanced Features",
    group: "reference",
    summary: "Tool calling, logprobs, and the complete list of captured data fields.",
    markdown: `# Advanced Features

## Tool Calling / Function Calling

Prysm captures tool calls from OpenAI, Anthropic, and Google Gemini models. When a model returns tool calls, they're stored in the trace and displayed in the Request Explorer.

\`\`\`python
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "What's the weather in London?"}],
    tools=[{
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get current weather for a city",
            "parameters": {
                "type": "object",
                "properties": {"city": {"type": "string"}},
                "required": ["city"]
            }
        }
    }],
)
\`\`\`

## Logprobs

Request logprobs from OpenAI and they'll be captured in the trace.

\`\`\`python
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "The capital of France is"}],
    logprobs=True,
    top_logprobs=3,
)
\`\`\`

## What Gets Captured

| Field | Description |
|-------|-------------|
| Model | Which model was called |
| Provider | The upstream provider |
| Latency | Total request duration in milliseconds |
| TTFT | Time to first token (streaming only) |
| Prompt tokens | Input token count |
| Completion tokens | Output token count |
| Cost | Calculated cost based on model pricing (USD) |
| Status | success, error, or timeout |
| Request body | Full messages array, tools, and parameters |
| Response body | Complete model response |
| Tool calls | Function/tool calls returned by the model |
| Logprobs | Token log probabilities (if requested) |
| User ID | From header or prysm_context |
| Session ID | From header or prysm_context |
| Custom metadata | From header or prysm_context |
| Finish reason | stop, length, tool_calls, or content_filter |
`,
  },
  {
    id: "examples",
    title: "Example Applications",
    group: "reference",
    summary: "Full working applications demonstrating Prysm AI capabilities.",
    markdown: `# Example Applications

## AI Debate Arena

**Full-Stack** | Python + FastAPI

A real-time debate application where GPT-4o Mini and Claude Sonnet 4 argue any topic across 10 rounds — including 4 adversarial attack rounds with prompt injection, jailbreak attempts, context manipulation, and authority spoofing. Every API call is traced through Prysm, every attack is detected and blocked in real time.

**What it demonstrates:**
- Drop-in SDK integration with OpenAI + Anthropic
- Real-time prompt injection detection & blocking
- Multi-provider tracing in a single session
- Live security event streaming via SSE
- Confidence scoring on every response
- Dashboard session filtering & drill-down

\`\`\`bash
git clone https://github.com/osasisorae/debate-arena.git
cd debate-arena
pip install -r requirements.txt
cp .env.example .env
# Set PRYSM_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY
python app.py
\`\`\`

> **Building something with Prysm?** We'd love to feature your project. Reach out at osarenrenisaiah@gmail.com or open a PR on GitHub.
`,
  },
  {
    id: "errors",
    title: "Error Handling",
    group: "reference",
    summary: "Error types, Prysm-specific errors, and common troubleshooting patterns.",
    markdown: `# Error Handling

The proxy preserves upstream error types. If the LLM provider returns an error, you get the same exception you'd get without Prysm.

\`\`\`python
import openai

try:
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "test"}],
    )
except openai.AuthenticationError:
    print("Invalid upstream API key (check project settings)")
except openai.RateLimitError:
    print("Provider rate limited")
except openai.APIError as e:
    print(f"API error: {e}")
\`\`\`

## Prysm-Specific Errors

| Status | Error | Cause |
|--------|-------|-------|
| \`401\` | Invalid API key | The \`sk-prysm-*\` key is missing, malformed, or revoked |
| \`403\` | Request blocked | Security scan detected a high-threat request (injection, PII, policy violation) |
| \`404\` | Project not found | The API key doesn't belong to any active project |
| \`429\` | Rate limited | Free tier limit reached (10K requests/month) |
| \`502\` | Provider error | Upstream provider returned an error or is unreachable |
| \`504\` | Timeout | Request to the upstream provider timed out |

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| \`401\` on every request | Wrong API key format | Ensure key starts with \`sk-prysm-\` |
| \`502\` on first request | Provider not configured | Add provider API key in Settings |
| Traces missing in dashboard | Key mismatch | Verify the key in your code matches dashboard |
| High latency | Cold start or provider slowness | Check provider status page; first request is slower |
| \`403\` unexpected blocks | Security too aggressive | Lower threat threshold in Security settings |
`,
  },
  {
    id: "changelog",
    title: "Changelog",
    group: "reference",
    summary: "Version history and release notes for the Prysm AI SDK and platform.",
    markdown: `# Changelog

## v0.5.0 — March 8, 2026 (Latest)

**Governance Layer & LangGraph Integration**

- **NEW** \`GovernanceSession\` — context manager for monitoring agent sessions with behavioral detection, code scanning, and policy enforcement via MCP.
- **NEW** Early Stopping detector — catches agents that quit before completing their stated task.
- **NEW** Tool Undertriggering detector — identifies when agents have tools available but fail to use them.
- **NEW** Code Security Scanner — scans agent-generated code for injection flaws, hardcoded secrets, unsafe deserialization, and more.
- **NEW** MCP endpoint at \`/api/mcp\` — Streamable HTTP transport with JSON-RPC 2.0 for direct agent integration.
- **NEW** \`PrysmGraphMonitor\` — LangGraph integration replacing LangChain, with graph-aware telemetry.
- **NEW** \`governance=True\` flag on LangGraph and CrewAI integrations for automatic behavioral detection.
- **NEW** Session Explorer, Governance Dashboard, and Policy Manager views in the web dashboard.
- **BREAKING** Removed \`PrysmCallbackHandler\` (LangChain). Use \`PrysmGraphMonitor\` (LangGraph) instead.

## v0.4.1 — March 5, 2026

**SDK Bug Fixes & Platform Hardening**

- Fixed \`PrysmCallbackHandler.on_chain_start\` crashing with \`AttributeError\` when LangChain passes \`serialized=None\`.
- Added per-request rate limiting with \`X-RateLimit-*\` headers.
- Fixed \`PrysmCrewMonitor\` crashing on malformed delegation tool arguments.
- **NEW** \`GET /api/v1/models\` endpoint.
- **NEW** Response headers for security scan results.
- **NEW** PagerDuty alert channel support.

## v0.4.0 — February 2026

**Security Suite & Framework Integrations**

- **NEW** Off-topic detection, ML toxicity scoring, NER-based PII detection.
- **NEW** Output policy engine with keyword blocklist, regex, and LLM-judged rules.
- **NEW** Tiered scanning (Basic, Standard, Deep).
- **NEW** Alert channels (Email, Slack, Discord, Webhook).
- **NEW** Framework integrations (CrewAI, LlamaIndex).
- **NEW** Anthropic translation layer.
- **NEW** Confidence analysis and explainability suite.
`,
  },
  // ═══════════════════════════════════════════════════════════
  // GROUP: Agent Tracing (Phase 2)
  // ═══════════════════════════════════════════════════════════
  {
    id: "agent-framework",
    title: "Microsoft Agent Framework",
    group: "agent-tracing",
    summary: "Integrate Prysm with Microsoft Agent Framework for full agent observability.",
    markdown: `# Microsoft Agent Framework Integration

Prysm provides first-class integration with [Microsoft Agent Framework](https://github.com/microsoft/agent-framework), capturing agent runs, function/tool calls, and LLM chat completions through the framework's middleware system.

## Installation

\`\`\`bash
pip install prysmai[agent-framework]
\`\`\`

## Quick Start

\`\`\`python
from prysmai.integrations.agent_framework import (
    PrysmAgentMiddleware,
    PrysmFunctionMiddleware,
    PrysmChatMiddleware,
)
import prysmai

# Initialize Prysm
prysmai.init(api_key="sk-prysm-...", project="my-project")

# Create middleware instances
agent_mw = PrysmAgentMiddleware(session_id="my-session")
function_mw = PrysmFunctionMiddleware(session_id="my-session")
chat_mw = PrysmChatMiddleware(session_id="my-session")

# Register with your Agent Framework runtime
runtime.add_middleware(agent_mw)
runtime.add_middleware(function_mw)
runtime.add_middleware(chat_mw)
\`\`\`

## What Gets Captured

| Middleware | Events | Data |
|-----------|--------|------|
| PrysmAgentMiddleware | Agent start/end | Agent type, messages, timing, errors |
| PrysmFunctionMiddleware | Tool/function calls | Function name, args, result, duration |
| PrysmChatMiddleware | LLM completions | Messages, model, tokens, response |

## Governance Mode

All three middleware classes accept a \`governance_session\` parameter to forward events to the governance engine for behavioral analysis:

\`\`\`python
from prysmai import GovernanceSession

session = GovernanceSession(api_key="sk-prysm-...", project="my-project")
agent_mw = PrysmAgentMiddleware(session_id="s1", governance_session=session)
\`\`\`
`,
  },
  {
    id: "unified-timeline",
    title: "Unified Timeline",
    group: "agent-tracing",
    summary: "Correlated view of LLM traces, tool events, and session events.",
    markdown: `# Unified Timeline

The Unified Timeline merges three data sources into a single chronologically-ordered stream:

1. **LLM Traces** — captured by the proxy (model, tokens, latency, cost)
2. **Session Events** — captured by SDK integrations (tool calls, decisions, delegations)
3. **Agent Sessions** — captured by governance layer (session metadata, behavioral scores)

## Dashboard

Navigate to **Dashboard → Timeline** to see the unified view. You can filter by:

- Time range (1h, 24h, 7d, all time)
- Event type (LLM calls, tool calls, decisions, errors)
- Session ID
- Free-text search

Each event shows its source (LLM Trace or Session Event), timing, and relevant metrics. Click to expand for full details.

## API

\`\`\`
GET /api/trpc/unifiedTrace.getTimeline
\`\`\`

Parameters: \`projectId\`, \`sessionId?\`, \`from?\`, \`to?\`, \`eventTypes?\`, \`limit\`, \`offset\`

Returns \`{ events: UnifiedTimelineEvent[], total: number }\`
`,
  },
  {
    id: "tool-performance",
    title: "Tool Performance",
    group: "agent-tracing",
    summary: "Monitor tool execution metrics, success rates, and latency patterns.",
    markdown: `# Tool Performance Dashboard

The Tool Performance dashboard provides aggregated metrics for every tool your agents use.

## Metrics

| Metric | Description |
|--------|-------------|
| Total Calls | Number of times the tool was invoked |
| Success Rate | Percentage of successful invocations |
| Avg Latency | Mean execution time |
| Max Latency | Slowest execution |
| Failure Count | Number of failed invocations |

## Visualizations

- **Bar Chart** — calls by tool with failure overlay
- **Scatter Plot** — latency timeline showing each call as a dot (green=success, red=failure)
- **Failure Analysis** — ranked list of tools with highest failure rates

## Dashboard

Navigate to **Dashboard → Tool Perf** to access the dashboard. Click any tool in the metrics table to filter the scatter plot to that specific tool.
`,
  },
  {
    id: "agent-decisions",
    title: "Agent Decisions",
    group: "agent-tracing",
    summary: "Understand why your agent chose specific tools and actions.",
    markdown: `# Agent Decision Explainability

The Agent Decisions page answers the question: **"Why did my agent choose that tool / take that action?"**

For each decision event in a session, Prysm shows:

1. **Context** — the preceding events (LLM calls, tool results) that led to this decision
2. **The Decision** — what the agent chose to do
3. **Consequence** — what happened after the decision
4. **Triggering LLM Call** — the specific LLM call that produced this decision

## How It Works

Decision events are recorded when:
- The agent selects a tool (\`tool_call\` events)
- The agent makes an explicit decision (\`decision\` events)
- The agent delegates to a sub-agent (\`delegation\` events)

For each decision, Prysm looks backward through the event sequence to find the closest preceding LLM call — this is the model invocation that likely produced the decision.

## Dashboard

Navigate to **Dashboard → Decisions**, select a session, and click any decision card to expand the full context view.
`,
  },
  {
    id: "workflow-graph",
    title: "Workflow Graph",
    group: "agent-tracing",
    summary: "Directed execution graph showing node-to-node flow for agent sessions.",
    markdown: `# Workflow Graph

The Workflow Graph renders a directed execution graph for any agent session, showing the flow from agent start through LLM calls, tool calls, decisions, and delegations.

## Node Types

| Type | Color | Description |
|------|-------|-------------|
| Agent Run | Indigo | The root session node |
| LLM Call | Violet | A call to a language model |
| Tool Call | Cyan | A tool/function invocation |
| Decision | Amber | An explicit decision point |
| Delegation | Blue | Delegation to a sub-agent |
| Code | Emerald | Code generation or execution |
| Error | Red | An error event |

## Interaction

- **Pan** — click and drag the canvas
- **Zoom** — scroll wheel or use the +/- buttons
- **Inspect** — click any node to see its metadata in the detail panel

## Dashboard

Navigate to **Dashboard → Workflow**, select a session, and the graph renders automatically.
`,
  },
];

/**
 * Get all docs as a single Markdown string.
 */
export function getAllDocsMarkdown(): string {
  return DOCS.map((s) => s.markdown).join("\n\n---\n\n");
}

/**
 * Get a specific section's Markdown by ID.
 */
export function getSectionMarkdown(id: string): string | null {
  const section = DOCS.find((s) => s.id === id);
  return section?.markdown ?? null;
}

/**
 * Search docs by keyword (case-insensitive).
 * Returns matching sections with relevance snippets.
 */
export function searchDocs(query: string): Array<{ id: string; title: string; summary: string; snippet: string }> {
  const q = query.toLowerCase();
  return DOCS
    .filter((s) => s.markdown.toLowerCase().includes(q) || s.title.toLowerCase().includes(q))
    .map((s) => {
      const idx = s.markdown.toLowerCase().indexOf(q);
      const start = Math.max(0, idx - 80);
      const end = Math.min(s.markdown.length, idx + query.length + 80);
      const snippet = (start > 0 ? "..." : "") + s.markdown.slice(start, end).replace(/\n/g, " ") + (end < s.markdown.length ? "..." : "");
      return { id: s.id, title: s.title, summary: s.summary, snippet };
    });
}
