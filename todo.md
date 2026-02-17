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
