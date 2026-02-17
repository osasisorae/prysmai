# Prysm AI — Investor Pitch Deck

Design style: Dark, premium, tech-forward. Deep navy/charcoal backgrounds with cyan (#00D4FF) and electric teal accents. Clean sans-serif typography. Minimal text per slide — let the data speak. Use data visualizations, comparison tables, and architecture diagrams. The aesthetic should feel like a cybersecurity command center — precise, confident, authoritative.

---

## Slide 1: Title Slide

**Prysm AI**

See Inside Your AI.

Interpretability-powered observability and security for AI agents.

Pre-Seed | February 2026

Osarenren Isorae, Founder & CEO
YC Startup School | Lead AI Engineer

---

## Slide 2: The $202B AI boom has a blind spot

Every AI team monitors inputs and outputs. Nobody monitors what happens inside the model.

In 2025, enterprises deployed 750,000+ AI agents into production. They spent $202.3 billion on AI. Yet every monitoring tool — Langfuse, Arize, LangSmith, Datadog — operates at the same boundary: prompts in, completions out.

When an agent hallucinates, gets jailbroken, or makes an unexplainable decision, teams have no way to see WHY.

This is like monitoring a factory by watching the loading dock — you see what goes in and what comes out, but you have no cameras on the production floor.

---

## Slide 3: The cost of flying blind is accelerating

Three converging crises are making this untenable:

1. Security: Prompt injection attacks succeed 90%+ of the time against unprotected agents (JailbreakBench 2025). Lakera was acquired for $300M. Protect AI for $650M. The market is screaming for solutions.

2. Compliance: The EU AI Act (enforced Aug 2025) requires explainability for high-risk AI systems. Teams cannot explain what they cannot see inside.

3. Reliability: The average AI engineering team spends 35% of debugging time on "model behavior" issues they cannot trace to a root cause (Braintrust 2025 survey).

The result: $4.2B+ spent annually on AI debugging, security patching, and compliance workarounds — all because the tooling stops at the model boundary.

---

## Slide 4: Prysm AI sees what others cannot

Prysm AI is the first platform that combines AI observability, security, and mechanistic interpretability in a single product.

One line of code. Three layers of visibility.

Layer 1 — Observability: Proxy gateway captures every LLM request/response. Latency, cost, token usage, error rates. Real-time dashboard. (Replaces Langfuse, Helicone)

Layer 2 — Security: Threat detection pipeline scans for prompt injection, jailbreaks, PII leakage, and policy violations in real-time. Configurable actions: block, flag, or alert. (Replaces Lakera Guard, LLM Guard)

Layer 3 — Interpretability: The breakthrough layer. Connects to open-source models, extracts internal activations, runs sparse autoencoders, and shows engineers WHICH neural features activated and WHY the model made each decision. No other production tool does this.

---

## Slide 5: How it works — one integration, full visibility

Architecture diagram showing the product flow:

The user's application connects to Prysm's proxy gateway with a single line change: `base_url = "https://proxy.prysmai.io/v1"`. All LLM traffic flows through the proxy, which captures data, runs security classifiers, and forwards to the LLM provider. An analytics pipeline processes everything asynchronously. For open-source models, the interpretability engine extracts activations and generates feature reports. Everything surfaces in a real-time dashboard with request explorer, security alerts, and interpretability reports.

Integration takes 30 seconds — change one URL. Works with OpenAI, Anthropic, Gemma, Llama, Mistral, and any OpenAI-compatible endpoint.

---

## Slide 6: Nobody else covers all three dimensions

Competitive landscape comparison table:

| Company | Observability | Security | Interpretability | Status |
|---------|:---:|:---:|:---:|---|
| Langfuse | ✓ | ✗ | ✗ | Acquired by ClickHouse (Jan 2026) |
| Arize AI | ✓ | ✗ | ✗ | $400M valuation (Series C) |
| Braintrust | ✓ | ✗ | ✗ | $36M Series A |
| Helicone | ✓ | ✗ | ✗ | Seed stage |
| LangSmith | ✓ | ✗ | ✗ | Part of LangChain |
| Lakera Guard | ✗ | ✓ | ✗ | Acquired for $300M (Sep 2025) |
| Protect AI | ✗ | ✓ | ✗ | Acquired for $650M (Apr 2025) |
| Goodfire | ✗ | ✗ | ✓ | $50M Series A (Apr 2025) |
| **Prysm AI** | **✓** | **✓** | **✓** | **Building the unified platform** |

Every competitor covers one dimension. The three biggest were acquired in 2025 — proving the market is real and the acquirers want more. Prysm is the only product designed to cover all three from day one.

---

## Slide 7: The science is proven — Prysm productizes it

Mechanistic interpretability is no longer theoretical. In 2025-2026, three breakthroughs made it production-ready:

Breakthrough 1: Anthropic identified 34 million interpretable features inside Claude using sparse autoencoders (Scaling Monosemanticity, 2024). They can now trace the exact neural pathway from input to output — "circuit tracing."

Breakthrough 2: Anthropic's Constitutional Classifiers++ used internal representations to detect jailbreaks with 97.7% accuracy — proving interpretability IS security (arXiv:2501.18837).

Breakthrough 3: MIT Technology Review named mechanistic interpretability a "Breakthrough Technology of 2026." Anthropic launched a $100M fund (Anthology) specifically to back interpretability startups.

The research exists. The tools exist (TransformerLens, SAELens, Neuronpedia). What doesn't exist is a production SaaS that makes it accessible. That's Prysm.

---

## Slide 8: $19B+ market at the intersection of three waves

Market sizing with three overlapping circles:

AI Observability: $2.1B (2025) → $10.7B (2033), 22.5% CAGR
AI Security: $2.8B (2025) → $8.4B (2030), ~35% CAGR
AI Interpretability: Emerging — not yet sized by analysts. MIT breakthrough technology 2026. Anthropic investing $13B in the space.

Total Addressable Market (TAM): $19.1B+ by 2033
Serviceable Addressable Market (SAM): $3.2B (AI engineering teams at companies with 10-500 employees)
Serviceable Obtainable Market (SOM): $32M (1% of SAM in Year 3)

The interpretability segment is the wild card — it's a new category that Prysm can define. First-mover advantage in category creation is the strongest moat in SaaS.

---

## Slide 9: Revenue model — usage-based with interpretability premium

Pricing tiers designed for land-and-expand:

| | Free | Pro ($49/mo) | Team ($149/mo) | Enterprise |
|---|---|---|---|---|
| Requests/month | 10K | 100K | 500K | Custom |
| Observability | ✓ | ✓ | ✓ | ✓ |
| Security | Basic | Full | Full | Full |
| Interpretability | — | — | ✓ | ✓ |
| Data retention | 7 days | 30 days | 90 days | Custom |

Revenue projections (conservative):
Year 1: $180K ARR (300 Pro + 50 Team customers)
Year 2: $1.2M ARR (1,500 Pro + 200 Team + 5 Enterprise)
Year 3: $4.8M ARR (5,000 Pro + 800 Team + 20 Enterprise)

The free tier drives adoption. Pro captures individual developers. Team captures engineering teams. Enterprise captures compliance-driven organizations. Interpretability is the premium upsell — it's the feature no one else has.

---

## Slide 10: Traction — building in public, audience before product

While the product is in development, we are building authority and audience:

6 published technical articles with 60+ academic references — establishing Prysm as the thought leader in AI interpretability for practitioners.

Article topics: "Stop Flying Blind: Why We Need to See Inside Our AI Agents" | "What Is Mechanistic Interpretability? A Practical Guide" | "I Looked Inside a Language Model's Neural Network" | "Why Prompt Injection Still Works in 2026" | "The Missing Link: Interpretability Makes AI Security Work" | "The AI Observability Stack: What's Changed and What's Still Missing"

Live website with waitlist at prysmai.io.

1,155-line technical blueprint — the most detailed product specification in the space. Covers architecture, database schema, API design, SDK, pricing, and a 24-week build sequence.

YC Startup School alumnus — founder has completed the program and is embedded in the YC network.

---

## Slide 11: 24-week build sequence — we know exactly what to build

The technical blueprint specifies every component, dependency, and milestone:

Weeks 1-8: Layer 1 (Observability) — Proxy gateway, analytics pipeline, dashboard. MVP checkpoint. Revenue begins.

Weeks 8-12: Layer 2 (Security) — Threat detection classifier, real-time scanning, alerting system. Security features live.

Weeks 12-22: Layer 3 (Interpretability) — Activation collection, SAE analysis pipeline, circuit tracing, feature visualization. The moat.

Weeks 22-24: Billing, polish, launch.

Each layer is independently valuable and monetizable. We don't need to build the full stack to generate revenue — Layer 1 alone competes with Langfuse and Helicone. Each subsequent layer increases differentiation and pricing power.

This is not a research project. This is a production engineering plan with clear milestones and dependencies.

---

## Slide 12: The acquisitions prove the playbook works

Three major exits in 2025 validated each layer of our stack:

Lakera → Acquired by Check Point Software for ~$300M (Sep 2025). AI security layer. Raised $30M total before acquisition. 10x return for investors.

Protect AI → Acquired by Palo Alto Networks for $650-700M (Apr 2025). AI security scanning and red teaming. Validates enterprise willingness to pay for AI security.

Langfuse → Acquired by ClickHouse as part of $400M Series D (Jan 2026). Open-source LLM observability. 20K+ GitHub stars, 26M SDK installs/month. Validates the proxy/observability model.

Goodfire → Raised $50M Series A (Apr 2025) from Menlo Ventures + Lightspeed + Anthropic's $100M Anthology Fund. Pure interpretability play. Validates the interpretability market.

Combined exit value: $1.25B+ in 12 months. And none of these companies combined all three layers.

---

## Slide 13: Founder — domain expert building at the intersection

Osarenren Isorae — Founder & CEO

Lead AI Engineer with deep expertise in mechanistic interpretability, AI security, and production ML systems.

YC Startup School alumnus — trained in the YC framework for building and scaling startups.

Published 18,000+ words of original technical content on AI interpretability and security, cited by 60+ academic references from Anthropic, OpenAI, IEEE, and arXiv.

Authored a 1,155-line technical blueprint that specifies every component of the Prysm AI platform — architecture, database schema, API design, SDK, pricing, and build sequence.

Why this founder: The interpretability-security intersection requires someone who understands both the research (TransformerLens, SAELens, sparse autoencoders) AND production engineering (proxy architectures, real-time classifiers, SaaS billing). This is a rare combination — most researchers don't build products, and most product engineers don't understand the research.

Hiring plan: First hire is a senior backend engineer (Month 1). Co-founder search is active — targeting someone with GTM/enterprise sales experience in developer tools.

---

## Slide 14: The Ask — $500K pre-seed to build and ship Layer 1+2

Raising: $500K on a SAFE with $5M post-money valuation cap

Use of funds (12-month runway):

Engineering (60%) — $300K: Hire 1 senior backend engineer. Build Layer 1 (observability proxy + dashboard) and Layer 2 (security scanning). Ship MVP by Month 3.

Go-to-market (25%) — $125K: Developer marketing, content amplification, conference presence (AI Engineer Summit, NeurIPS), early customer acquisition. Target: 500 free users, 50 paying customers by Month 9.

Operations (15%) — $75K: Infrastructure (AWS/GCP), legal (Delaware C-Corp incorporation), compliance groundwork.

Milestones this capital achieves:
- Month 3: MVP live (Layer 1 + Layer 2)
- Month 6: 500 free users, 50 paying customers
- Month 9: $50K+ ARR, Layer 3 development started
- Month 12: Series-ready with interpretability beta

---

## Slide 15: Why now — three forces converging in 2026

The timing window is narrow and the forces are converging:

Force 1 — Regulatory pressure: EU AI Act enforcement began August 2025. Explainability requirements are creating mandatory demand for interpretability tools. Companies MUST explain their AI decisions or face penalties.

Force 2 — Research-to-product transition: Anthropic open-sourced circuit tracing tools (May 2025). SAELens v6+ supports production-scale analysis. The research tools are mature enough to productize — but the window to be first is closing.

Force 3 — Market consolidation: Three major acquisitions in 2025 ($1.25B+ combined) prove that large security and infrastructure companies are buying AI security and observability startups. The acquirers are looking for the next layer — interpretability. Being acquired is a viable exit path within 3-5 years.

If we don't build this now, Datadog, Palo Alto Networks, or Check Point will build it internally — but they'll build it as a feature, not a platform. The window for an independent company to define this category is 12-18 months.

---

## Slide 16: The vision — from monitoring to understanding

Today, AI teams monitor their models from the outside.

Tomorrow, they'll understand them from the inside.

Prysm AI is building the platform that makes that transition possible — starting with observability, adding security, and culminating in the interpretability layer that no one else has.

The best AI agents will be built by teams who see the deepest.

We're building the eyes.

prysmai.io | osarenren@prysmai.io

---
