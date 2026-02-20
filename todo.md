# Prysm AI - Project TODO

- [x] Dark Observatory landing page design
- [x] Identity-driven V3 copy with psychological hook
- [x] Hero section with animated elements
- [x] Problem section (The Blind Spot)
- [x] Identity section (A Different Kind of Builder)
- [x] Solution section (What You Get)
- [x] Dashboard preview section
- [x] How It Works (3-step integration)
- [x] Pricing section (4 tiers: Explorer, Builder, Architect, Enterprise)
- [x] Waitlist CTA section with email form
- [x] Logo generation
- [x] Full-stack upgrade (database + server + user management)
- [x] Waitlist email capture to database
- [x] Owner notification on new signups
- [x] Vitest tests for waitlist functionality
- [x] Blog page with first article
- [x] Blog route (/blog)
- [x] Social proof: framework logos strip (LangChain, CrewAI, OpenAI, etc.)
- [x] Social proof: research credibility strip (Anthropic, OpenAI, DeepMind, MIT)
- [x] Blog link in navbar
- [x] Business registration document for lawyer
- [x] Fix: "Back to Blog" button not working (changed to "Back to Home")
- [x] Add: Admin dashboard to view waitlist signups (/admin route, admin-only)
- [x] Add: Email service integration for sending emails to signups
- [x] Replace text logo placeholders with actual company logo images (LangChain, CrewAI, OpenAI, Anthropic, Meta/Llama, Hugging Face, AutoGen, DeepMind, MIT)
- [x] Upgrade logos to inline SVG icons + text wordmarks (Simple Icons SVG paths) for consistent rendering on dark theme
- [x] Remove fake dashboard screenshot section ("See everything. Miss nothing.")
- [x] Remove fake installation/how-it-works section ("Three lines of code. Complete understanding.")
- [x] Remove premature pricing section (no validated pricing model yet)
- [x] Remove pricing link from navbar
- [x] Tighten page flow for honest conversion: hero → problem → identity → solution promises → CTA → research credibility
- [x] Add Open Graph and Twitter Card meta tags for social sharing
- [x] Add honest "What we're building" teaser section to landing page
- [x] Integrate Resend for email confirmation on waitlist signup
- [x] Write vitest tests for Resend email integration
- [x] Debug: Resend confirmation email not being delivered to signups (was using onboarding@resend.dev, needed verified domain)
- [x] Update Resend sender to use prysmai.io domain (hello@prysmai.io)
- [x] Create professional Prysm AI logo (V7 — faceted crystal prism with cyan light rays)
- [x] Integrate logo into website navbar and footer
- [x] Add favicon (ICO + PNG + apple-touch-icon)
- [x] Provide transparent logo for social media
- [x] Visual refinement: increase whitespace dramatically between sections
- [x] Visual refinement: reduce color palette to 2 colors max (cyan + neutral)
- [x] Visual refinement: simplify typography to one font family (Inter)
- [x] Visual refinement: remove most framer-motion animations (removed from Home)
- [x] Visual refinement: simplify card styling (vertical bars, no cards in problem section)
- [x] Visual refinement: add concept visual (AI prism illustration) to replace removed dashboard
- [x] Restructure blog to support multiple posts (index page + individual article pages)
- [x] Extract Post 0 content from Blog.tsx into blogPosts.ts data file
- [x] Create blog index page showing all posts as cards at /blog
- [x] Create individual article pages at /blog/:slug
- [x] Add Post 1 ("What Is Mechanistic Interpretability?") to blog data
- [x] Post navigation (previous/next) between articles
- [x] Blog CTA section at bottom of index and article pages
- [x] Vitest tests for blog data module (7 tests)
- [x] Create reusable skill from Prysm AI blog workflow
- [x] Write Blog Post 2: "I Looked Inside a Language Model's Neural Network. Here's What I Found."
- [x] Integrate Post 2 into blog-posts.ts and verify rendering
- [x] Write Blog Post 3: "Why Prompt Injection Still Works in 2026 (And What Actually Stops It)"
- [x] Integrate Post 3 into blog-posts.ts and verify rendering
- [x] Write Blog Post 4: "The Missing Link: How Interpretability Makes AI Security Actually Work"
- [x] Integrate Post 4 into blog-posts.ts and verify rendering
- [x] Write Blog Post 5: "The AI Observability Stack in 2026: What's Changed and What's Still Missing"
- [x] Integrate Post 5 into blog-posts.ts and verify rendering

