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

## Bug Fixes
- [x] Fix Vite HMR WebSocket connection failure (switched to noServer mode + manual upgrade handler for /ws/live-feed only)

## Layer 1 Full Test Suite
- [x] Write Anthropic translator tests (32 tests: request translation, response translation, streaming, headers)
- [x] Write alert condition evaluation unit tests (25 tests: all operators gt/gte/lt/lte/eq + edge cases)
- [x] Write metrics scheduler tests (start/stop exports)
- [x] Write proxy & DB helper tests (24 tests: hashApiKey edge cases, calculateCost edge cases, pricing lookup, module exports)
- [x] Create comprehensive manual QA testing document for external tester (109 tests across 18 categories)

## Documentation Page Overhaul
- [x] Audit current /docs page against all Layer 1 features (found 13 major gaps)
- [x] Research competitor documentation pages (Langfuse, Helicone, Portkey)
- [x] Rewrite /docs page with comprehensive Layer 1 coverage (14 sections, full platform docs)

## GitHub README & PyPI Update
- [x] Audit current prysmai-python README against Layer 1 features
- [x] Rewrite README with full platform overview + SDK documentation (14 sections)
- [x] Bump SDK version to 0.2.0 and republish to PyPI
- [x] Verify GitHub and PyPI pages show updated content

## Google Gemini Provider Support
- [x] Research Gemini API format (discovered native OpenAI-compatible endpoint — no translator needed)
- [x] Add Google provider detection in proxy (model name prefix + base URL detection)
- [x] Route Google requests through OpenAI-compatible endpoint at generativelanguage.googleapis.com/v1beta/openai
- [x] Add Gemini model pricing (2.5-pro, 2.5-flash, 2.5-flash-lite, 2.0-flash, 2.0-flash-lite, 3-pro, 3-flash, 3.1-pro, 1.5-pro, 1.5-flash)
- [x] Update Settings UI — Google Gemini in provider dropdown + Gemini models in quick-fill
- [x] Update /docs page — provider table, feature table, dedicated Google Gemini section, pricing table
- [x] Write tests for Gemini provider support (29 tests: detection, URL resolution, pricing, request format)