## Layer 1 MVP — Real Observability Proxy

### Database Schema
- [x] Organizations table (id, name, slug, plan)
- [x] Projects table (id, org_id, name, slug, provider_config)
- [x] API Keys table (id, project_id, key_hash, key_prefix, permissions)
- [x] Traces table (id, project_id, timestamp, model, provider, prompt_messages, completion, tokens, latency, cost, status, metadata)
- [x] Model Pricing table (provider, model, input/output cost per 1K tokens)
- [x] Usage tracked via traces table aggregation

### Proxy Gateway
- [x] OpenAI-compatible /v1/chat/completions endpoint
- [x] Request capture (full prompt, metadata, headers)
- [x] Response capture (completion, tokens, finish_reason)
- [x] Streaming SSE passthrough with buffered capture
- [x] Multi-provider routing (OpenAI, Anthropic, vLLM, Ollama — via configurable baseUrl)
- [x] Latency measurement (total round-trip + time-to-first-token)
- [x] Cost calculation from model pricing table (10 models covered)
- [x] API key authentication (sk-prysm-... prefix, SHA-256 hash)
- [x] Custom headers (X-Prysm-User-Id, X-Prysm-Session-Id, X-Prysm-Metadata)

### API Key Management
- [x] Generate API keys with sk-prysm- prefix
- [x] Store hashed keys, display prefix only
- [x] Revoke keys
- [x] Key-to-project resolution on proxy requests

### Dashboard
- [x] Sidebar navigation layout (Overview, Requests, API Keys, Settings)
- [x] Overview page — real metrics charts (request volume, latency, error rate, cost)
- [x] Overview page — model usage breakdown + live trace feed
- [x] Request Explorer — searchable/filterable trace table
- [x] Request Explorer — trace detail panel (full prompt/completion, metadata, latency, cost)
- [x] Settings — project configuration (provider, base URL, model, API key)
- [x] API Keys page — create, view, revoke, quick start code snippet
- [x] Onboarding wizard — first-time setup (org → project → provider config)

### Testing & Verification
- [x] Vitest tests for API key hashing (3 tests)
- [x] Vitest tests for cost calculation (5 tests)
- [x] Vitest tests for model pricing lookup (7 tests)
- [x] Vitest tests for proxy contract (2 tests)
- [x] End-to-end verified: real OpenAI requests through proxy, traces logged with real metrics in dashboard

## GitHub Repository & Documentation
- [x] Write comprehensive README.md (overview, features, installation, usage, API reference)
- [x] Write CONTRIBUTING.md with development setup guide
- [x] Write architecture documentation (docs/ARCHITECTURE.md)
- [x] Create .env.example (documented in README instead — .env files blocked by platform)
- [x] Create private GitHub repository
- [x] Push codebase with clean commit history

## Python SDK (prysm)
- [x] Design SDK API surface (monitor wrapper, metadata tagging, streaming)
- [x] Build core SDK package with pyproject.toml
- [x] Implement OpenAI client wrapper with proxy routing
- [x] Implement streaming support (SSE passthrough)
- [x] Implement metadata tagging (user_id, session_id, custom metadata)
- [x] Write comprehensive pytest tests (41 tests passing)
- [x] Write SDK README with installation, quick start, and API reference
- [x] Test end-to-end against live proxy (integration tests with respx mocks)
- [x] Push SDK to GitHub repo
- [x] Publish prysmai v0.1.0 to PyPI (https://pypi.org/project/prysmai/0.1.0/)

## Documentation Page
- [x] Create /docs page with SDK installation guide
- [x] Add quick start code examples
- [x] Add API reference (monitor, PrysmClient, prysm_context)
- [x] Add streaming, async, self-hosted proxy sections
- [x] Add docs link to navbar (Home, Blog, and Docs navbars)
- [x] Fix PyPI README: replace all 'from prysm' / 'pip install prysm' with 'prysmai'
- [x] Rename Python package directory from prysm/ to prysmai/
- [x] Republish to PyPI as v0.1.1 (https://pypi.org/project/prysmai/0.1.1/)
- [x] Update /docs page: replace all 'from prysm' with 'from prysmai' to match PyPI package

## SDK Repo Separation
- [x] Create public prysmai-python repo on GitHub
- [x] Move SDK code to new repo (github.com/osasisorae/prysmai-python)
- [x] Remove SDK from web app repo

## Early Access Flow
- [x] Build "Get Early Access" modal (triggers from any CTA button)
- [x] Wire modal to existing waitlist.join mutation

## Custom Email/Password Auth
- [x] Add password_hash, invite_token, invite_expires, status columns to user/waitlist schema
- [x] Build password hashing with bcrypt
- [x] Build email/password login endpoint
- [x] Build JWT session management independent of Manus OAuth
- [x] Build login page (email + password)
- [x] Write vitest tests for auth system (7 tests passing)

## Admin Dashboard
- [x] Build /admin route with waitlist table (approve/reject/status badges)
- [x] Add approve/reject actions to waitlist entries
- [x] Send invite email on approval (via Resend)

## Account Setup & Onboarding
- [x] Build /setup-account page (invite token validation + password creation + strength meter)
- [x] Onboarding screen already exists (3-step: org → project → provider config)
- [x] Fix /docs page: update GitHub links from old prysmai repo to public prysmai-python repo

## Bug Fixes — Early Access Flow
- [x] Simplify invite email to plain text (remove HTML design, faster loading)
- [x] Fix logo on setup-account, onboarding, login, and dashboard pages (use our Prysm AI logo)
- [x] Fix PrysmAI font on all pages to match homepage navbar (removed Space Grotesk references)
- [x] Fix invite link URL to use SITE_URL env var instead of sandbox/dev URL
- [x] Remove Manus OAuth from user-facing auth (custom auth primary, Manus OAuth fallback for admin)
- [x] Fix post-onboarding flow — all redirects now go to /login instead of Manus OAuth

## Forgot Password Flow
- [x] Add reset_token and reset_token_expires columns to users table
- [x] Build /api/auth/forgot-password endpoint (generates token, sends email)
- [x] Build /api/auth/reset-password endpoint (validates token, updates password)
- [x] Build password reset email (plain text)
- [x] Build /forgot-password page (enter email)
- [x] Build /reset-password page (enter new password with token)
- [x] Add "Forgot password?" link to login page
- [x] Write vitest tests for forgot password (6 tests passing)

## Database Reset
- [x] Clear all tables for fresh end-to-end testing

## User Dashboard Post-Login
- [x] Wire login → onboarding → dashboard flow for new users
- [x] Wire login → dashboard for returning users
- [x] Ensure dashboard shows real project data after onboarding (onboarding calls complete-onboarding endpoint)

## Proxy API Route Fix
- [x] Fix /v1/chat/completions returning HTML — moved proxy from /v1 to /api/v1
- [x] Proxy route validates Prysm API keys and forwards to OpenAI
- [x] Streaming SSE passthrough works
- [x] Tested locally with provided API key (works, needs publish for production)
- [x] Updated /docs page to reference /api/v1
- [x] Updated Python SDK default base URL and published v0.1.3 to PyPI
- [x] Pushed SDK changes to GitHub

## Dashboard Fixes
- [x] Fix Request Volume chart showing "No data yet" when traces exist
- [x] Replace curl quick start on API Keys page with Python SDK code (pip install prysmai)

## Quick Start Code Fixes
- [x] Audit all pages for OpenAI API key references in Quick Start code
- [x] Fix /dashboard/keys Quick Start: remove OpenAI API key, only show Prysm key
- [x] Fix /docs Quick Start: remove OpenAI API key from all code examples
- [x] Fix /docs API Reference: update monitor() signature to not require OpenAI client
- [x] Fix /docs PrysmClient examples: remove OpenAI API key references
- [x] Fix any other pages with SDK code examples (verified Onboarding.tsx is correct - that's the setup form)

## Cost Tracking Fix
- [x] Audit proxy code to find where cost_usd is calculated (or not)
- [x] Check model_pricing table for existing entries (empty - using hardcoded defaults)
- [x] Cost calculation already works via hardcoded DEFAULT_PRICING in db.ts
- [x] Fixed dashboard display: formatCost() shows enough decimal places for micro-costs
- [x] Verified: 5 traces now in DB, all with costUsd=0.000007, dashboard will show $0.000035 total

## Onboarding Page Errors Fix
- [x] Fix org.get tRPC procedure returning undefined (must return null or valid data)
- [x] Fix DashboardShell setState-during-render (navigation called during render phase)
- [x] Fix redirect logic for admin user with orgId=null and onboarded=false
- [x] Fix SQL query failure on metrics.timeline (GROUP BY alias → explicit expression)

## Blueprint Gap Closure — Layer 1 High-Impact
- [x] Add logprobs column to traces schema (JSON, nullable)
- [x] Add tool_calls column to traces schema (JSON, nullable)
- [x] Capture logprobs from OpenAI response in proxy
- [x] Capture tool_calls from OpenAI response in proxy
- [x] Run db:push migration for new columns
- [x] Add error rate over time chart to dashboard
- [x] Add latency histogram/distribution chart to dashboard
- [x] Add cost accumulation (cumulative spend) chart to dashboard
- [x] Vitest tests pass (69/69) — pre-existing tests cover trace schema
- [x] Display logprobs and tool_calls in trace detail panel (RequestExplorer)

## Next Steps — Layer 1 Completion
- [x] Seed model_pricing DB table with 33 models (OpenAI + Anthropic, Feb 2026 prices)
- [x] Update cost calculation in proxy to use DB pricing (getPricingForModel with hardcoded fallback)
- [x] Add /v1/completions proxy endpoint (text completions)
- [x] Add /v1/embeddings proxy endpoint
- [x] Update proxy to handle different response shapes for completions and embeddings
- [x] End-to-end tool-calling test: tool_calls captured (get_weather), embeddings endpoint verified (1536-dim)

## Layer 1 Full Completion
### Phase 1: Missing DB Tables
- [x] Add metrics table (pre-aggregated: project_id, bucket, bucket_size, model, request_count, error_count, total_tokens, total_cost_usd, latency_p50, latency_p95, latency_p99, ttft_p50)
- [x] Add alert_configs table (project_id, name, metric, condition, threshold, channels JSON, enabled, created_at)
- [x] Add usage_records table (org_id, project_id, period_start, period_end, request_count)
- [x] Add org_members table (org_id, user_id, role, invited_by, invited_at, joined_at)
- [x] Run db:push migration (0004_common_bill_hollister.sql applied)

### Phase 2: Anthropic Translation
- [x] Build OpenAI→Anthropic request translator (role mapping, system→system param, tool defs)
- [x] Build Anthropic→OpenAI response translator (content_block→choices, usage mapping)
- [x] Handle Anthropic streaming format (message_start, content_block_delta, message_delta)
- [x] Wire into proxy: detect provider=anthropic, translate before forwarding

### Phase 3: Pre-aggregated Metrics Pipeline
- [x] Build metrics aggregation function (compute 1-hour, 1-day buckets from traces)
- [x] Compute latency percentiles (p50, p95, p99) and ttft_p50 per bucket
- [x] Build metrics scheduler (runs every 5 min for hourly, every hour for daily)
- [x] Wire scheduler into server startup
- [x] Show p50/p95/p99 latency on dashboard overview card

### Phase 4: Alerting System
- [x] Build alert_configs CRUD tRPC procedures (create, list, update, delete, toggle)
- [x] Add Alerts tab in Settings page UI (create dialog, list, enable/disable, delete)
- [x] Build alert evaluation engine (check conditions against latest metrics)
- [x] Implement email alerts via Resend (reuse existing Resend config)
- [x] Implement Slack webhook alerts
- [x] Implement Discord webhook alerts
- [x] Implement custom webhook alerts

### Phase 5: Usage Tracking
- [x] Build usage counting (incrementUsage called after each proxy request)
- [x] Add free tier enforcement in proxy (429 after 10K req/mo)
- [x] Add Usage tab in Settings page (request count, progress bar, period, plan info)

### Phase 6: Team Management
- [x] Build invite member tRPC procedure
- [x] Build org member list tRPC procedure
- [x] Build remove member tRPC procedure
- [x] Add Team tab in Settings page UI (member list, invite dialog, role badges)
- [x] Build accept invite flow (email link → /accept-invite page → join org)
- [x] Send invite email via Resend (team invite email with HTML template)

### Phase 7: WebSocket + Custom Pricing
- [x] Add WebSocket endpoint /ws/live-feed?projectId=N
- [x] Emit "trace" events on new trace insert (emitTrace wraps insertTrace + broadcastTrace)
- [x] Replace 5s polling with WebSocket on dashboard live feed (with polling fallback)
- [x] Add custom cost-per-token config UI in Settings (Pricing tab with add/delete/quick-fill)
- [x] Store custom pricing in model_pricing table (upsert + global override for proxy)