## GitHub README & PyPI — Gemini Update
- [x] Update README with Google Gemini provider support (provider table, example, pricing)
- [x] Bump version to 0.2.1 and republish to PyPI (https://pypi.org/project/prysmai/0.2.1/)

## Layer 2: Security
### Prompt Injection Detection
- [x] Research prompt injection patterns (OWASP LLM Top 10, Pangea taxonomy of 145+ techniques)
- [x] Build pattern-matching engine (20+ regex patterns: role hijacking, system prompt extraction, encoding attacks, delimiter injection, etc.)
- [x] Build heuristic scoring (weighted scoring across 6 categories)
- [x] Wire injection detection into proxy pipeline (pre-request via security middleware)
- [x] Add configurable block/warn/log modes (per-project security config)

### PII / Sensitive Data Redaction
- [x] Build PII detection (emails, phone numbers, SSNs, credit cards, API keys, IP addresses, dates of birth)
- [x] Build configurable redaction modes (mask [***], hash [SHA-256 prefix], or block)
- [x] Wire PII detection into proxy pipeline (pre-request scanning)

### Content Policy Enforcement
- [x] Build content policy rules engine (violence, illegal, self-harm, sexual, hate speech categories)
- [x] Add custom blocked keywords (configurable per project)
- [x] Build composite threat scoring (injection + PII + policy = weighted threat level)

### Threat Scoring
- [x] Build composite threat score per request (0-100 scale, low/medium/high/critical levels)
- [x] Store security events in security_events table (threat_type, threat_level, score, action_taken, details)
- [x] Add security_config JSON column to projects table

### Security Dashboard
- [x] Build Security page in dashboard sidebar (/dashboard/security)
- [x] Overview tab: 5 stat cards (total/low/medium/high/blocked), top patterns chart, recent threats list
- [x] Threat Log tab: paginated events table with level filter + refresh
- [x] Configuration tab: 3 detection toggles, blocking toggle, PII redaction dropdown, custom keywords

### Testing
- [x] Write comprehensive tests for all security features (108 tests: injection, PII, content policy, threat scoring)

## Security Documentation Update
- [x] Add security section to /docs page (injection detection, PII redaction, content policies, configuration)
- [x] Update GitHub README with security features
- [x] Republish to PyPI v0.3.0 with security documentation (https://pypi.org/project/prysmai/0.3.0/)

## QA Testing Guide Update
- [x] Review current prysmai-layer1-qa-testing-guide.md
- [x] Add Layer 2 security test cases (injection detection, PII redaction, content policies, threat scoring, security dashboard, configuration)
- [x] Rename to prysmai-qa-testing-guide.md (covers Layer 1 + Layer 2) — 152 total tests (109 Layer 1 + 43 Layer 2)

## Layer 2 Completion Sprint
### Output Scanning (Response-Side Security)
- [x] 1. Build output scanner module (reuse pii-detector + toxicity keyword matcher on completions)
- [x] 2. Add output scanning toggle to security_configs schema + DB migration
- [x] 3. Integrate output scanning into proxy — non-streaming (buffer response, scan, then forward)
- [x] 4. Integrate output scanning into proxy — streaming (accumulate chunks, scan after complete, log event)
- [x] 5. Add response security headers (X-Prysm-Output-Threat-Score, X-Prysm-Output-Threat-Level)
- [x] 6. Log output security events to security_events table (with source=output flag)
- [x] 7. Add output scanning config UI in Security Dashboard Configuration tab (4 toggles: enable, PII, toxicity, blocking)

### Threat Timeline Chart
- [x] 8. Install Recharts and build stacked bar chart for Security Dashboard Overview tab (14-day, low/medium/high stacked)

### Per-Category Threshold Config
- [x] 9. Output scanning config integrated into existing security_configs schema (4 new boolean columns)
- [x] 10. Output scanning config UI added to Security Dashboard Configuration tab
- [x] 11. Output scan config wired into proxy via getOutputScanConfig with 5-min cache

### Testing & QA
- [x] 12. Write vitest tests for output scanning (46 tests: toxicity detection, PII output, composite scoring, blocking, config)
- [x] 13. All 345 tests passing (16 test files)
- [x] 14. Update QA testing guide v2.1 with output scanning (Y1-Y10) + threat timeline chart (Z1-Z3) — 165 total tests
- [x] 15. Final full test suite pass — 345 tests, 16 files, all green

## GitLab AI Gateway Integration
- [x] 1. Dynamic upstream API key — accept X-Prysm-Upstream-Key header, use instead of stored key
- [x] 2. Custom header forwarding — accept X-Prysm-Forward-Headers, merge into upstream request (all 5 handlers)
- [x] 3. Write vitest tests for dynamic key and header forwarding (20 tests)
- [x] 4. Update Python SDK with upstream_api_key + forward_headers params, publish v0.3.1 to PyPI
- [x] 5. Update /docs page with CI/CD Integration section (4 subsections, GitLab example)
- [x] 6. Push SDK changes to GitHub (pushed via SSH)
- [x] 7. Full test suite green — 365 tests, 17 files, all passing

## Bug Fix: Anthropic Model Cost Calculation
- [x] 1. Add Claude 4.x model pricing (opus 4/4.1/4.5/4.6, sonnet 4/4.5/4.6, haiku 4.5) + legacy 3.x models
- [x] 2. Write tests for Anthropic cost calculation (13 new tests: exact match, prefix match, cost calc)
- [x] 3. Full test suite green — 374 tests, 17 files, all passing

## Comprehensive Model Pricing Update
- [x] 1. Research latest OpenAI pricing (GPT-5.2/5.1/5, GPT-4.1, o1/o3/o4-mini, embeddings) — from official pricing page
- [x] 2. Verify Anthropic pricing is complete (confirmed: 13 Claude models covered)
- [x] 3. Research latest Google Gemini pricing (3.1 Pro, 3 Pro/Flash, 2.5 Pro/Flash/Flash-Lite, 2.0, 1.5) — from official pricing page
- [x] 4. Update DEFAULT_PRICING table — 48 models across 3 providers (was 23)
- [x] 5. Update tests — 11 new model-specific tests + comprehensive coverage test updated
- [x] 6. Full test suite green — 385 tests, 17 files, all passing

## Layer 1 Extension Spec
- [ ] Write detailed spec for Agent Behavioral Detection (early stopping, agentic laziness, tool undertriggering, edit avoidance, reward hacking, code hallucination)
- [ ] Write detailed spec for RAG/Vector DB Interaction Analysis (chunking strategies, document retrieval patterns, embedding quality)

## Layer 3a Technical Document
- [ ] Write detailed technical document for Layer 3a (logprobs visualization, token confidence heatmap, "Why did it say that?", decision trace narrative)

## Candidate Emails
- [ ] Send tailored email to John (john@miva.university)
- [ ] Send tailored email to Chronos (Chronos.llc@mohex.org)
- [ ] Send tailored email to Osas (osasisorae@gmail.com)

## Layer 3a Implementation — Explainability
### Phase 1: Schema + Logprobs Injection
- [x] Add confidence_analysis JSON column to traces table
- [x] Add explainability_enabled, logprobs_injection, logprobs_sample_rate columns to projects table
- [x] Create explainability_reports table
- [x] Inject logprobs=true, top_logprobs=5 into OpenAI requests (respect user overrides)
- [x] Inject responseLogprobs into Gemini requests
- [x] Flag Anthropic requests for estimated confidence
- [x] Run db:push

### Phase 2: Confidence Analysis Engine
- [x] Build per-token metrics (confidence, entropy, margin, hallucination_risk)
- [x] Build segment-level grouping (high/low confidence segments, transition points)
- [x] Build completion-level metrics (overall_confidence, hallucination_risk_score, confidence_stability)
- [x] Build Anthropic estimated confidence (hedging language, uncertainty markers)
- [x] Integrate analysis into proxy response path (store in traces.confidence_analysis)

### Phase 3: Token Confidence Heatmap UI
- [x] Build TokenHeatmap React component (colored spans, OKLCH gradient)
- [x] Build hover tooltip (confidence, entropy, margin, top-5 alternatives)
- [x] Build click-to-expand token detail panel
- [x] Integrate into trace detail view

### Phase 4: Hallucination Detector
- [x] Build hallucination candidate extraction
- [x] Build HallucinationPanel UI component
- [x] Add hallucination risk badge to trace list

### Phase 5: "Why Did It Say That?" Feature
- [x] Build explanation generation prompt
- [x] Build tRPC procedure (generate + cache in explainability_reports)
- [x] Build WhyPanel UI component
- [x] Add "Why did it say that?" button to trace detail

### Phase 6: Decision Points + Model Comparison
- [x] Build DecisionPointsTimeline component
- [x] Build ModelComparisonView component
- [x] Build compareModels tRPC procedure

### Phase 7: Explainability Settings
- [x] Build explainability settings UI in project settings
- [x] Build updateSettings tRPC procedure
- [x] Build getHallucinationReport tRPC procedure

### Phase 8: Tests (all providers: OpenAI, Anthropic, Gemini)
- [x] Tests for confidence analysis engine (OpenAI logprobs, Anthropic estimated, Gemini normalized) — 48 tests across all 3 providers
- [x] Tests for logprobs injection (OpenAI, Anthropic, Gemini) — 22 tests across all 3 providers
- [x] Tests for hallucination detection — 8 tests across all 3 providers
- [x] Tests for explanation generation — 3 tests (input formatting for all providers)
- [x] Tests for proxy integration path — 7 tests (response processing + streaming for all providers)
- [x] Tests for explainability config — 4 tests (behavior across all providers)
- [x] Full test suite green — 483 tests, 19 files, all passing

### Phase 9: Documentation
- [x] Update /docs page with explainability section (provider support table, heatmap, hallucination, why-did-it-say-that, decision points, comparison, config)
- [x] Update QA testing guide with 47 Layer 3a test cases (AA-AI, grand total 212)
- [ ] Update SDK README

## Real Integration Testing (All Layers, All Providers, Real API Key)

### Layer 1: Proxy Routing & Basic Functionality
- [ ] OpenAI non-streaming request (gpt-4o-mini)
- [ ] OpenAI streaming request (gpt-4o-mini)
- [ ] Anthropic non-streaming request (claude-3-haiku)
- [ ] Anthropic streaming request (claude-3-haiku)
- [ ] Google Gemini non-streaming request (gemini-1.5-flash)
- [ ] Google Gemini streaming request (gemini-1.5-flash)
- [ ] Verify correct response format for each provider

### Layer 2: Observability & Security
- [ ] Traces captured in DB for all 3 providers
- [ ] Token counts accurate for all 3 providers
- [ ] Cost tracking calculated for all 3 providers
- [ ] Latency recorded for all 3 providers
- [ ] Security scanning (PII detection) works on real responses
- [ ] Security scanning (prompt injection detection) works
- [ ] Rate limiting fires correctly

### Layer 3a: Explainability
- [ ] Logprobs injection works for OpenAI (real logprobs returned)
- [ ] Logprobs injection works for Google Gemini (real logprobs returned)
- [ ] Anthropic estimated confidence computed on real response
- [ ] Confidence analysis stored in trace for OpenAI
- [ ] Confidence analysis stored in trace for Gemini
- [ ] Confidence analysis stored in trace for Anthropic
- [ ] Hallucination detection runs on real model output
- [ ] Token heatmap data is valid from real logprobs
- [ ] Decision points extracted from real data

## Multi-Provider Routing (One Prysm Key, All Providers)

### Schema Changes
- [x] Add `providerKeys` JSON column to projects table (stores multiple provider API keys)
- [x] Add `defaultProvider` column to projects table
- [x] Keep backward compat with existing `providerConfig` during migration
- [x] Run db:push

### Proxy Auto-Routing
- [x] Build model-to-provider detection (claude-* → anthropic, gpt-* → openai, gemini-* → google, etc.)
- [x] Build resolveProvider() with 5-level priority chain (explicit > model > default > legacy > dynamic)
- [x] Update authenticateProxyRequest to resolve provider + key from model name
- [x] Support X-Prysm-Upstream-Key as override (existing behavior preserved)
- [x] Support X-Prysm-Provider header for explicit provider selection
- [x] Fallback to default provider if model can't be auto-detected

### Settings UI
- [x] Update Configuration tab to support multiple provider keys
- [x] Add/remove provider keys with provider type selector
- [x] Show connected providers with status indicators
- [x] Set default provider for ambiguous models
- [x] Add tRPC procedures: addProviderKey, removeProviderKey, getProviderKeys, setDefaultProvider

### Docs & Tests
- [x] Update /docs page with multi-provider routing documentation
- [x] Vitest tests for model-to-provider detection across all known models
- [x] Vitest tests for multi-key resolution logic (540 tests, 20 files, all passing)

### Real Integration Tests (All 3 Providers)
- [ ] Build test app using PrysmAI Python SDK
- [ ] Test Layer 1: Anthropic non-streaming + streaming
- [ ] Test Layer 1: OpenAI non-streaming + streaming (needs OpenAI key)
- [ ] Test Layer 1: Google Gemini non-streaming + streaming (needs Google key)
- [ ] Test Layer 2: Trace capture verification for all providers
- [ ] Test Layer 2: Security scanning across providers
- [ ] Test Layer 2: Cost tracking accuracy
- [ ] Test Layer 3a: Logprobs injection (OpenAI + Gemini)
- [ ] Test Layer 3a: Estimated confidence (Anthropic)
- [ ] Test Layer 3a: Hallucination detection on real output
- [ ] Test Layer 3a: Confidence heatmap data verification

## Explainability Dashboard Fix
- [x] Investigate why explainability data not showing on dashboard despite being enabled
- [x] Trace explainability data flow: proxy → confidence analysis → DB → dashboard UI
- [x] Fix any gaps in the explainability pipeline (added confidence column to trace list, Explainability Overview + Hallucination Candidates to Dashboard)
- [x] Verify explainability data appears on dashboard after fix (all 540 tests passing, UI renders correctly)

## Dedicated Explainability Tab in Sidebar
- [x] Add Explainability nav item to DashboardShell sidebar
- [x] Create Explainability.tsx page with full-page layout
- [x] Confidence Trends section (time-series chart of avg confidence over time)
- [x] Hallucination History section (table of all hallucination candidates across traces)
- [x] Decision Points Explorer section (aggregated view of close-call decisions)
- [x] Model Comparison section (confidence/hallucination metrics by model)
- [x] Wire routing in App.tsx and DashboardShell
- [x] Write vitest tests for the new tRPC procedures (55 tests, all passing)
- [x] Verify page renders with real data (empty state verified in sandbox, real data in production)

## Resend Inbound Email Forwarding
- [x] Add webhook endpoint for Resend email.received events
- [x] Implement forwarding logic: info@prysmai.io → osasisorae@gmail.com
- [x] Write vitest tests for the webhook handler (10 tests, all passing)
- [x] Provide Resend dashboard setup instructions to user

## Directions 2 & 3: Automated Recommendations Engine + Improvement Playbooks
### Database Schema
- [x] recommendations table (id, projectId, detectorId, severity, headline, problem, rootCause, evidence, status, createdAt)
- [x] playbooks table (id, recommendationId, projectId, title, problem, rootCause, verification, status, createdAt)
- [x] playbook_steps table (id, playbookId, stepOrder, title, description, codeExample, expectedImpact, completed)
- [x] recommendation_snapshots table (id, projectId, snapshotData, takenAt)
- [x] Run db:push migration

### Pattern Detectors (10 rule-based pure functions)
- [x] LOW_CONFIDENCE detector
- [x] HIGH_HALLUCINATION detector
- [x] CONFIDENCE_DROPPING detector
- [x] MODEL_UNDERPERFORMER detector
- [x] HIGH_ENTROPY_CLUSTER detector
- [x] TOPIC_HALLUCINATION detector
- [x] TEMPERATURE_TOO_HIGH detector
- [x] COST_INEFFICIENCY detector
- [x] SECURITY_CORRELATION detector
- [x] NO_LOGPROBS detector
- [x] runAllDetectors orchestrator

### LLM Advisor
- [x] Forge API integration for generating human-readable recommendations
- [x] Structured output parsing (PlaybookContent type)
- [x] 1-hour cache to avoid redundant LLM calls

### Engine Orchestrator
- [x] runRecommendationEngine function (detectors → LLM advisor → DB persistence)
- [x] Snapshot baseline metrics before and after

### tRPC Procedures
- [x] recommendations.generate (run detectors + LLM advisor + persist)
- [x] recommendations.getActive (fetch active recommendations)
- [x] recommendations.dismiss (dismiss a recommendation)
- [x] recommendations.getPlaybooks (list all playbooks for a project)
- [x] recommendations.getPlaybookDetail (get playbook with steps)
- [x] recommendations.toggleStep (mark step complete/incomplete, auto-update playbook status)
- [x] recommendations.getSnapshots (get metric snapshots for progress tracking)

### Frontend
- [x] InsightsStrip component (top 3 issues with severity, headline, link to playbook)
- [x] InsightsStrip on Dashboard Overview
- [x] InsightsStrip on Explainability page
- [x] Playbooks page (two-column layout: list + detail view)
- [x] Playbooks nav item in sidebar
- [x] Playbook detail: Problem → Root Cause → Fix Steps → Verification → Progress

### Testing
- [x] 22 vitest tests for pattern detectors (all passing)
- [x] All 583 tests passing (22 test files)

## Blog Post: Building an AI Debate Arena with PrysmAI
- [x] Write Blog Post 6: "Building an AI Debate Arena with PrysmAI" (tutorial + showcase)
- [x] Integrate Post 6 into blog-posts.ts
- [x] Verify blog post renders correctly
- [x] Run vitest tests (587 tests passing, 22 test files)
- [x] Save checkpoint

## Bug Fix: Author Name
- [x] Change author from "Osarenren N." to "Osarenren I." in all blog posts

## Beta Invitation Outreach - Batch 3
- [x] Send early builder invitation email to David (davidokunoye003@gmail.com)
- [x] Send early builder invitation email to Jacob (jacoborode4@gmail.com)
- [x] Send early builder invitation email to Classic (classicemmaeasy@gmail.com)
- [x] Send early builder invitation email to Dennis (dennis.donaghy@aiml-solutions.com)
- [x] Send early builder invitation email to Siven (Sivenverse@gmail.com)

## Docs: Add Example Applications
- [x] Add "Example Applications" section to /docs page
- [x] Add AI Debate Arena entry with description, GitHub link, and blog tutorial link

## Pricing Page
- [x] Create /pricing page with Free, Pro, Team, Enterprise tiers
- [x] Register route in App.tsx
- [x] Add pricing link to navbar
- [x] Test page renders correctly
- [x] Run vitest (587 tests passing)
- [x] Save checkpoint

## Stripe Integration
- [x] Add Stripe feature to project (manual setup — sandbox expired)
- [x] Configure Stripe test keys (pk_test, sk_test)
- [x] Create Stripe products and prices (Pro $39/mo, Team $149/mo)
- [x] Build checkout session endpoint for subscriptions
- [x] Build Stripe webhook handler (checkout.session.completed, subscription updates)
- [x] Add subscription status to user/org schema (stripeCustomerId, stripeSubscriptionId on orgs)
- [x] Wire pricing page CTA buttons to Stripe Checkout
- [x] Add subscription management (billing portal tRPC procedure)
- [x] Add plan indicator to dashboard sidebar
- [x] Write vitest tests for Stripe integration (600 tests passing)
- [x] Test end-to-end checkout flow (verified Stripe Checkout URL returned)
- [x] Save checkpoint

## Bug: Plan indicator not updating after Stripe checkout
- [x] Investigated: webhook not firing (configured in live mode instead of test mode)
- [ ] Manually update org to pro for immediate verification
- [ ] Add checkout success verification fallback (verifyCheckout procedure)

## Stripe UX Improvements
- [x] Add upgrade confirmation dialog when user already has a plan (show proration info)
- [x] Build billing/subscription management section in dashboard (view plan, cancel, manage billing portal)

## Usage Tracking (Request Counter)
- [x] Add usage_records table to schema (orgId, projectId, periodStart/End, requestCount, totalTokens, totalCostUsd)
- [x] Add increment logic in proxy middleware (incrementUsage per org/project per month)
- [x] Enforce tier limits (5,000 Free / 50,000 Pro / 250,000 Team / unlimited Enterprise)
- [x] Return 429 when limit exceeded with upgrade CTA
- [x] Add usage stats tRPC procedure for dashboard (usage.get)
- [x] Display usage stats in dashboard (current count vs limit, progress bar)
- [x] Add usage stats to billing page (UsageMeter component)
- [x] Verified: getOrgPlanByProjectId correctly joins projects → organizations for real plan lookup

## Tiered Security Scanning
- [x] Separate rule-based scanning (regex/pattern) from LLM-based scanning
- [x] Free tier: rule-based only (fast, zero cost)
- [x] Pro/Team/Enterprise tier: LLM-based deep analysis via Forge API (gemini-2.5-flash)
- [x] Add tier check in security scanning middleware (isPaidPlan, assessRequest with orgPlan)
- [x] Update security dashboard to show scan type (Rules vs Deep badge + LLM detail row)
- [x] Write vitest tests (641 tests passing — 24 test files)
- [x] Save checkpoint

## Final Launch Features

### Feature 1: verifyCheckout Fallback (Plan Indicator Bug Fix)
- [x] Build verifyCheckout tRPC procedure (queries Stripe API for session status)
- [x] Call verifyCheckout on checkout success page redirect (DashboardShell useEffect)
- [x] Update org plan in DB if checkout completed but webhook missed
- [x] Update plan indicator in dashboard sidebar immediately (invalidates billing queries)
- [x] Write vitest tests

### Feature 2: Usage Alerts at 80% Tier Limit
- [x] Add usage_alerts table to schema (orgId, threshold, sentAt)
- [x] Add checkAndSendUsageAlert in db.ts (fires at 80%, 90%, 100%)
- [x] Wire into proxy after incrementUsage calls (chat/completions/embeddings)
- [x] Send dark-themed email with usage bar, remaining count, upgrade CTA
- [x] Track per-threshold per-period to avoid duplicate emails
- [x] Write vitest tests

### Feature 3: Security Scan Demo on Landing Page
- [x] Build demo.scanPrompt public tRPC procedure (rule-based + LLM side-by-side)
- [x] Build SecurityScanDemo component (textarea, 4 example prompts, results display)
- [x] Show side-by-side: Rules (free) vs LLM Deep Scan (pro) with enhancement indicator
- [x] Add "Show raw analysis data" toggle for technical users
- [x] Write vitest tests (672 tests passing — 25 test files)
- [x] Save checkpoint

## Post-Launch: Demo Scanner Rate Limiting
- [x] Add IP-based rate limiting to demo.scanPrompt (3 scans/hour per IP)
- [x] Return clear error message with retry-after time when limit exceeded
- [x] Show rate limit feedback in SecurityScanDemo UI (remaining count + error banner)
- [x] Write vitest tests for rate limiter (687 tests passing — 26 test files)
- [x] Save checkpoint

## Documentation Update: Multi-Provider Examples & Common Mistakes
- [x] Add warning callout after Step 2 provider table about matching keys to providers
- [x] Add Anthropic and Gemini code examples alongside OpenAI in Step 4
- [x] Add "One Prysm key, all providers" tip callout
- [x] Add Common Mistakes troubleshooting table (4 common issues with symptoms/causes/fixes)
- [x] Updated Step 4 intro text to mention multi-provider support
- [x] Save checkpoint

## Quick Win 2: Off-Topic Detection (Blueprint Section 5.2)
- [x] Add offTopicDetection fields to securityConfigs schema (enabled, description, keywords, action, threshold)
- [x] Run pnpm db:push for schema migration
- [x] Build off-topic-detector.ts module (keyword-based + LLM-based for paid tiers)
- [x] Integrate off-topic scoring into threat-scorer.ts
- [x] Update proxy-middleware.ts to load and pass off-topic config
- [x] Log off-topic events to security_events table
- [x] Add off-topic config to Security dashboard settings panel
- [x] Add off-topic events to threat timeline visualization
- [x] Write vitest tests for off-topic-detector

## Quick Win 4: PagerDuty Integration (Blueprint Section 12.4)
- [x] Add pagerduty case to alert-engine.ts sendAlertNotifications
- [x] Implement PagerDuty Events API v2 trigger event
- [x] Implement PagerDuty resolve events (auto-close when condition normalizes)
- [x] Add PagerDuty option to alert channel configuration in dashboard (+ Slack, Webhook)
- [x] Write vitest tests for PagerDuty alert channel (9 tests passing)

## Quick Win 3: ML-Based Toxicity Scoring (Blueprint Section 5.4)
- [x] Build toxicity-scorer.ts module (LLM-based 6-dimension scoring for paid tiers)
- [x] Integrate ML toxicity scorer into output-scanner.ts (done in QW5)
- [x] Keep keyword-based fallback for free tier (scanOutputSync)
- [x] Update OutputScanResult with full ToxicityScores breakdown
- [x] Update security dashboard to display ML toxicity, NER, and policy compliance toggles
- [x] Write vitest tests for toxicity-scorer (14 tests passing)

## Quick Win 5: Enhanced Output Scanning (Blueprint Section 5.4)
- [x] Build ner-detector.ts module (LLM-based NER for paid tiers, 17 tests)
- [x] Integrate NER results into output-scanner.ts PII detection
- [x] Integrate ML toxicity scorer into output-scanner.ts
- [x] Add scanOutputSync for backward compat + async scanOutput with ML/NER
- [x] Add outputNerDetection and outputPolicyCompliance fields to securityConfigs schema
- [x] Add output policy compliance to output-scanner.ts (run content policy rules on completions)
- [x] Update security dashboard to show NER, ML toxicity, and policy compliance toggles
- [x] Write vitest tests for ner-detector (17 tests passing)

## Quick Win 1: SDK Framework Integrations (Blueprint Section 9.3)
- [x] Create prysmai/integrations/ package directory
- [x] Build LangChain callback handler (prysmai/integrations/langchain.py) — 14 tests
- [x] Build CrewAI monitor (prysmai/integrations/crewai.py) — 11 tests
- [x] Build LlamaIndex span handler (prysmai/integrations/llamaindex.py) — 7 tests
- [x] Add optional dependencies to pyproject.toml
- [x] Write tests for all three framework integrations (37 tests passing)
- [x] Update SDK docs page in the web app
- [x] Publish v0.4.0 to PyPI (https://pypi.org/project/prysmai/0.4.0/)

## Docs Page Update: SDK v0.4.0 Framework Integrations
- [x] Add LangChain integration section with code examples
- [x] Add CrewAI integration section with code examples
- [x] Add LlamaIndex integration section with code examples
- [x] Update installation section to show optional deps (prysmai[langchain], etc.)
- [x] Update version references to v0.4.0

## Docs Update: CI/CD, Security, and v0.4.0 Banner
- [x] Add CI/CD framework integration examples (GitHub Actions with LangChain/CrewAI/LlamaIndex Prysm callbacks)
- [x] Add off-topic detection docs to Security section
- [x] Add NER detection docs to Security section
- [x] Add ML toxicity scoring docs to Security section
- [x] Add "What's New in v0.4.0" banner to top of docs page

## Output Policy Compliance Engine
- [x] Build output-policy-engine.ts module (rule definition, evaluation, action enforcement)
- [x] Add output policy rules schema support (custom rules per org)
- [x] Integrate policy engine into async output scanner pipeline
- [x] Support actions: log, warn, block, redact
- [x] Write vitest tests for policy engine (27 tests passing)

## Pricing Page Update: Security Feature Differentiators
- [x] Add off-topic detection to paid tier features
- [x] Add ML toxicity scoring to paid tier features
- [x] Add NER-based PII detection to paid tier features
- [x] Add output policy compliance to paid tier features
- [x] Add PagerDuty & Slack alert channels to paid tier features
- [x] Update feature comparison table (5 new rows: off-topic, toxicity, NER, policy, alerts)

## Stress Test Report Fixes (March 5, 2026)
- [x] BUG-001: Fix PrysmCallbackHandler.on_chain_start AttributeError — null check on serialized parameter
- [x] BUG-002: Fix proxy connection errors under sequential load — rate limiter improvements + retry headers
- [x] BUG-003: Fix CrewAI DelegateWorkToolSchema validation errors when agents delegate work
- [x] FINDING-001: Document all supported model names in provider router / docs
- [x] FINDING-002: Improve CrewAI agent prompt quality for better moderation output
- [x] FINDING-003: Add LlamaIndex pre-warming / index warm-up guidance in docs and code
- [x] P1-REC: Expose server-side scan results in response headers (X-Prysm-Scan-Result, X-Prysm-Entities-Detected)
- [x] P1-REC: Add rate limit headers to proxy responses (X-RateLimit-Remaining, Retry-After)

## SDK v0.4.1 Real Integration Tests (March 5, 2026)
- [x] Test BUG-001 fix with real LangChain calls through live Prysm proxy
- [x] Test BUG-003 fix with real CrewAI delegation through live Prysm proxy
- [x] Test general PrysmClient and monitor() against live proxy
- [x] Write production-grade integration tests with real API key
- [x] Build and publish v0.4.1 to PyPI (https://pypi.org/project/prysmai/0.4.1/)
- [x] Push v0.4.1 to GitHub (tagged v0.4.1)

## Site Publish & Docs Update (March 5, 2026)
- [x] Update docs page with new response headers (X-Prysm-Scan-Result, X-Prysm-Entities-Detected, X-Prysm-ML-Toxicity-Flags, X-Prysm-Policy-Violations, X-Prysm-Scan-Tier, X-Prysm-Off-Topic)
- [x] Update docs page with rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After)
- [x] Document the /models endpoint in docs
- [x] Add v0.4.1 SDK changelog to docs page
- [x] Publish site with all platform changes

## Governance Layer — Phase 1: Data Model + MCP Server (March 7, 2026)
- [x] Add 6 new tables to drizzle/schema.ts (agent_sessions, session_events, behavioral_assessments, code_security_scans, governance_policies, governance_violations)
- [x] Add session_summaries table to schema
- [x] Run migrations (pnpm db:push)
- [x] Build session manager (CRUD for sessions + events) — server/mcp/session-manager.ts
- [x] Build event ingester (validate, store, link to traces) — server/mcp/event-ingester.ts
- [x] Install @modelcontextprotocol/sdk
- [x] Build MCP server with Streamable HTTP transport — server/mcp/index.ts
- [x] Implement 4 MCP tool handlers (session_start, check_behavior, scan_code, session_end) — server/mcp/tools.ts
- [x] Implement MCP resource handlers — server/mcp/resources.ts
- [x] Implement MCP notification dispatch — server/mcp/notifications.ts
- [x] Register /api/mcp route in Express — server/_core/index.ts
- [x] Write vitest tests for governance router integration

## Governance Layer — Phase 2: High-Confidence Behavioral Detectors (March 7, 2026)
- [x] Build detection engine orchestrator — server/behavioral/engine.ts
- [x] Build shared types — server/behavioral/types.ts
- [x] Implement early stopping detector — server/behavioral/detectors/early-stopping.ts
- [x] Implement tool undertriggering detector — server/behavioral/detectors/tool-undertriggering.ts
- [x] Wire detectors into MCP tool handlers (check_behavior + session_end)
- [x] Write vitest tests for early stopping detector (8 tests)
- [x] Write vitest tests for tool undertriggering detector (7 tests)

## Governance Layer — Phase 3: Dashboard Visualization (March 7, 2026)
- [x] Build governance tRPC router with 11 procedures — server/governance-router.ts
- [x] Wire governance router into appRouter — server/routers.ts
- [x] Build Session Explorer page (list + detail + timeline) — client/src/pages/SessionExplorer.tsx
- [x] Build Governance Dashboard page (aggregate metrics, trends, detectors) — client/src/pages/GovernanceDashboard.tsx
- [x] Build Policy Manager page (CRUD + violations) — client/src/pages/PolicyManager.tsx
- [x] Add broadcastSessionEvent to WebSocket — server/ws-live-feed.ts
- [x] Add 3 nav items (Sessions, Governance, Policies) to DashboardShell sidebar
- [x] Write vitest tests for governance tRPC router (7 tests)

## QA Bug Fixes — March 8, 2026
- [x] Fix -32603 Internal Server Error on all MCP tool/resource calls (CRITICAL) — root cause: MCP SDK Server can only connect to one transport at a time; fix: create fresh Server instance per request
- [x] Update testing guide v1.1 to document Accept header requirement, SSE response format, and sed parsing
- [x] Verify fix end-to-end with curl against live server (all 4 tools + resources + sequential calls confirmed)

## SDK v0.5.0 Publish + Website Docs Update — March 8, 2026
- [x] Publish prysmai v0.5.0 to PyPI (https://pypi.org/project/prysmai/0.5.0/)
- [x] Review existing website documentation pages (3000+ line Docs.tsx)
- [x] Update version badge to v0.5.0
- [x] Update What's New banner with governance highlights
- [x] Add full Governance section (GovernanceSession, Behavioral Detectors, Code Security Scanning, MCP Endpoint, Governance Dashboard)
- [x] Replace LangChain with LangGraph in Framework Integrations
- [x] Update CrewAI section with governance=True flag
- [x] Update CI/CD section to reference LangGraph
- [x] Add v0.5.0 to Changelog with LATEST badge
- [x] Update installation instructions for new extras (langgraph, all)
- [x] Verify all docs render correctly in browser (11 sections confirmed)

## Documentation Overhaul — March 8, 2026
- [x] Audit current docs structure and content gaps (22 sections, 3,316 lines)
- [x] Restructure sidebar into grouped navigation (Getting Started, SDK & Integrations, Platform, Security & Analysis, Reference)
- [x] Build shared docs-content.ts with all 22 sections as Markdown source
- [x] Build copy-as-Markdown feature — per-section hover button on SectionHeading
- [x] Build "Copy full docs as MD" button in sidebar
- [x] Build MCP docs server at /api/mcp/docs with 3 tools (prysm_search_docs, prysm_get_section, prysm_list_sections)
- [x] Add 23 MCP resources (full docs + 22 individual sections)
- [x] Add MCP connection panel to sidebar with Claude Desktop/Cursor config example
- [x] Verify end-to-end: all MCP tools, resources, copy-as-MD, sidebar grouping, config panel

## Docs UI Fix — March 8, 2026
- [x] Move Copy as MD and Connect via MCP controls from sidebar bottom to top-right of content area
- [x] Make controls visible/sticky on every docs page (sticky top-20 z-40)
- [x] Connect MCP dropdown shows URL, copy button, and Claude Desktop/Cursor config example
- [x] Fixed esbuild parse error in docs-content.ts (escaped template literals)

## Phase 2 Completion — Agent Workflow Tracing (March 8, 2026)

### 1. Microsoft Agent Framework SDK Integration (replacing AutoGen)
- [x] Build agent_framework.py integration module (AgentMiddleware, FunctionMiddleware, ChatMiddleware)
- [x] Capture agent run execution (start/end, timing, messages, metadata)
- [x] Capture function/tool calls (name, arguments, result, timing)
- [x] Capture chat/LLM calls (messages, options, response, tokens)
- [x] Support governance mode (forward events to GovernanceSession)
- [x] Add optional dependency to pyproject.toml
- [x] Write pytest tests for Agent Framework integration (28/28 passed)
- [x] Update SDK __init__.py with Agent Framework import example

### 2. Unified Trace Model (correlate LLM calls + tool events + sessions)
- [x] Build unified trace query in server/db.ts (getUnifiedTimeline, getTraceTree, getToolPerformance, getToolCallTimeline, getAgentDecisionExplanations)
- [x] Build unifiedTrace tRPC procedures (getTimeline, getTraceTree, getToolPerformance, getToolCallTimeline, getDecisionExplanations)
- [x] Build UnifiedTimeline React component (interleaved LLM calls, tool events, decisions)
- [x] Build unified-trace-router.ts and wire into appRouter
- [x] Write vitest tests for unified trace model (29 tests passed)

### 3. Agent Decision Explainability
- [x] Build agent-level explanation engine (why-tool, why-action analysis)
- [x] Build tRPC procedure for agent decision explanations (getDecisionExplanations)
- [x] Build AgentDecisions.tsx page (session selector, decision cards, context view)
- [x] Add Decisions nav item to dashboard sidebar
- [x] Vitest tests included in unified-trace.test.ts

### 4. Directed Graph Visualization (agent workflow execution graph)
- [x] Build graph data extraction from trace tree (nodes, edges, state transitions)
- [x] Build WorkflowGraph.tsx page (canvas-based directed graph with SVG)
- [x] Show node types (LLM call, tool call, decision, delegation, error) with distinct colors
- [x] Pan/zoom controls and node click detail panel
- [x] Add Workflow nav item to dashboard sidebar
- [x] Vitest tests included in unified-trace.test.ts

### 5. Tool Performance Dashboard
- [x] Build tool analytics tRPC procedures (getToolPerformance, getToolCallTimeline)
- [x] Build ToolPerformance.tsx page (success rates, latency scatter plot, failure analysis)
- [x] Add Tool Perf nav item to dashboard sidebar
- [x] Vitest tests included in unified-trace.test.ts

### 6. Documentation & Blog
- [x] Add Agent Tracing group to docs-content.ts (5 new doc sections)
- [x] Add Phase 2 blog post to blog-posts.ts
- [x] Add agent_framework to agentType enum in schema
- [x] All 843 vitest tests passing (36 test files)

## SDK v0.6.0 Publish + GitHub Push — March 9, 2026
- [x] Bump SDK version to 0.6.0 in pyproject.toml
- [x] Update SDK README with v0.6.0 release notes (Agent Framework highlights, feature table, installation)
- [x] Build and publish prysmai v0.6.0 to PyPI (https://pypi.org/project/prysmai/0.6.0/)
- [x] Push prysmai-python SDK repo to GitHub (tagged v0.6.0)
- [x] Push prysmai web app repo to GitHub (cleaned .manus secrets from history)

## Docs v0.6.0 Update + Governance Repositioning — March 9, 2026
- [x] Update docs version badge from v0.5.0 to v0.6.0
- [x] Update docs What's New banner with v0.6.0 Agent Framework highlights
- [x] Add v0.6.0 changelog entry to Docs page
- [x] Add Agent Framework to framework install instructions in Docs
- [x] Add Agent Framework SDK section to website docs (docs-content.ts)
- [x] Reposition tagline from "observability proxy" to "governance and security layer for autonomous AI agents"
- [x] Rewrite hero section copy (headline, subheadline, CTA) — governance-first
- [x] Rewrite problem section ("The Blind Spot" → "The Governance Gap")
- [x] Rewrite identity section ("builders who go deeper" → "responsible AI teams")
- [x] Rewrite solution section (observability → governance + tracing)
- [x] Rewrite "What We're Building" teaser (future roadmap → governance roadmap)
- [x] Rewrite final CTA and footer tagline
- [x] Update stack logos (added LangGraph + Agent Framework)
- [x] Update docs-content.ts overview ("observability proxy" → "governance and security layer")
- [x] Update Docs.tsx hero description
- [x] Update Docs.tsx CTA section
- [x] Update meta tags (title, OG, Twitter Card) with governance positioning
- [x] All 843 vitest tests still passing

## Landing Page Copy Rewrite — March 9, 2026
- [x] Rewrite Hero section (new headline, subheadline, CTAs, provider trust strip)
- [x] Rewrite Problem section ("Right now, your AI application is a black box" — 4 cards)
- [x] Add Solution section ("Prysmai gives you eyes inside your AI" — flow diagram)
- [x] Add Features section (4 capabilities: Security, Observability, Explainability, Governance)
- [x] Add Integration section ("One line of code" — code block + frameworks)
- [x] Add Who It's For section (Developer, Security/Compliance, Business Leader)
- [x] Rewrite Vision section ("inflection point" — Gartner stats)
- [x] Add Pricing Teaser section (free tier signal)
- [x] Rewrite Final CTA section
- [x] Update meta tags with new copy (title, OG, Twitter)
- [x] Update Docs page hero copy
- [x] Update microcopy/UI strings where applicable
