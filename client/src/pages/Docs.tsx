/**
 * Docs — Full platform documentation for Prysm AI (Layer 1 + Layer 2 + Layer 3a)
 * Design: Matches V5 landing page (Inter, 2-color, generous whitespace)
 * Layout: Sidebar navigation + content area
 * Sections: Overview, Getting Started, Python SDK, REST API, Providers,
 *           Dashboard, API Keys, Alerts, Team, Cost Tracking,
 *           Security (Injection, PII, Policies, Threat Scoring),
 *           Explainability (Confidence, Hallucination, Decision Points),
 *           Embeddings & Completions, Tool Calling & Logprobs,
 *           Self-Hosted, Error Handling
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { EarlyAccessModal } from "@/components/EarlyAccessModal";
import {
  Copy,
  Check,
  Terminal,
  BookOpen,
  Zap,
  Code2,
  Settings,
  Layers,
  Shield,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  LayoutDashboard,
  Key,
  Bell,
  Users,
  DollarSign,
  Blocks,
  Wrench,
  Globe,
  Activity,
  ShieldAlert,
  Lock,
  Eye,
  FileWarning,
  Plug,
  Sparkles,
  FlaskConical,
} from "lucide-react";

const LOGO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663306080277/pKkWElgCpRmlNvjQ.png";

/* ─── Code Block with Copy ─── */
function CodeBlock({
  code,
  language = "python",
  filename,
}: {
  code: string;
  language?: string;
  filename?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden my-6">
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 bg-secondary/50 border-b border-border">
          <span className="text-xs text-muted-foreground font-mono">{filename}</span>
          <button
            onClick={handleCopy}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
      <div className="relative">
        {!filename && (
          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
        <pre className="p-4 overflow-x-auto text-sm leading-relaxed bg-secondary/30">
          <code className="text-foreground/90 font-mono">{code}</code>
        </pre>
      </div>
    </div>
  );
}

/* ─── Inline Code ─── */
function IC({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-secondary text-primary text-sm font-mono">
      {children}
    </code>
  );
}

/* ─── Section Heading ─── */
function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-2xl font-bold tracking-tight mt-16 mb-4 scroll-mt-24">
      {children}
    </h2>
  );
}

function SubHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="text-lg font-semibold tracking-tight mt-10 mb-3 scroll-mt-24">
      {children}
    </h3>
  );
}

/* ─── Param Table ─── */
function ParamTable({
  params,
}: {
  params: { name: string; type: string; default: string; desc: string }[];
}) {
  return (
    <div className="overflow-x-auto my-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Parameter</th>
            <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Type</th>
            <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Default</th>
            <th className="text-left py-2.5 text-muted-foreground font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p) => (
            <tr key={p.name} className="border-b border-border/50">
              <td className="py-2.5 pr-4 font-mono text-primary text-xs">{p.name}</td>
              <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">{p.type}</td>
              <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">{p.default}</td>
              <td className="py-2.5 text-muted-foreground">{p.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Info Callout ─── */
function Callout({ children, type = "info" }: { children: React.ReactNode; type?: "info" | "warning" | "tip" }) {
  const styles = {
    info: "border-primary/20 bg-primary/5",
    warning: "border-yellow-500/20 bg-yellow-500/5",
    tip: "border-green-500/20 bg-green-500/5",
  };
  return (
    <div className={`mt-6 p-4 rounded-lg border ${styles[type]}`}>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

/* ─── Sidebar Navigation ─── */
const NAV_SECTIONS = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "getting-started", label: "Getting Started", icon: Zap },
  { id: "python-sdk", label: "Python SDK", icon: Code2 },
  { id: "governance", label: "Governance", icon: Shield },
  { id: "frameworks", label: "Framework Integrations", icon: Plug },
  { id: "rest-api", label: "REST API", icon: Globe },
  { id: "providers", label: "Providers", icon: Layers },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "team", label: "Team Management", icon: Users },
  { id: "cost-tracking", label: "Cost Tracking", icon: DollarSign },
  { id: "security", label: "Security", icon: ShieldAlert },
  { id: "explainability", label: "Explainability", icon: Sparkles },
  { id: "cicd", label: "CI/CD Integration", icon: Plug },
  { id: "endpoints", label: "All Endpoints", icon: Blocks },
  { id: "response-headers", label: "Response Headers", icon: Eye },
  { id: "advanced", label: "Advanced Features", icon: Wrench },
  { id: "self-hosted", label: "Self-Hosted Proxy", icon: Shield },
  { id: "examples", label: "Example Apps", icon: FlaskConical },
  { id: "errors", label: "Error Handling", icon: Activity },
  { id: "changelog", label: "Changelog", icon: FileWarning },
];

function Sidebar({ activeSection }: { activeSection: string }) {
  return (
    <div className="hidden lg:block w-56 shrink-0">
      <div className="sticky top-24">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Documentation
        </p>
        <nav className="space-y-0.5">
          {NAV_SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                activeSection === s.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <s.icon className="w-3.5 h-3.5 shrink-0" />
              {s.label}
            </a>
          ))}
        </nav>

        <div className="mt-8 pt-6 border-t border-border/40">
          <a
            href="https://pypi.org/project/prysmai/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            PyPI Package
          </a>
          <a
            href="https://github.com/osasisorae/prysmai-python"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2"
          >
            <ExternalLink className="w-3 h-3" />
            GitHub Source
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─── Navbar ─── */
function DocsNav({ onEarlyAccess }: { onEarlyAccess: () => void }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur-xl bg-background/80">
      <div className="container flex items-center justify-between h-16">
        <Link href="/">
          <div className="flex items-center gap-2.5 cursor-pointer">
            <img src={LOGO_URL} alt="Prysm AI" className="w-8 h-8" />
            <span className="text-lg font-semibold tracking-tight">
              Prysm<span className="text-primary">AI</span>
            </span>
          </div>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <Link href="/docs" className="text-foreground font-medium">Docs</Link>
          <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
        </div>
        <Button
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={onEarlyAccess}
        >
          Get Early Access
        </Button>
      </div>
    </nav>
  );
}

/* ─── Footer ─── */
function DocsFooter() {
  return (
    <footer className="border-t border-border py-16">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <img src={LOGO_URL} alt="Prysm AI" className="w-7 h-7" />
            <span className="text-sm font-semibold">
              Prysm<span className="text-primary">AI</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Prysm AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Main Docs Page ─── */
export default function Docs() {
  const [activeSection, setActiveSection] = useState("overview");
  const [earlyAccessOpen, setEarlyAccessOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 }
    );

    NAV_SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DocsNav onEarlyAccess={() => setEarlyAccessOpen(true)} />

      {/* Hero */}
      <section className="pt-28 pb-12 border-b border-border/40">
        <div className="container">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground">Documentation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Prysm AI Documentation
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Full platform documentation for Prysm AI — the observability proxy for LLM applications.
            Covers the Python SDK, REST API, dashboard features, alerting, team management, and more.
          </p>
          <div className="flex items-center gap-4 mt-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border font-mono text-sm">
              <Terminal className="w-4 h-4 text-primary" />
              <span>pip install prysmai</span>
            </div>
            <a
              href="https://pypi.org/project/prysmai/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                v0.5.0 on PyPI <ExternalLink className="w-3 h-3" />
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* What's New Banner */}
      <div className="container pt-8 pb-0">
        <div className="rounded-lg border border-primary/30 bg-primary/[0.04] p-5">
            <div className="flex items-start gap-4">
            <div className="shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1.5">
                What&apos;s New in v0.5.0
              </h3>
              <p className="text-xs text-muted-foreground mb-2">Governance Layer &mdash; March 8, 2026</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li><strong className="text-foreground">Governance Layer</strong> &mdash; New <a href="#governance" className="text-primary hover:underline"><code className="text-xs bg-secondary/50 px-1.5 py-0.5 rounded">GovernanceSession</code></a> class for behavioral monitoring, code security scanning, and policy enforcement across agent sessions</li>
                <li><strong className="text-foreground">LangGraph Integration</strong> &mdash; Replaced LangChain with <a href="#fw-langgraph" className="text-primary hover:underline"><code className="text-xs bg-secondary/50 px-1.5 py-0.5 rounded">PrysmGraphMonitor</code></a> &mdash; graph-aware telemetry with node tracking, state transitions, and governance support</li>
                <li><strong className="text-foreground">CrewAI Governance</strong> &mdash; <a href="#fw-crewai" className="text-primary hover:underline"><code className="text-xs bg-secondary/50 px-1.5 py-0.5 rounded">governance=True</code></a> flag on <code className="text-xs bg-secondary/50 px-1.5 py-0.5 rounded">PrysmCrewMonitor</code> auto-starts behavioral detection for crew runs</li>
                <li><strong className="text-foreground">Behavioral Detectors</strong> &mdash; Early stopping and tool undertriggering detection with evidence-based severity scoring</li>
                <li><strong className="text-foreground">MCP Endpoint</strong> &mdash; Model Context Protocol server at <code className="text-xs bg-secondary/50 px-1.5 py-0.5 rounded">/api/mcp</code> for direct agent-to-governance communication</li>
              </ul>
              <details className="mt-3">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">v0.4.1 highlights</summary>
                <ul className="text-sm text-muted-foreground space-y-1 mt-2">
                  <li><strong className="text-foreground">SDK Bug Fixes</strong> &mdash; Fixed <code className="text-xs bg-secondary/50 px-1.5 py-0.5 rounded">AttributeError</code> in callback handler, fixed CrewAI delegation tool crashes</li>
                  <li><strong className="text-foreground">Response Headers</strong> &mdash; Security scan results and rate limit headers on all proxy responses</li>
                  <li><strong className="text-foreground">Models Endpoint</strong> &mdash; <code className="text-xs bg-secondary/50 px-1.5 py-0.5 rounded">GET /api/v1/models</code> lists all supported models</li>
                  <li><strong className="text-foreground">PagerDuty Alerts</strong> &mdash; Trigger and auto-resolve incidents via Events API v2</li>
                </ul>
              </details>
              <details className="mt-2">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">v0.4.0 highlights</summary>
                <ul className="text-sm text-muted-foreground space-y-1 mt-2">
                  <li><strong className="text-foreground">Framework Integrations</strong> &mdash; Native callbacks for CrewAI and LlamaIndex</li>
                  <li><strong className="text-foreground">Off-Topic Detection</strong> &mdash; Keyword + LLM-based relevance scoring</li>
                  <li><strong className="text-foreground">ML Toxicity Scoring</strong> &mdash; 6-dimension content analysis</li>
                  <li><strong className="text-foreground">NER-Based PII Detection</strong> &mdash; LLM-powered entity recognition</li>
                </ul>
              </details>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-12">
        <div className="flex gap-12">
          <Sidebar activeSection={activeSection} />

          <div className="flex-1 max-w-3xl">

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* OVERVIEW */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <SectionHeading id="overview">Overview</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Prysm AI is an observability and security proxy for LLM applications. It sits between your application
              and your LLM provider, capturing every request and response with full metrics — latency,
              token counts, cost, errors, and the complete prompt/completion data. It also scans every
              request for prompt injection attacks, PII leakage, and content policy violations in real time.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Instead of adding logging code throughout your application, you route your LLM traffic
              through Prysm with a single configuration change. The proxy is fully OpenAI-compatible,
              so any application that uses the OpenAI SDK works with Prysm out of the box.
            </p>

            <div className="my-8 p-6 rounded-lg bg-secondary/30 border border-border font-mono text-sm leading-loose text-center">
              <span className="text-foreground">Your App</span>
              <span className="text-muted-foreground mx-3">&rarr;</span>
              <span className="text-primary font-semibold">Prysm Proxy</span>
              <span className="text-muted-foreground mx-3">&rarr;</span>
              <span className="text-foreground">LLM Provider</span>
              <br />
              <span className="text-muted-foreground text-xs mt-2 inline-block">
                (OpenAI, Anthropic, Google Gemini, vLLM, Ollama, or any OpenAI-compatible endpoint)
              </span>
              <br />
              <span className="text-muted-foreground text-xs inline-block">
                &darr; traces, metrics, cost, latency, alerts, security scanning &mdash; all captured automatically
              </span>
            </div>

            <SubHeading id="what-you-get">What You Get</SubHeading>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Feature</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Multi-provider proxy", "OpenAI, Anthropic (auto-translated), Google Gemini (native OpenAI-compatible), vLLM, Ollama, any OpenAI-compatible endpoint"],
                    ["Full trace capture", "Every request/response logged with tokens, latency, cost, model, and metadata"],
                    ["Real-time dashboard", "Live metrics charts, request explorer, model usage breakdown, WebSocket live feed"],
                    ["3 proxy endpoints", "Chat completions, text completions, and embeddings"],
                    ["Streaming support", "SSE passthrough with Time to First Token (TTFT) measurement"],
                    ["Alerting engine", "Email, Slack, Discord, and custom webhook alerts on metric thresholds"],
                    ["Team management", "Invite members via email, assign roles, manage access"],
                    ["API key auth", "sk-prysm-* keys with SHA-256 hashing, create/revoke from dashboard"],
                    ["Cost tracking", "Automatic cost calculation for 10+ models, custom pricing for any model"],
                    ["Python SDK", "Published on PyPI — one line to integrate"],
                    ["Tool calling & logprobs", "Captured and displayed in the trace detail panel"],
                    ["Usage enforcement", "Free tier limit (10K requests/month) with 429 response at limit"],
                    ["Prompt injection detection", "20+ attack patterns across 7 categories with configurable blocking"],
                    ["PII detection & redaction", "8 data types (email, phone, SSN, credit cards, API keys, IPs) with mask/hash/block modes"],
                    ["Content policy enforcement", "5 built-in policies + custom keywords, composite threat scoring (0–100)"],
                    ["Security dashboard", "Real-time threat log, stats overview, and configuration management"],
                    ["Token confidence heatmap", "Per-token confidence visualization with OKLCH color gradient (OpenAI, Gemini native logprobs; Anthropic estimated)"],
                    ["Hallucination detection", "Automatic identification of low-confidence segments with risk scoring"],
                    ["\"Why did it say that?\"", "LLM-powered explanations for any completion with decision analysis"],
                    ["Decision points timeline", "Visual timeline of high-entropy tokens where the model considered alternatives"],
                    ["Model comparison", "Side-by-side confidence and hallucination risk comparison across traces"],
                  ].map(([feature, desc]) => (
                    <tr key={feature} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-medium text-foreground whitespace-nowrap">{feature}</td>
                      <td className="py-2.5 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* GETTING STARTED */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <SectionHeading id="getting-started">Getting Started</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Get from zero to full observability in under 5 minutes. Here's the complete flow:
            </p>

            <SubHeading id="step-1">1. Create Your Account</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Sign up at <IC>prysmai.io</IC> and complete the onboarding wizard. You'll create
              an organization and your first project during setup.
            </p>

            <SubHeading id="step-2">2. Configure Your Provider</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              During onboarding (or later in Settings), configure which LLM provider your project
              uses. Prysm stores your provider API key securely and uses it to forward requests.
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Provider</th>
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Base URL</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["OpenAI", "https://api.openai.com/v1", "Default. All models supported."],
                    ["Anthropic", "https://api.anthropic.com", "Auto-translated to/from OpenAI format."],
                    ["Google Gemini", "https://generativelanguage.googleapis.com/v1beta/openai", "Native OpenAI-compatible endpoint. All Gemini models."],
                    ["vLLM", "http://your-server:8000/v1", "Any vLLM-served model."],
                    ["Ollama", "http://localhost:11434/v1", "Local models via Ollama."],
                    ["Custom", "Any URL", "Any OpenAI-compatible endpoint."],
                  ].map(([provider, url, notes]) => (
                    <tr key={provider} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-medium text-foreground">{provider}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">{url}</td>
                      <td className="py-2.5 text-muted-foreground">{notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Callout type="warning">
              <strong>Match each key to its provider.</strong> An Anthropic key (<IC>sk-ant-...</IC>) only works with the Anthropic provider.
              An OpenAI key (<IC>sk-...</IC>) only works with OpenAI. If you enter a key for the wrong provider,
              you'll get a <IC>401 AuthenticationError</IC> when making requests. Double-check that each provider
              field has the correct key for that specific service.
            </Callout>

            <SubHeading id="step-3">3. Generate an API Key</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Go to the <strong>API Keys</strong> page in your dashboard and create a new key.
              You'll get a key starting with <IC>sk-prysm-</IC>. Copy it immediately — the full
              key is only shown once.
            </p>

            <SubHeading id="step-4">4. Send Your First Request</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Install the Python SDK and make a request. Your provider credentials are already
              stored in your project — you only need your Prysm key. The same code works for
              every provider; just change the model name.
            </p>
            <CodeBlock
              filename="Terminal"
              language="bash"
              code="pip install prysmai"
            />
            <CodeBlock
              filename="openai_example.py"
              code={`from prysmai import PrysmClient

client = PrysmClient(prysm_key="sk-prysm-...").openai()

# OpenAI — uses your OpenAI provider key automatically
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Explain quantum computing"}],
)
print(response.choices[0].message.content)`}
            />
            <CodeBlock
              filename="anthropic_example.py"
              code={`from prysmai import PrysmClient

client = PrysmClient(prysm_key="sk-prysm-...").openai()

# Anthropic — same code, just change the model name
# Prysm detects "claude-*" and routes to your Anthropic provider key
response = client.chat.completions.create(
    model="claude-sonnet-4-20250514",
    messages=[{"role": "user", "content": "Explain quantum computing"}],
)
print(response.choices[0].message.content)`}
            />
            <CodeBlock
              filename="gemini_example.py"
              code={`from prysmai import PrysmClient

client = PrysmClient(prysm_key="sk-prysm-...").openai()

# Google Gemini — same code, just change the model name
# Prysm detects "gemini-*" and routes to your Google provider key
response = client.chat.completions.create(
    model="gemini-2.5-flash",
    messages=[{"role": "user", "content": "Explain quantum computing"}],
)
print(response.choices[0].message.content)`}
            />
            <Callout type="tip">
              <strong>One Prysm key, all providers.</strong> Notice the code is identical across all three examples —
              only the <IC>model</IC> name changes. Your Prysm key (<IC>sk-prysm-...</IC>) is the only key in your code.
              Provider keys (<IC>sk-...</IC> for OpenAI, <IC>sk-ant-...</IC> for Anthropic) stay in your Prysm dashboard settings,
              never in your application code.
            </Callout>
            <p className="text-muted-foreground leading-relaxed">
              Open your Prysm dashboard. The request appears in the live feed within seconds,
              with full metrics: latency, token counts, cost, model, and the complete prompt/response.
            </p>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* PYTHON SDK */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <SectionHeading id="python-sdk">Python SDK</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The Prysm AI Python SDK (<IC>prysmai</IC>) is published on{" "}
              <a href="https://pypi.org/project/prysmai/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                PyPI
              </a>. It requires Python 3.9+ and depends on <IC>openai</IC> (v1.0+) and <IC>httpx</IC> (v0.24+),
              both installed automatically.
            </p>
            <CodeBlock code="pip install prysmai" language="bash" filename="Terminal" />

            <Callout type="tip">
              <strong>Framework integrations (v0.5.0):</strong> Install with optional dependencies for your framework:
              <CodeBlock
                code={`pip install prysmai[langgraph]    # LangGraph
pip install prysmai[crewai]       # CrewAI
pip install prysmai[llamaindex]   # LlamaIndex
pip install prysmai[all]          # All frameworks`}
                language="bash"
              />
            </Callout>

            <SubHeading id="prysm-client">PrysmClient</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-2">
              The primary entry point. Creates sync or async OpenAI clients routed through the
              Prysm proxy. No OpenAI API key needed — the proxy uses the credentials from your
              project setup.
            </p>
            <ParamTable
              params={[
                { name: "prysm_key", type: "str", default: "PRYSM_API_KEY env", desc: "Your Prysm API key (sk-prysm-...)" },
                { name: "base_url", type: "str", default: "prysmai.io/api/v1", desc: "Prysm proxy URL" },
                { name: "timeout", type: "float", default: "120.0", desc: "Request timeout in seconds" },
              ]}
            />
            <CodeBlock
              code={`from prysmai import PrysmClient

prysm = PrysmClient(prysm_key="sk-prysm-...")

# Sync client
client = prysm.openai()

# Async client
async_client = prysm.async_openai()

# Use like any OpenAI client
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello!"}],
)`}
            />

            <Callout type="tip">
              <strong>Environment variable:</strong> Set <IC>PRYSM_API_KEY</IC> in your environment
              and skip the <IC>prysm_key</IC> parameter entirely:
              <CodeBlock
                code={`export PRYSM_API_KEY="sk-prysm-your-key-here"

# Now just:
client = PrysmClient().openai()`}
                language="bash"
              />
            </Callout>

            <SubHeading id="monitor-fn">monitor()</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-2">
              Alternative entry point for wrapping an existing OpenAI client. Useful if you
              already have a configured client and want to add Prysm observability on top.
            </p>
            <ParamTable
              params={[
                { name: "client", type: "OpenAI | AsyncOpenAI", default: "required", desc: "An OpenAI client instance" },
                { name: "prysm_key", type: "str", default: "PRYSM_API_KEY env", desc: "Your Prysm API key" },
                { name: "base_url", type: "str", default: "prysmai.io/api/v1", desc: "Prysm proxy URL" },
                { name: "timeout", type: "float", default: "120.0", desc: "Request timeout in seconds" },
              ]}
            />
            <CodeBlock
              code={`from openai import OpenAI
from prysmai import monitor

monitored = monitor(OpenAI(), prysm_key="sk-prysm-...")

response = monitored.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello!"}],
)`}
            />

            <SubHeading id="context-metadata">Context & Metadata</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Attach metadata to every request for filtering and grouping in your dashboard.
              Tag requests with user IDs, session IDs, or any custom key-value pairs.
            </p>
            <CodeBlock
              filename="global_context.py"
              code={`from prysmai import prysm_context

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

# Back to user_123 outside the block`}
            />

            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Method</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["prysm_context.set()", "Set global context for all subsequent requests"],
                    ["prysm_context.get()", "Get the current context object"],
                    ["prysm_context.clear()", "Reset context to defaults"],
                    ["prysm_context(...)", "Use as context manager for scoped metadata"],
                    ["governance_session_id", "(v0.5.0) Auto-set when GovernanceSession is active — links traces to governance reports"],
                  ].map(([method, desc]) => (
                    <tr key={method} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-mono text-primary text-xs">{method}</td>
                      <td className="py-2.5 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SubHeading id="streaming">Streaming</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Streaming works exactly as you'd expect — no changes needed. The proxy captures
              Time to First Token (TTFT), total latency, and the full streamed content.
            </p>
            <CodeBlock
              filename="streaming.py"
              code={`stream = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Write a haiku about AI"}],
    stream=True,
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")`}
            />

            <SubHeading id="async-support">Async Support</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Full async support with the same API. Use <IC>async_openai()</IC> from PrysmClient.
            </p>
            <CodeBlock
              filename="async_example.py"
              code={`import asyncio
from prysmai import PrysmClient

async def main():
    client = PrysmClient(prysm_key="sk-prysm-...").async_openai()

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "Hello async!"}],
    )
    print(response.choices[0].message.content)

asyncio.run(main())`}
            />

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* Governance */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <SectionHeading id="governance">Governance</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The governance layer (v0.5.0) monitors agent sessions for behavioral anomalies,
              scans generated code for security vulnerabilities, and enforces policies across
              your AI operations. It works standalone or integrated into LangGraph and CrewAI workflows.
            </p>

            <SubHeading id="gov-session">GovernanceSession</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-2">
              The <IC>GovernanceSession</IC> context manager wraps an agent&apos;s work session.
              It communicates with the Prysm governance endpoint via the Model Context Protocol (MCP)
              to start sessions, report events, run behavioral checks, scan code, and generate
              end-of-session reports.
            </p>
            <CodeBlock
              filename="governance_example.py"
              code={`from prysmai import PrysmClient
from prysmai.governance import GovernanceSession

client = PrysmClient(prysm_key="sk-prysm-...")

# Context manager handles session lifecycle automatically
with GovernanceSession(
    client,
    task="Fix authentication bug in user service",
    agent_type="claude_code",
    auto_check_interval=5  # Check behavior every 5 events
) as gov:
    # Report events as they happen
    gov.report_event("llm_call", {
        "model": "gpt-4o",
        "messages": [{"role": "user", "content": "Analyze auth flow"}],
        "tokens": 1200
    })

    gov.report_event("tool_call", {
        "tool": "read_file",
        "arguments": {"path": "auth/service.py"}
    })

    # Scan generated code for vulnerabilities
    result = gov.scan_code(
        code="password = request.args.get('pwd')",
        language="python"
    )
    # result.findings: list of security issues

    # Manually trigger behavioral check
    assessment = gov.check_behavior()
    # assessment.detectors: early_stopping, tool_undertriggering

# Session auto-ends, report generated in dashboard`}
            />

            <ParamTable
              params={[
                { name: "client", type: "PrysmClient", default: "required", desc: "Authenticated PrysmClient instance" },
                { name: "task", type: "str", default: "None", desc: "Description of the agent's task" },
                { name: "agent_type", type: "str", default: "None", desc: "Agent framework identifier (e.g., 'claude_code', 'crewai', 'langgraph')" },
                { name: "auto_check_interval", type: "int", default: "0", desc: "Auto-run behavioral check every N events (0 = disabled)" },
                { name: "metadata", type: "dict", default: "{}", desc: "Custom metadata attached to the governance session" },
              ]}
            />

            <SubHeading id="gov-detectors">Behavioral Detectors</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The governance engine runs two high-confidence behavioral detectors on every session.
              Each detector produces evidence-based findings with severity scores (0–100).
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Detector</th>
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">What It Catches</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Early Stopping", "Agent quits before completing its stated task — e.g., stops after reading a file without implementing the fix", "Unfollowed intents, incomplete tool sequences, premature session end"],
                    ["Tool Undertriggering", "Agent has tools available but doesn't use them when the task requires it — e.g., generates code without running tests", "Available vs. used tool ratio, task-tool mismatch, unused critical tools"],
                  ].map(([detector, catches, evidence]) => (
                    <tr key={detector} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-medium text-foreground whitespace-nowrap">{detector}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{catches}</td>
                      <td className="py-2.5 text-muted-foreground">{evidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SubHeading id="gov-code-scan">Code Security Scanning</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Use <IC>gov.scan_code()</IC> to scan any code generated by your agent for security
              vulnerabilities before it gets committed or executed. The scanner checks for
              injection flaws, hardcoded secrets, unsafe deserialization, and more.
            </p>
            <CodeBlock
              filename="code_scan.py"
              code={`result = gov.scan_code(
    code="""import subprocess\nsubprocess.call(user_input, shell=True)""",
    language="python"
)

for finding in result.get("findings", []):
    print(f"[{finding['severity']}] {finding['rule']}: {finding['message']}")
    # [HIGH] command-injection: User input passed to shell=True subprocess`}
            />

            <SubHeading id="gov-mcp">MCP Endpoint</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The governance layer exposes a Model Context Protocol (MCP) server at <IC>/api/mcp</IC>.
              Any MCP-compatible agent (Claude Code, Cursor, etc.) can connect directly for
              governance without the Python SDK. The endpoint uses Streamable HTTP transport
              with JSON-RPC 2.0 over SSE.
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">MCP Tool</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["session_start", "Begin a governance session with task description and agent metadata"],
                    ["check_behavior", "Run behavioral detectors on accumulated session events"],
                    ["scan_code", "Scan code for security vulnerabilities (Python, JS, TS, Go, Rust, etc.)"],
                    ["session_end", "End session, run final assessment, generate report"],
                  ].map(([tool, desc]) => (
                    <tr key={tool} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-mono text-primary text-xs">{tool}</td>
                      <td className="py-2.5 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SubHeading id="gov-dashboard">Governance Dashboard</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              All governance data flows into three dedicated dashboard views:
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">View</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">What You See</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Session Explorer", "Browse all agent sessions with event timelines, behavioral assessments, and code scan results"],
                    ["Governance Dashboard", "Aggregate metrics — session counts, anomaly rates, detector trends, severity distributions"],
                    ["Policy Manager", "Create and manage governance policies, view violations, set enforcement actions"],
                  ].map(([view, desc]) => (
                    <tr key={view} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-medium text-foreground whitespace-nowrap">{view}</td>
                      <td className="py-2.5 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* Framework Integrations */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <SectionHeading id="frameworks">Framework Integrations</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Prysm AI integrates natively with popular LLM frameworks. Each integration captures
              framework-specific events (chain runs, agent actions, tool calls, task completions)
              and sends them to your Prysm dashboard alongside your standard LLM traces.
            </p>

            <SubHeading id="fw-langgraph">LangGraph</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-2">
              The <IC>PrysmGraphMonitor</IC> integrates with LangGraph&apos;s stateful graph execution to capture
              node transitions, LLM calls, tool invocations, and state checkpoints. Supports <IC>governance=True</IC> for
              automatic behavioral detection during graph runs.
            </p>
            <CodeBlock
              code="pip install prysmai[langgraph]"
              language="bash"
              filename="Terminal"
            />
            <CodeBlock
              filename="langgraph_example.py"
              code={`from langgraph.graph import StateGraph, MessagesState
from langchain_openai import ChatOpenAI
from prysmai.integrations.langgraph import PrysmGraphMonitor

# Initialize the graph monitor
monitor = PrysmGraphMonitor(
    prysm_key="sk-prysm-...",
    metadata={"app": "research-agent", "env": "production"},
    governance=True  # Enable behavioral detection
)

# Build your graph as usual
def agent_node(state: MessagesState):
    llm = ChatOpenAI(model="gpt-4o-mini")
    return {"messages": [llm.invoke(state["messages"])]}

graph = StateGraph(MessagesState)
graph.add_node("agent", agent_node)
graph.set_entry_point("agent")
app = graph.compile()

# Run with Prysm monitoring — all events captured
result = app.invoke(
    {"messages": [{"role": "user", "content": "Analyze this codebase"}]},
    config={"callbacks": [monitor.callback_handler()]}
)

# Flush remaining events and close governance session
monitor.close()`}
            />

            <ParamTable
              params={[
                { name: "prysm_key", type: "str", default: "PRYSM_API_KEY env", desc: "Your Prysm API key" },
                { name: "base_url", type: "str", default: "prysmai.io/api/v1", desc: "Prysm proxy URL" },
                { name: "metadata", type: "dict", default: "{}", desc: "Global metadata attached to all events" },
                { name: "governance", type: "bool", default: "False", desc: "(v0.5.0) Enable governance session with behavioral detection" },
                { name: "governance_task", type: "str", default: "None", desc: "(v0.5.0) Task description for the governance session" },
                { name: "batch_size", type: "int", default: "50", desc: "Events buffered before auto-flush" },
              ]}
            />

            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Captured Events</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Node transitions", "Node name, entry/exit timestamps, state changes"],
                    ["LLM calls", "Model, messages, tokens, latency, completion content"],
                    ["Tool calls", "Tool name, arguments, output, errors, owning node"],
                    ["State checkpoints", "Graph state snapshots at each node boundary"],
                    ["Conditional routing", "Edge decisions, branch taken, routing logic"],
                    ["Governance alerts", "(v0.5.0) Behavioral anomalies detected during execution"],
                  ].map(([event, desc]) => (
                    <tr key={event} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-mono text-primary text-xs">{event}</td>
                      <td className="py-2.5 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SubHeading id="fw-crewai">CrewAI</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-2">
              The <IC>PrysmCrewMonitor</IC> wraps CrewAI crews to capture the full lifecycle &mdash;
              crew execution, individual agent runs, task completions, and tool usage. In v0.5.0,
              pass <IC>governance=True</IC> to automatically start a governance session that monitors
              the crew for behavioral anomalies like early stopping and tool undertriggering.
            </p>
            <CodeBlock
              code="pip install prysmai[crewai]"
              language="bash"
              filename="Terminal"
            />
            <CodeBlock
              filename="crewai_example.py"
              code={`from crewai import Agent, Task, Crew
from prysmai.integrations.crewai import PrysmCrewMonitor

# Initialize the monitor with governance enabled
monitor = PrysmCrewMonitor(
    prysm_key="sk-prysm-...",
    metadata={"project": "research-crew"},
    governance=True,  # v0.5.0: auto-starts behavioral detection
    governance_task="Research and summarize findings"
)

# Define your crew as usual
researcher = Agent(
    role="Researcher",
    goal="Find accurate information",
    backstory="Expert researcher",
)
task = Task(
    description="Research mechanistic interpretability",
    agent=researcher,
    expected_output="A summary of key findings"
)
crew = Crew(agents=[researcher], tasks=[task])

# Wrap the crew — all events + governance captured automatically
monitor.monitor_crew(crew)
result = crew.kickoff()

# Flush events and close governance session
monitor.close()`}
            />

            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Captured Events</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Crew lifecycle", "Start/end timestamps, total duration, final output"],
                    ["Agent runs", "Agent role, goal, start/end, output"],
                    ["Task execution", "Task description, assigned agent, output, duration"],
                    ["Tool usage", "Tool name, arguments, result, errors"],
                    ["Governance alerts", "(v0.5.0) Behavioral anomalies detected during crew execution"],
                  ].map(([event, desc]) => (
                    <tr key={event} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-mono text-primary text-xs">{event}</td>
                      <td className="py-2.5 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SubHeading id="fw-llamaindex">LlamaIndex</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-2">
              The <IC>PrysmSpanHandler</IC> integrates with LlamaIndex's instrumentation system
              to capture query spans, LLM calls, embedding operations, and retrieval events
              across your RAG pipelines.
            </p>
            <CodeBlock
              code="pip install prysmai[llamaindex]"
              language="bash"
              filename="Terminal"
            />
            <CodeBlock
              filename="llamaindex_example.py"
              code={`from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, Settings
from llama_index.core.instrumentation import get_dispatcher
from prysmai.integrations.llamaindex import PrysmSpanHandler

# Initialize the span handler
handler = PrysmSpanHandler(
    prysm_key="sk-prysm-...",
    metadata={"pipeline": "doc-qa"}
)

# Register with LlamaIndex's dispatcher
dispatcher = get_dispatcher()
dispatcher.add_span_handler(handler)

# Use LlamaIndex as usual — all spans are captured
documents = SimpleDirectoryReader("data").load_data()
index = VectorStoreIndex.from_documents(documents)
query_engine = index.as_query_engine()

response = query_engine.query("What is SAE analysis?")
print(response)

# Flush when done
handler.close()`}
            />

            <Callout type="tip">
              <strong>All frameworks together:</strong> Install everything with{" "}
              <IC>pip install prysmai[all]</IC>. Each integration sends events to the same
              Prysm dashboard, so you get a unified view across LangGraph graphs, CrewAI crews,
              and LlamaIndex pipelines. Enable <IC>governance=True</IC> on any integration to add
              behavioral detection.
            </Callout>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* REST API */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <SectionHeading id="rest-api">REST API</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You don't need the Python SDK to use Prysm. The proxy exposes standard OpenAI-compatible
              REST endpoints. Any HTTP client, any language — just change the base URL and API key.
            </p>

            <SubHeading id="rest-chat">Chat Completions</SubHeading>
            <CodeBlock
              filename="cURL"
              language="bash"
              code={`curl -X POST https://prysmai.io/api/v1/chat/completions \\
  -H "Authorization: Bearer sk-prysm-your-key" \\
  -H "Content-Type: application/json" \\
  -H "X-Prysm-User-Id: user_123" \\
  -H "X-Prysm-Session-Id: sess_abc" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}
            />

            <SubHeading id="rest-completions">Text Completions</SubHeading>
            <CodeBlock
              filename="cURL"
              language="bash"
              code={`curl -X POST https://prysmai.io/api/v1/completions \\
  -H "Authorization: Bearer sk-prysm-your-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-3.5-turbo-instruct",
    "prompt": "Once upon a time",
    "max_tokens": 100
  }'`}
            />

            <SubHeading id="rest-embeddings">Embeddings</SubHeading>
            <CodeBlock
              filename="cURL"
              language="bash"
              code={`curl -X POST https://prysmai.io/api/v1/embeddings \\
  -H "Authorization: Bearer sk-prysm-your-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "text-embedding-3-small",
    "input": "The quick brown fox"
  }'`}
            />

            <SubHeading id="rest-health">Health Check</SubHeading>
            <CodeBlock
              filename="cURL"
              language="bash"
              code={`curl https://prysmai.io/api/v1/health
# Returns: { "status": "ok", "proxy": "prysm-ai" }`}
            />

            <SubHeading id="custom-headers">Custom Headers</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Attach metadata to any request using these optional headers. They appear in your
              dashboard traces and can be used for filtering.
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Header</th>
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Type</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["X-Prysm-User-Id", "string", "Tag the request with an end-user identifier"],
                    ["X-Prysm-Session-Id", "string", "Group requests into a session"],
                    ["X-Prysm-Metadata", "JSON string", "Arbitrary key-value pairs (must be valid JSON)"],
                  ].map(([header, type, desc]) => (
                    <tr key={header} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-mono text-primary text-xs">{header}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">{type}</td>
                      <td className="py-2.5 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SubHeading id="rest-js">JavaScript / TypeScript</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Use the OpenAI Node.js SDK with Prysm — just change the base URL and API key:
            </p>
            <CodeBlock
              filename="app.ts"
              language="typescript"
              code={`import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://prysmai.io/api/v1",
  apiKey: "sk-prysm-your-key",
});

const response = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello from TypeScript!" }],
});

console.log(response.choices[0].message.content);`}
            />

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* PROVIDERS */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <SectionHeading id="providers">Providers</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Prysm supports <strong>multiple LLM providers per project</strong>. Connect all your provider
              API keys once, and Prysm auto-routes each request to the correct provider based on the model name.
              One Prysm API key handles all providers.
            </p>

            <SubHeading id="multi-provider-routing">Multi-Provider Routing</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Instead of creating separate projects per provider, connect all your API keys to a single project.
              When you send a request, Prysm detects the provider from the model name and routes automatically:
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Model Pattern</th>
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Routes To</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Examples</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["gpt-*, o1-*, o3-*", "OpenAI", "gpt-4o, gpt-4o-mini, o1-preview, o3-mini"],
                    ["claude-*", "Anthropic", "claude-sonnet-4-20250514, claude-3-5-haiku"],
                    ["gemini-*, gemma-*", "Google", "gemini-2.5-flash, gemini-2.5-pro"],
                    ["llama*, mistral*, deepseek*", "OpenAI-compatible", "llama-3.1-70b, mistral-large, deepseek-chat"],
                  ].map(([pattern, provider, examples]) => (
                    <tr key={pattern} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-mono text-xs text-primary">{pattern}</td>
                      <td className="py-2.5 pr-4 font-medium text-foreground">{provider}</td>
                      <td className="py-2.5 text-muted-foreground text-xs">{examples}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You can also force a specific provider with the <IC>X-Prysm-Provider</IC> header:
            </p>
            <CodeBlock code={`curl -X POST https://your-prysm.manus.space/api/v1/chat/completions \\
  -H "Authorization: Bearer sk-prysm-YOUR_KEY" \\
  -H "X-Prysm-Provider: anthropic" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "claude-sonnet-4-20250514", "messages": [{"role": "user", "content": "Hello"}]}'`} language="bash" filename="Multi-Provider Example" />
            <p className="text-muted-foreground leading-relaxed mb-4">
              Configure your provider keys in <strong>Settings &rarr; Provider</strong>. The first provider
              you add becomes the default for requests with unrecognized model names.
            </p>

            <SubHeading id="provider-openai">OpenAI</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The default provider. All OpenAI models are supported, including GPT-4o, GPT-4o-mini,
              GPT-4 Turbo, GPT-3.5 Turbo, and embedding models. Requests are forwarded as-is with
              no translation.
            </p>

            <SubHeading id="provider-anthropic">Anthropic</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Prysm automatically translates between OpenAI and Anthropic formats. You send
              OpenAI-format requests, and the proxy handles the conversion:
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">What</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">How It Works</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Request format", "OpenAI messages → Anthropic messages API (system extracted, roles mapped)"],
                    ["Response format", "Anthropic content blocks → OpenAI choices format"],
                    ["Streaming", "Anthropic SSE events → OpenAI SSE format (message_start, content_block_delta, etc.)"],
                    ["Tool calling", "OpenAI tool definitions → Anthropic tool format and back"],
                    ["Models", "claude-3-5-sonnet, claude-3-5-haiku, claude-3-opus, and all Claude models"],
                  ].map(([what, how]) => (
                    <tr key={what} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-medium text-foreground whitespace-nowrap">{what}</td>
                      <td className="py-2.5 text-muted-foreground">{how}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Set provider to <IC>anthropic</IC> and base URL to <IC>https://api.anthropic.com</IC> in
              your project settings. Then use your code exactly as if calling OpenAI — Prysm handles
              the rest.
            </p>

            <SubHeading id="provider-google">Google Gemini</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Google Gemini provides a native OpenAI-compatible endpoint, so no translation is needed.
              Prysm routes your requests directly to Google's API using the standard OpenAI format.
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Feature</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Request format", "Standard OpenAI format — sent directly to Google's OpenAI-compatible endpoint"],
                    ["Response format", "Standard OpenAI format — returned natively by Google"],
                    ["Streaming", "Full SSE streaming support via OpenAI-compatible endpoint"],
                    ["Embeddings", "Supported via Google's text-embedding model"],
                    ["Models", "gemini-2.5-pro, gemini-2.5-flash, gemini-2.0-flash, gemini-3-pro-preview, and all Gemini models"],
                  ].map(([what, how]) => (
                    <tr key={what} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-medium text-foreground whitespace-nowrap">{what}</td>
                      <td className="py-2.5 text-muted-foreground">{how}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Set provider to <IC>google</IC> in your project settings. The base URL is automatically
              set to <IC>https://generativelanguage.googleapis.com/v1beta/openai</IC>. Use your Google AI
              API key as the upstream API key.
            </p>

            <SubHeading id="provider-custom">Custom / Self-Hosted Models</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Any endpoint that speaks the OpenAI API format works with Prysm. This includes
              vLLM, Ollama, Together AI, Fireworks, and any other OpenAI-compatible server.
              Set the provider to <IC>openai</IC> (or <IC>custom</IC>) and point the base URL at
              your server.
            </p>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* DASHBOARD */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <SectionHeading id="dashboard">Dashboard</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The Prysm dashboard gives you a real-time view of your LLM usage. It's organized
              into four main sections, accessible from the sidebar navigation.
            </p>

            <SubHeading id="dash-overview">Overview</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The main dashboard page shows key metrics at a glance:
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Widget</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">What It Shows</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Metric cards", "Total requests, total tokens, total cost, average latency (with p50/p95/p99)"],
                    ["Request volume chart", "Requests over time, grouped by hour or day"],
                    ["Latency distribution", "Histogram showing latency spread across requests"],
                    ["Error rate chart", "Error percentage over time"],
                    ["Cost accumulation", "Cumulative spend over time"],
                    ["Model usage breakdown", "Pie chart of requests per model"],
                    ["Live trace feed", "Real-time WebSocket feed of incoming requests (green pulse indicator when connected)"],
                  ].map(([widget, desc]) => (
                    <tr key={widget} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-medium text-foreground whitespace-nowrap">{widget}</td>
                      <td className="py-2.5 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SubHeading id="dash-requests">Request Explorer</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              A searchable, filterable table of every trace. Click any row to open the detail panel,
              which shows the full prompt messages, completion, token counts, latency, cost, model,
              status, tool calls, logprobs, and any metadata you attached.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Filter by model, status (success/error), date range, or search by content. The table
              supports pagination for large datasets.
            </p>

            <SubHeading id="dash-keys">API Keys Page</SubHeading>
            <p className="text-muted-foreground leading-relaxed">
              Create, view, and revoke API keys. Each key shows its prefix (<IC>sk-prysm-xxxx...</IC>),
              creation date, and a quick start code snippet for immediate use.
            </p>

            <SubHeading id="dash-settings">Settings</SubHeading>
            <p className="text-muted-foreground leading-relaxed">
              Manage your project configuration (provider, base URL, model, API key), alerts, team
              members, usage tracking, and custom model pricing — all from tabbed settings panels.
            </p>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* API KEYS */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <SectionHeading id="api-keys">API Keys</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              API keys authenticate your requests to the Prysm proxy. Each key is scoped to a
              single project and uses the <IC>sk-prysm-</IC> prefix for easy identification.
            </p>

            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Action</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">How</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Create a key", "Dashboard → API Keys → Create New Key. The full key is shown once — copy it immediately."],
                    ["View keys", "Dashboard → API Keys. Shows prefix, creation date, and status for each key."],
                    ["Revoke a key", "Click the revoke button next to any key. Revoked keys stop working immediately."],
                    ["Rotate a key", "Create a new key, update your application, then revoke the old key."],
                  ].map(([action, how]) => (
                    <tr key={action} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-medium text-foreground whitespace-nowrap">{action}</td>
                      <td className="py-2.5 text-muted-foreground">{how}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Callout type="info">
              <strong>Security:</strong> Keys are hashed with SHA-256 before storage. Prysm never
              stores or displays the full key after creation. If you lose a key, create a new one
              and revoke the old one.
            </Callout>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* ALERTS */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <SectionHeading id="alerts">Alerts</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Set up alerts to get notified when your LLM metrics cross a threshold. Alerts are
              evaluated every 5 minutes against your recent trace data.
            </p>

            <SubHeading id="alert-metrics">Supported Metrics</SubHeading>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Metric</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["error_rate", "Percentage of requests that returned an error"],
                    ["latency_p50", "Median latency across requests in the evaluation window"],
                    ["latency_p95", "95th percentile latency"],
                    ["latency_p99", "99th percentile latency"],
                    ["cost_total", "Total cost in USD within the evaluation window"],
                    ["request_count", "Number of requests within the evaluation window"],
                  ].map(([metric, desc]) => (
                    <tr key={metric} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-mono text-primary text-xs">{metric}</td>
                      <td className="py-2.5 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SubHeading id="alert-conditions">Conditions</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Each alert uses a condition operator to compare the metric value against your threshold:
              <IC>gt</IC> (greater than), <IC>gte</IC> (greater than or equal), <IC>lt</IC> (less than),
              <IC>lte</IC> (less than or equal), <IC>eq</IC> (equal).
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Example: "Alert me when <IC>error_rate</IC> is <IC>gt</IC> <IC>5</IC>" fires when
              your error rate exceeds 5% in the evaluation window.
            </p>

            <SubHeading id="alert-channels">Notification Channels</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Each alert can send notifications to one or more channels:
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Channel</th>
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Target Format</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Email", "email@example.com", "Sent via Resend from hello@prysmai.io"],
                    ["Slack", "https://hooks.slack.com/services/...", "Posts to a Slack incoming webhook"],
                    ["Discord", "https://discord.com/api/webhooks/...", "Posts to a Discord webhook"],
                    ["PagerDuty", "PagerDuty Integration Key (32-char)", "Events API v2 — triggers and auto-resolves incidents with dedup_key"],
                    ["Webhook", "https://your-server.com/alerts", "POST with JSON payload (alert name, metric, value, threshold)"],
                  ].map(([channel, target, notes]) => (
                    <tr key={channel} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-medium text-foreground">{channel}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">{target}</td>
                      <td className="py-2.5 text-muted-foreground">{notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SubHeading id="alert-setup">Setting Up Alerts</SubHeading>
            <p className="text-muted-foreground leading-relaxed">
              Go to <strong>Settings &rarr; Alerts</strong> in your dashboard. Click "Create Alert" and
              configure the name, metric, condition, threshold, evaluation window (in minutes), cooldown
              period, and notification channels. Alerts can be enabled/disabled at any time.
            </p>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* TEAM MANAGEMENT */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <SectionHeading id="team">Team Management</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Invite team members to your organization so they can access the dashboard, create
              API keys, and manage projects.
            </p>

            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Action</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">How</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Invite a member", "Settings → Team → Invite Member. Enter their email and select a role (admin or member). They receive an email with a link to join."],
                    ["View members", "Settings → Team shows all current members with their role, email, and join date."],
                    ["Remove a member", "Click the remove button next to any member. They lose access immediately."],
                    ["Accept an invite", "The invited person clicks the link in their email, which takes them to /accept-invite where they set up their account and join the organization."],
                  ].map(([action, how]) => (
                    <tr key={action} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-medium text-foreground whitespace-nowrap">{action}</td>
                      <td className="py-2.5 text-muted-foreground">{how}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Callout type="info">
              <strong>Roles:</strong> <IC>admin</IC> members can manage settings, API keys, alerts,
              and team members. <IC>member</IC> role can view the dashboard and create API keys.
            </Callout>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* COST TRACKING */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <SectionHeading id="cost-tracking">Cost Tracking</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Prysm automatically calculates the cost of every request based on the model used
              and the number of tokens consumed. Costs are displayed per-trace in the Request
              Explorer and aggregated in the dashboard overview.
            </p>

            <SubHeading id="supported-models">Built-in Model Pricing</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The following models have built-in pricing (per 1K tokens). Prices reflect
              February 2026 rates and are used as fallbacks when no custom pricing is set.
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Model</th>
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Input (per 1K)</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Output (per 1K)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["gpt-4o", "$0.0025", "$0.01"],
                    ["gpt-4o-mini", "$0.00015", "$0.0006"],
                    ["gpt-4-turbo", "$0.01", "$0.03"],
                    ["gpt-4", "$0.03", "$0.06"],
                    ["gpt-3.5-turbo", "$0.0005", "$0.0015"],
                    ["claude-3-5-sonnet", "$0.003", "$0.015"],
                    ["claude-3-5-haiku", "$0.0008", "$0.004"],
                    ["claude-3-opus", "$0.015", "$0.075"],
                    ["gemini-2.5-pro", "$0.00125", "$0.01"],
                    ["gemini-2.5-flash", "$0.0003", "$0.0025"],
                    ["gemini-2.5-flash-lite", "$0.0001", "$0.0004"],
                    ["gemini-2.0-flash", "$0.0001", "$0.0004"],
                    ["gemini-2.0-flash-lite", "$0.000075", "$0.0003"],
                    ["gemini-3-pro-preview", "$0.002", "$0.012"],
                    ["gemini-3-flash-preview", "$0.0005", "$0.003"],
                  ].map(([model, input, output]) => (
                    <tr key={model} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-mono text-xs text-foreground">{model}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{input}</td>
                      <td className="py-2.5 text-muted-foreground">{output}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SubHeading id="custom-pricing">Custom Model Pricing</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              For open-source models, self-hosted models, or any model not in the built-in list,
              you can set custom pricing in <strong>Settings &rarr; Pricing</strong>. Custom prices
              override the built-in defaults. Use the "Quick Fill" button to populate pricing for
              10 common models instantly.
            </p>

            <SubHeading id="usage-limits">Usage & Limits</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The free tier includes 10,000 requests per month. Usage resets on the first of each
              month. When you hit the limit, the proxy returns a <IC>429 Too Many Requests</IC> response
              with a message indicating the limit has been reached. View your current usage in
              <strong> Settings &rarr; Usage</strong>.
            </p>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* SECURITY */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <SectionHeading id="security">Security</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Prysm AI includes a built-in security layer that scans every LLM request in real time
              before forwarding it to the provider. The security engine detects prompt injection attacks,
              identifies and redacts PII (personally identifiable information), enforces content policies,
              and produces a composite threat score (0&ndash;100) for each request. All security events
              are logged and visible in the <strong>Security Dashboard</strong>.
            </p>

            <Callout type="info">
              Security scanning runs automatically on all proxied requests. No SDK changes are required &mdash;
              your existing integration is already protected. Configure sensitivity and behavior in
              <strong> Settings &rarr; Security</strong> or via the Security Dashboard.
            </Callout>

            <SubHeading id="security-overview">How It Works</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When a request arrives at the Prysm proxy, the security middleware extracts all text
              content (system messages, user messages, assistant messages) and runs three detection
              engines in parallel:
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Engine</th>
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">What It Detects</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-mono text-xs text-primary">Injection Detector</td>
                    <td className="py-2.5 pr-4">Prompt injection attacks (20+ patterns across 7 categories)</td>
                    <td className="py-2.5">Flag or block</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-mono text-xs text-primary">PII Detector</td>
                    <td className="py-2.5 pr-4">Emails, phone numbers, SSNs, credit cards, API keys, IPs, and more</td>
                    <td className="py-2.5">Mask, hash, or block</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-mono text-xs text-primary">Content Policy</td>
                    <td className="py-2.5 pr-4">Hate speech, violence, sexual content, self-harm, illegal activities</td>
                    <td className="py-2.5">Flag or block</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Results from all three engines are combined into a <strong>composite threat score</strong> (0&ndash;100).
              Scores are classified as: <IC>clean</IC> (0&ndash;19), <IC>low</IC> (20&ndash;39),
              <IC>medium</IC> (40&ndash;69), or <IC>high</IC> (70&ndash;100). When blocking is enabled,
              requests with a <IC>high</IC> threat level are rejected with a <IC>403</IC> response before
              reaching the LLM provider.
            </p>

            <SubHeading id="injection-detection">Prompt Injection Detection</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The injection detector scans user and system messages for 20+ attack patterns organized
              into 7 categories. Each detected pattern contributes to the overall threat score based on
              its severity weight.
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Category</th>
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Example Patterns</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Severity</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-medium">Role Manipulation</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">"ignore previous instructions", "you are now DAN"</td>
                    <td className="py-2.5">High (8&ndash;9)</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-medium">Delimiter Injection</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">"---END SYSTEM---", "[INST]", markdown code fences</td>
                    <td className="py-2.5">Medium (6&ndash;7)</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-medium">Context Confusion</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">"the real instructions are", "admin override"</td>
                    <td className="py-2.5">High (7&ndash;8)</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-medium">Encoding Tricks</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">Base64 encoded instructions, hex-encoded payloads</td>
                    <td className="py-2.5">Medium (6&ndash;7)</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-medium">Extraction Attempts</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">"repeat your system prompt", "show your instructions"</td>
                    <td className="py-2.5">High (7&ndash;8)</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-medium">Jailbreak Phrases</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">"DAN mode", "developer mode", "no restrictions"</td>
                    <td className="py-2.5">Critical (9&ndash;10)</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-medium">Multi-language Attacks</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">Language-switching evasion, mixed-script injection</td>
                    <td className="py-2.5">Medium (5&ndash;6)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <SubHeading id="pii-detection">PII Detection & Redaction</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The PII detector identifies 8 types of personally identifiable information in request
              content. When redaction is enabled, PII is transformed before the request reaches the
              LLM provider, ensuring sensitive data never leaves your infrastructure.
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Data Type</th>
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Example</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Detection Method</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-medium">Email Addresses</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">user@example.com</td>
                    <td className="py-2.5">RFC 5322 regex</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-medium">Phone Numbers</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">+1 (555) 123-4567</td>
                    <td className="py-2.5">International format regex</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-medium">Social Security Numbers</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">123-45-6789</td>
                    <td className="py-2.5">US SSN format</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-medium">Credit Card Numbers</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">4111-1111-1111-1111</td>
                    <td className="py-2.5">Luhn algorithm + format</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-medium">API Keys</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">sk-abc123..., AKIA...</td>
                    <td className="py-2.5">Provider prefix patterns</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-medium">IP Addresses</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">192.168.1.1, 2001:db8::1</td>
                    <td className="py-2.5">IPv4 and IPv6 regex</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-medium">Private Keys</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">-----BEGIN RSA PRIVATE KEY-----</td>
                    <td className="py-2.5">PEM header detection</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-medium">Dates of Birth</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">01/15/1990, 1990-01-15</td>
                    <td className="py-2.5">Date format patterns</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <SubHeading id="redaction-modes">Redaction Modes</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Choose how detected PII is handled before the request is forwarded to the LLM provider.
              Configure the redaction mode in <strong>Settings &rarr; Security</strong> or via the
              Security Dashboard configuration tab.
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Mode</th>
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Behavior</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Example Output</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-mono text-xs text-primary">none</td>
                    <td className="py-2.5 pr-4">PII is detected and logged but not modified. Requests pass through unchanged.</td>
                    <td className="py-2.5 font-mono text-xs">user@example.com (unchanged)</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-mono text-xs text-primary">mask</td>
                    <td className="py-2.5 pr-4">PII is replaced with a type-labeled placeholder. The original value is logged in the security event.</td>
                    <td className="py-2.5 font-mono text-xs">[EMAIL_REDACTED]</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-mono text-xs text-primary">hash</td>
                    <td className="py-2.5 pr-4">PII is replaced with a SHA-256 hash. Useful for correlation without exposing raw values.</td>
                    <td className="py-2.5 font-mono text-xs">[EMAIL:a1b2c3d4]</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-mono text-xs text-primary">block</td>
                    <td className="py-2.5 pr-4">The entire request is rejected with a 403 response if any PII is detected.</td>
                    <td className="py-2.5 font-mono text-xs">Request blocked (403)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <SubHeading id="content-policies">Content Policy Enforcement</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Content policies detect harmful or prohibited content in LLM requests. Prysm ships with
              5 default policies covering the most common categories. You can also add custom keywords
              to flag domain-specific content.
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Policy</th>
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Severity</th>
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Default Action</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-medium">Malware Creation</td>
                    <td className="py-2.5 pr-4">10</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">block</td>
                    <td className="py-2.5">Requests for ransomware, trojans, keyloggers, or exploit code</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-medium">Weapon Instructions</td>
                    <td className="py-2.5 pr-4">10</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">block</td>
                    <td className="py-2.5">Requests for explosives, weapons, poisons, or drug manufacturing</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-medium">Illegal Activity</td>
                    <td className="py-2.5 pr-4">9</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">block</td>
                    <td className="py-2.5">Hacking, credential theft, phishing, DDoS attacks</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-medium">Data Exfiltration</td>
                    <td className="py-2.5 pr-4">9</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">flag</td>
                    <td className="py-2.5">Database dumping, credential extraction, authentication bypass</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-medium">Harmful Content</td>
                    <td className="py-2.5 pr-4">10</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">block</td>
                    <td className="py-2.5">Self-harm, suicide methods, torture techniques</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong>Custom keywords:</strong> Add your own keywords via the Security Dashboard
              configuration tab. Custom keywords are matched case-insensitively against the full
              request text and flagged with a severity of 7.
            </p>

            <SubHeading id="off-topic-detection">Off-Topic Detection</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Off-topic detection prevents users from misusing your AI agent for purposes outside its
              intended scope. When enabled, every incoming request is checked against your configured
              description and keywords to determine if it&apos;s relevant to your agent&apos;s purpose.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong className="text-foreground">How it works:</strong> The detector uses a two-tier approach.
              On the <strong>Free tier</strong>, keyword-based matching scores prompts against your configured
              keywords and description terms using weighted relevance scoring. On <strong>paid tiers</strong>,
              an LLM-based semantic analysis provides deeper understanding of whether the request is
              genuinely relevant to your agent&apos;s purpose, catching subtle off-topic requests that
              keyword matching would miss.
            </p>
            <ParamTable
              params={[
                { name: "offTopicDetection", type: "boolean", default: "false", desc: "Enable or disable off-topic detection" },
                { name: "offTopicDescription", type: "string", default: "", desc: "Describe your agent's purpose (e.g., 'Customer support chatbot for an e-commerce platform')" },
                { name: "offTopicKeywords", type: "string", default: "", desc: "Comma-separated keywords relevant to your agent (e.g., 'orders, shipping, returns, products')" },
                { name: "offTopicAction", type: "string", default: "flag", desc: "Action when off-topic detected: flag (log only) or block (reject request)" },
                { name: "offTopicThreshold", type: "number", default: "0.5", desc: "Confidence threshold (0-1). Lower = stricter. Requests scoring below this are flagged/blocked." },
              ]}
            />
            <CodeBlock
              code={`// Configure off-topic detection via tRPC
trpc.security.updateConfig.useMutation({
  offTopicDetection: true,
  offTopicDescription: "Customer support chatbot for an e-commerce platform",
  offTopicKeywords: "orders, shipping, returns, products, refunds, tracking",
  offTopicAction: "flag",    // or "block"
  offTopicThreshold: 0.5,    // 0-1, lower = stricter
});`}
              language="typescript"
              filename="off-topic-config.ts"
            />
            <Callout type="tip">
              <strong>Tip:</strong> Start with <IC>flag</IC> mode and a threshold of <IC>0.5</IC> to
              monitor what gets caught. Review the security events in the dashboard, then tune the
              threshold and switch to <IC>block</IC> once you&apos;re confident in the detection accuracy.
            </Callout>

            <SubHeading id="ner-detection">NER-Based PII Detection</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              On <strong>paid tiers</strong>, Prysm enhances PII detection with LLM-based Named Entity
              Recognition (NER). While the standard regex-based PII detector catches structured patterns
              (emails, SSNs, credit cards), NER catches <strong>unstructured PII</strong> that regex misses &mdash;
              full names in natural language, organization names, physical addresses, medical conditions,
              and financial information embedded in conversational text.
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Entity Type</th>
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Example</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Detection Method</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    ["PERSON", "\"John Smith mentioned in the meeting\"", "LLM NER (paid)"],
                    ["ORGANIZATION", "\"Acme Corp's quarterly report\"", "LLM NER (paid)"],
                    ["LOCATION", "\"Office at 742 Evergreen Terrace\"", "LLM NER (paid)"],
                    ["MEDICAL", "\"Patient diagnosed with diabetes\"", "LLM NER (paid)"],
                    ["FINANCIAL", "\"Account balance of $50,000\"", "LLM NER (paid)"],
                    ["DATE_OF_BIRTH", "\"Born on January 15, 1990\"", "Regex + NER"],
                    ["EMAIL", "\"user@example.com\"", "Regex (all tiers)"],
                    ["SSN", "\"123-45-6789\"", "Regex (all tiers)"],
                  ].map(([type, example, method]) => (
                    <tr key={type} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-mono text-xs text-primary">{type}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs">{example}</td>
                      <td className="py-2.5">{method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              NER detection is enabled via the <IC>outputNerDetection</IC> toggle in the Security Dashboard
              configuration tab. When enabled, NER entities found in LLM outputs are logged alongside
              standard PII findings and contribute to the composite threat score.
            </p>

            <SubHeading id="ml-toxicity">ML-Based Toxicity Scoring</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              On <strong>paid tiers</strong>, Prysm replaces keyword-based content policy checks with
              LLM-powered toxicity analysis that scores content across 6 dimensions. This catches
              nuanced toxic content that keyword matching misses &mdash; sarcasm, coded language,
              context-dependent toxicity, and subtle bias.
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Dimension</th>
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Score Range</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">What It Detects</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    ["toxicity", "0\u20131.0", "Overall toxic intent, hostility, or harmful language"],
                    ["severe_toxicity", "0\u20131.0", "Extreme toxicity: threats, slurs, dehumanization"],
                    ["identity_attack", "0\u20131.0", "Attacks based on race, gender, religion, orientation"],
                    ["insult", "0\u20131.0", "Demeaning, belittling, or disrespectful language"],
                    ["threat", "0\u20131.0", "Explicit or implied threats of violence or harm"],
                    ["sexually_explicit", "0\u20131.0", "Sexual content, innuendo, or explicit material"],
                  ].map(([dim, range, desc]) => (
                    <tr key={dim} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-mono text-xs text-primary">{dim}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs">{range}</td>
                      <td className="py-2.5">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The ML toxicity scorer returns a composite <IC>toxicityScore</IC> (0&ndash;1) along with
              individual dimension scores. Scores above <IC>0.7</IC> are flagged as toxic. The composite
              score is factored into the overall threat assessment. Enable via the <IC>ML Toxicity Scoring</IC> toggle
              in the Security Dashboard configuration tab.
            </p>
            <Callout type="info">
              <strong>Free tier fallback:</strong> On the free tier, content policy enforcement uses
              keyword-based matching (5 default policies + custom keywords). Upgrade to a paid plan
              to unlock 6-dimension ML toxicity analysis with nuanced content understanding.
            </Callout>

            <SubHeading id="threat-scoring">Threat Scoring</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Every request receives a composite threat score from 0 to 100. The score is calculated
              by combining findings from all three detection engines:
            </p>
            <CodeBlock
              code={`// Threat score calculation
injectionScore = sum(pattern.severity * weight) for each detected pattern
piiScore       = count(pii_findings) * 15  // each PII finding adds 15 points
policyScore    = sum(policy.severity * 8)  for each policy violation

threatScore    = min(100, injectionScore + piiScore + policyScore)

// Threat levels
0-19   → "clean"   (no action)
20-39  → "low"     (logged, visible in dashboard)
40-69  → "medium"  (logged, triggers alerts if configured)
70-100 → "high"    (logged, blocked if blocking is enabled)`}
              language="text"
              filename="threat-scoring-algorithm"
            />

            <SubHeading id="security-dashboard">Security Dashboard</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The Security Dashboard (<strong>/security</strong>) provides a real-time view of all
              security events. It includes three tabs:
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Tab</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Contents</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-medium">Overview</td>
                    <td className="py-2.5">Total events, high-severity count, blocked requests, and top threat categories displayed as stat cards</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-medium">Threat Log</td>
                    <td className="py-2.5">Searchable, filterable table of all security events with threat level, score, type, action taken, and timestamp</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-medium">Configuration</td>
                    <td className="py-2.5">Toggle injection detection, PII detection, blocking mode, set redaction mode, and manage custom keywords</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <SubHeading id="security-config">Configuration</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Security settings can be configured per-organization through the Security Dashboard
              configuration tab. The following options are available:
            </p>
            <ParamTable
              params={[
                { name: "injectionDetection", type: "boolean", default: "true", desc: "Enable or disable prompt injection scanning" },
                { name: "piiDetection", type: "boolean", default: "true", desc: "Enable or disable PII detection" },
                { name: "piiRedactionMode", type: "string", default: "none", desc: "How to handle detected PII: none, mask, hash, or block" },
                { name: "blockHighThreats", type: "boolean", default: "false", desc: "Automatically block requests with threat score ≥ 70" },
                { name: "customKeywords", type: "string[]", default: "[]", desc: "Custom keywords to flag in request content" },
                { name: "offTopicDetection", type: "boolean", default: "false", desc: "Enable off-topic request detection (v0.4.0+)" },
                { name: "outputNerDetection", type: "boolean", default: "false", desc: "Enable LLM-based NER for output PII detection (paid tiers, v0.4.0+)" },
                { name: "outputMlToxicity", type: "boolean", default: "false", desc: "Enable 6-dimension ML toxicity scoring (paid tiers, v0.4.0+)" },
              ]}
            />
            <Callout type="tip">
              <strong>Recommended setup:</strong> Start with the defaults (detection on, blocking off) to
              monitor your traffic patterns. Once you&apos;re confident in the detection accuracy, enable
              <IC>blockHighThreats</IC> to automatically reject dangerous requests. Use <IC>mask</IC> redaction
              mode for production workloads that handle customer data.
            </Callout>

            <SubHeading id="security-api">Security API</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Security events are accessible via tRPC procedures for programmatic access:
            </p>
            <CodeBlock
              code={`// Fetch recent security events
const events = trpc.security.getEvents.useQuery({
  limit: 50,
  threatLevel: "high",  // optional filter
});

// Get security stats
const stats = trpc.security.getStats.useQuery();
// Returns: { totalEvents, highSeverity, blocked, topCategories }

// Update security configuration
trpc.security.updateConfig.useMutation({
  injectionDetection: true,
  piiDetection: true,
  piiRedactionMode: "mask",
  blockHighThreats: true,
  customKeywords: ["competitor-name", "internal-project"],
  // v0.4.0+ features
  offTopicDetection: true,
  offTopicDescription: "Customer support chatbot for e-commerce",
  offTopicKeywords: "orders, shipping, returns, products",
  outputNerDetection: true,   // LLM-based NER (paid tiers)
  outputMlToxicity: true,     // 6-dimension toxicity (paid tiers)
});`}
              language="typescript"
              filename="security-api-examples.ts"
            />

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* EXPLAINABILITY */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <SectionHeading id="explainability">Explainability</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Prysm&rsquo;s explainability layer lets you see <strong className="text-foreground">why</strong> your
              model said what it said &mdash; not just what it said. It automatically captures logprobs from
              OpenAI and Google Gemini, estimates confidence for Anthropic Claude, and surfaces hallucination
              risk, decision points, and per-token confidence in the dashboard.
            </p>

            <Callout type="info">
              Explainability works automatically once enabled in <strong>Settings &rarr; Explainability</strong>.
              No SDK changes required &mdash; the proxy handles logprobs injection transparently.
            </Callout>

            <SubHeading id="explainability-providers">Provider Support</SubHeading>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Provider</th>
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Logprobs Source</th>
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Confidence</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Hallucination Detection</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["OpenAI", "Native (logprobs=true, top_logprobs=5)", "Per-token from logprobs", "Consecutive low-confidence segments"],
                    ["Google Gemini", "Native (responseLogprobs via OpenAI-compat)", "Per-token from logprobs", "Consecutive low-confidence segments"],
                    ["Anthropic", "Estimated (heuristic analysis)", "Hedging/uncertainty pattern matching", "Risk score from linguistic markers"],
                  ].map(([provider, source, confidence, hallucination]) => (
                    <tr key={provider} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-medium text-foreground">{provider}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{source}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{confidence}</td>
                      <td className="py-2.5 text-muted-foreground">{hallucination}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SubHeading id="explainability-confidence">Token Confidence Heatmap</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The token confidence heatmap renders each token in the completion with a color
              corresponding to its confidence level. Colors use an OKLCH gradient from
              red (low confidence, &lt;0.3) through amber (medium, 0.3&ndash;0.7) to green
              (high, &gt;0.7). Hover over any token to see:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
              <li><strong className="text-foreground">Confidence score</strong> &mdash; probability the model assigned to this token (0&ndash;1)</li>
              <li><strong className="text-foreground">Entropy</strong> &mdash; uncertainty across the probability distribution (higher = more uncertain)</li>
              <li><strong className="text-foreground">Margin</strong> &mdash; gap between top-1 and top-2 token probabilities (lower = closer alternatives)</li>
              <li><strong className="text-foreground">Top-5 alternatives</strong> &mdash; the other tokens the model considered, with their probabilities</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Click any token to expand a detail panel showing the full alternative distribution
              and the token&rsquo;s position in the completion.
            </p>

            <SubHeading id="explainability-hallucination">Hallucination Detection</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Prysm automatically identifies <strong className="text-foreground">hallucination candidates</strong> &mdash;
              segments of 3 or more consecutive tokens where the model&rsquo;s confidence drops below 0.3.
              These segments are flagged in the trace detail with:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
              <li><strong className="text-foreground">Risk level</strong> &mdash; low, medium, or high based on average confidence</li>
              <li><strong className="text-foreground">Token range</strong> &mdash; exact start/end position in the completion</li>
              <li><strong className="text-foreground">Average confidence</strong> &mdash; mean confidence across the flagged segment</li>
              <li><strong className="text-foreground">Extracted text</strong> &mdash; the actual tokens in the suspicious segment</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mb-4">
              For <strong className="text-foreground">Anthropic</strong>, hallucination risk is estimated from
              linguistic markers (hedging phrases like &ldquo;I think&rdquo;, &ldquo;probably&rdquo;, &ldquo;might be&rdquo;;
              self-corrections like &ldquo;actually&rdquo;, &ldquo;let me reconsider&rdquo;; and uncertainty markers).
              The overall <IC>hallucination_risk_score</IC> (0&ndash;1) is stored in the trace.
            </p>

            <SubHeading id="explainability-why">"Why Did It Say That?"</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Click the <strong className="text-foreground">&ldquo;Why did it say that?&rdquo;</strong> button on any
              trace to generate an LLM-powered explanation of the model&rsquo;s decision-making process.
              The explanation analyzes:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
              <li>The prompt context and how it influenced the completion</li>
              <li>High-entropy decision points where the model chose between alternatives</li>
              <li>Hallucination candidates and why confidence dropped</li>
              <li>Overall confidence patterns and what they reveal about model certainty</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Explanations are cached in the <IC>explainability_reports</IC> table, so subsequent
              views load instantly without re-generating.
            </p>

            <SubHeading id="explainability-decision-points">Decision Points Timeline</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The decision points timeline shows a visual timeline of tokens where the model
              had high entropy (uncertainty). Each point shows the chosen token, its confidence,
              and the top alternatives the model considered. This reveals the critical moments
              where the model&rsquo;s output could have diverged.
            </p>

            <SubHeading id="explainability-comparison">Model Comparison</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Select multiple traces in the Request Explorer to compare models side-by-side.
              The comparison view shows:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4">
              <li><strong className="text-foreground">Overall confidence</strong> &mdash; which model was more certain</li>
              <li><strong className="text-foreground">Hallucination risk</strong> &mdash; which model had more suspicious segments</li>
              <li><strong className="text-foreground">Confidence stability</strong> &mdash; standard deviation of token confidence (lower = more consistent)</li>
              <li><strong className="text-foreground">Total tokens</strong> &mdash; completion length comparison</li>
              <li><strong className="text-foreground">Latency &amp; cost</strong> &mdash; performance and cost metrics</li>
            </ul>

            <SubHeading id="explainability-config">Configuration</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Configure explainability in <strong className="text-foreground">Settings &rarr; Explainability</strong>:
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Setting</th>
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Options</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Explainability", "Enabled / Disabled", "Master toggle for all explainability features"],
                    ["Logprobs injection", "Always / Sample / Never", "When to inject logprobs into requests (OpenAI & Gemini only)"],
                    ["Sample rate", "0% – 100%", "Percentage of requests to analyze when injection mode is 'Sample'"],
                  ].map(([setting, options, desc]) => (
                    <tr key={setting} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-medium text-foreground whitespace-nowrap">{setting}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-primary">{options}</td>
                      <td className="py-2.5 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Callout type="info">
              Logprobs injection adds a small amount of data to each response. For high-volume
              production workloads, use <strong>Sample</strong> mode to analyze a percentage of
              requests without impacting all traffic.
            </Callout>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* CI/CD INTEGRATION */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <SectionHeading id="cicd">CI/CD Integration</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Prysm supports dynamic upstream API keys and custom header forwarding,
              enabling seamless integration with CI/CD pipelines and AI gateway platforms
              like <strong className="text-foreground">GitLab AI Gateway</strong>,
              AWS Bedrock, and Azure OpenAI Service.
            </p>

            <SubHeading id="cicd-dynamic-key">Dynamic Upstream API Key</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Override the stored provider API key at request time by passing the
              <IC>X-Prysm-Upstream-Key</IC> header. This is useful when the API key
              is injected by a CI/CD runner or gateway at runtime rather than stored
              in the Prysm dashboard.
            </p>

            <CodeBlock
              code={`# The upstream key overrides the stored project API key
curl -X POST https://prysmai.io/api/v1/chat/completions \\
  -H "Authorization: Bearer sk-prysm-YOUR_KEY" \\
  -H "X-Prysm-Upstream-Key: glpat-xxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-sonnet-4-20250514",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`}
              language="bash"
              filename="dynamic-key.sh"
            />

            <SubHeading id="cicd-forward-headers">Custom Header Forwarding</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Pass custom headers to the upstream provider via the
              <IC>X-Prysm-Forward-Headers</IC> header (JSON string). These headers
              are merged into the upstream request. <IC>Content-Type</IC> and
              <IC>Authorization</IC> cannot be overridden for security.
            </p>

            <CodeBlock
              code={`# Forward GitLab-specific headers to the upstream provider
curl -X POST https://prysmai.io/api/v1/chat/completions \\
  -H "Authorization: Bearer sk-prysm-YOUR_KEY" \\
  -H "X-Prysm-Upstream-Key: \$AI_GATEWAY_TOKEN" \\
  -H 'X-Prysm-Forward-Headers: {"X-Gitlab-Instance-Id": "ea8bf810-...", "X-Gitlab-Realm": "saas"}' \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "claude-sonnet-4-20250514",
    "messages": [{"role": "user", "content": "Review this code"}]
  }'`}
              language="bash"
              filename="forward-headers.sh"
            />

            <SubHeading id="cicd-python-sdk">Python SDK Integration</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Both <IC>monitor()</IC> and <IC>PrysmClient</IC> accept
              <IC>upstream_api_key</IC> and <IC>forward_headers</IC> parameters
              (available in SDK v0.3.1+).
            </p>

            <CodeBlock
              code={`import os
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

# All calls route through Prysm with the dynamic key
response = monitored.chat.completions.create(
    model="claude-sonnet-4-20250514",
    messages=[{"role": "user", "content": "Hello"}],
)`}
              language="python"
              filename="gitlab_integration.py"
            />

            <SubHeading id="cicd-gitlab">GitLab AI Gateway Example</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              GitLab&apos;s Duo Agent Platform injects AI Gateway tokens into CI/CD jobs.
              Prysm acts as a transparent security and observability layer between your
              agent and the AI Gateway — scanning for prompt injection, PII leakage,
              and policy violations without modifying your agent code.
            </p>

            <CodeBlock
              code={`# .gitlab-ci.yml — GitLab CI job with Prysm observability
code_review_agent:
  stage: review
  image: python:3.12
  variables:
    PRYSM_API_KEY: \$PRYSM_API_KEY
  id_tokens:
    AI_GATEWAY_TOKEN:
      aud: https://gitlab.com
  script:
    - pip install prysmai openai
    - python run_agent.py
  rules:
    - if: \$CI_PIPELINE_SOURCE == "merge_request_event"`}
              language="yaml"
              filename=".gitlab-ci.yml"
            />

            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Header</th>
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Required</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  <tr>
                    <td className="py-2.5 pr-4"><IC>X-Prysm-Upstream-Key</IC></td>
                    <td className="py-2.5 pr-4 text-muted-foreground">Optional</td>
                    <td className="py-2.5 text-muted-foreground">Overrides the stored provider API key for this request</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4"><IC>X-Prysm-Forward-Headers</IC></td>
                    <td className="py-2.5 pr-4 text-muted-foreground">Optional</td>
                    <td className="py-2.5 text-muted-foreground">JSON string of headers to forward to the upstream provider</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <SubHeading id="cicd-github-actions">GitHub Actions with Framework Integrations</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Run your LangGraph, CrewAI, or LlamaIndex tests with Prysm observability in CI.
              Every LLM call during your test suite is captured, security-scanned, and visible
              in your Prysm dashboard &mdash; so you catch prompt injection regressions and
              cost spikes before they hit production.
            </p>

            <CodeBlock
              code={`# .github/workflows/ai-tests.yml
name: AI Agent Tests with Prysm Observability

on:
  pull_request:
    branches: [main]
  push:
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
        run: |
          pip install prysmai[langgraph] pytest
          pip install -r requirements.txt

      - name: Run LangGraph tests with Prysm
        env:
          PRYSM_API_KEY: \${{ secrets.PRYSM_API_KEY }}
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
        run: pytest tests/ -v

  test-crewai:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: |
          pip install prysmai[crewai] pytest
          pip install -r requirements.txt

      - name: Run CrewAI tests with Prysm
        env:
          PRYSM_API_KEY: \${{ secrets.PRYSM_API_KEY }}
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
        run: pytest tests/ -v`}
              language="yaml"
              filename=".github/workflows/ai-tests.yml"
            />

            <p className="text-muted-foreground leading-relaxed mb-4">
              In your test files, initialize the Prysm integration once and pass it to your chains or crews.
              All LLM calls are automatically routed through Prysm for observability and security scanning.
            </p>

            <CodeBlock
              code={`# tests/conftest.py — shared Prysm fixtures for pytest
import pytest
from prysmai.integrations.langgraph import PrysmGraphMonitor
from prysmai.integrations.crewai import PrysmCrewMonitor

@pytest.fixture
def prysm_langgraph():
    monitor = PrysmGraphMonitor(
        metadata={"env": "ci", "run": "github-actions"},
        governance=True
    )
    yield monitor
    monitor.close()

@pytest.fixture
def prysm_crewai():
    monitor = PrysmCrewMonitor(
        metadata={"env": "ci", "run": "github-actions"},
        governance=True
    )
    yield monitor
    monitor.close()

# tests/test_agent.py — use the fixture in your tests
def test_research_graph(prysm_langgraph):
    app = build_research_graph()
    result = app.invoke(
        {"messages": [{"role": "user", "content": "What is SAE analysis?"}]},
        config={"callbacks": [prysm_langgraph.callback_handler()]}
    )
    assert "sparse autoencoder" in result["messages"][-1].content.lower()
    # All calls + governance reports visible in your Prysm dashboard`}
              language="python"
              filename="tests/conftest.py + tests/test_agent.py"
            />

            <Callout type="tip">
              <strong>CI/CD best practice:</strong> Set <IC>PRYSM_API_KEY</IC> as a GitHub Actions
              secret (Settings &rarr; Secrets &rarr; Actions). The SDK reads it from the environment
              automatically &mdash; no code changes needed between local development and CI.
            </Callout>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* ALL ENDPOINTS */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <SectionHeading id="endpoints">All Endpoints</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Complete reference of all proxy endpoints. All endpoints require a valid
              <IC>sk-prysm-*</IC> API key in the <IC>Authorization: Bearer</IC> header.
            </p>

            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Method</th>
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Endpoint</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["POST", "/api/v1/chat/completions", "Chat completions (OpenAI-compatible). Supports streaming."],
                    ["POST", "/api/v1/completions", "Text completions (legacy). Supports streaming."],
                    ["POST", "/api/v1/embeddings", "Generate embeddings for text input."],
                    ["GET", "/api/v1/models", "List all supported models grouped by provider. No auth required."],
                    ["GET", "/api/v1/health", "Health check. Returns status, supported models, and version. No auth required."],
                  ].map(([method, endpoint, desc]) => (
                    <tr key={endpoint} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-mono text-xs text-primary font-medium">{method}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-foreground">{endpoint}</td>
                      <td className="py-2.5 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SubHeading id="websocket-endpoint">WebSocket Live Feed</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Connect to the WebSocket endpoint to receive real-time trace events as they happen.
              The dashboard uses this for the live feed, but you can also connect your own clients.
            </p>
            <CodeBlock
              filename="websocket.js"
              language="javascript"
              code={`const ws = new WebSocket("wss://prysmai.io/ws/live-feed?projectId=YOUR_PROJECT_ID");

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "trace") {
    console.log("New trace:", data.trace);
    // { model, latencyMs, promptTokens, completionTokens, costUsd, status, ... }
  }
};`}
            />

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* RESPONSE HEADERS */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <SectionHeading id="response-headers">Response Headers</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Every response from the Prysm proxy includes headers that expose security scan results
              and rate limit information. These headers let you build client-side logic that reacts
              to scan outcomes without parsing the response body.
            </p>

            <SubHeading id="security-scan-headers">Security Scan Headers</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              These headers are set on every <IC>/chat/completions</IC> response, both streaming and non-streaming.
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Header</th>
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Example</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["X-Prysm-Threat-Score", "0.12", "Input threat score (0.0 \u2013 1.0). Higher = more suspicious."],
                    ["X-Prysm-Threat-Level", "clean | low | medium | high | critical", "Human-readable threat classification for the input."],
                    ["X-Prysm-Scan-Result", "No threats detected", "Summary of the input scan. Shows detected threat types when flagged."],
                    ["X-Prysm-Scan-Tier", "basic | standard | deep", "Which scanning tier was applied (depends on your plan)."],
                    ["X-Prysm-Off-Topic", "true | false", "Whether the input was flagged as off-topic (if off-topic detection is enabled)."],
                    ["X-Prysm-Output-Threat-Score", "0.05", "Output threat score after scanning the model\u2019s response."],
                    ["X-Prysm-Output-Flags", "none | pii,toxicity", "Comma-separated list of output scan flags."],
                    ["X-Prysm-Output-Scan-Result", "clean", "Summary of the output scan result."],
                    ["X-Prysm-Entities-Detected", "PERSON:2,ORG:1", "NER entities found in the output (type:count pairs). Empty if none."],
                    ["X-Prysm-ML-Toxicity-Flags", "none", "ML toxicity dimensions that exceeded threshold (e.g., threat,insult)."],
                    ["X-Prysm-Policy-Violations", "none", "Output policy rules that were violated (e.g., no-competitor-mentions)."],
                  ].map(([header, example, desc]) => (
                    <tr key={header} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-mono text-xs text-primary whitespace-nowrap">{header}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">{example}</td>
                      <td className="py-2.5 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SubHeading id="rate-limit-headers">Rate Limit Headers</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Rate limit headers help you implement client-side backoff and avoid hitting limits.
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Header</th>
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Example</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["X-RateLimit-Limit", "60", "Maximum requests allowed in the current window."],
                    ["X-RateLimit-Remaining", "47", "Requests remaining in the current window."],
                    ["X-RateLimit-Reset", "1709654400", "Unix timestamp when the rate limit window resets."],
                    ["Retry-After", "30", "Seconds to wait before retrying (only present on 429 responses)."],
                  ].map(([header, example, desc]) => (
                    <tr key={header} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-mono text-xs text-primary whitespace-nowrap">{header}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">{example}</td>
                      <td className="py-2.5 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Callout type="tip">
              <strong>Tip:</strong> Use <IC>X-RateLimit-Remaining</IC> to implement proactive throttling in your application.
              When it drops below 10, start adding delays between requests to avoid hitting a 429.
            </Callout>

            <SubHeading id="rest-models">Models Endpoint</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The <IC>GET /api/v1/models</IC> endpoint returns all models supported by the Prysm proxy,
              grouped by provider. No authentication required.
            </p>
            <CodeBlock
              filename="models_endpoint.py"
              code={`import requests

response = requests.get("https://prysmai.io/api/v1/models")
models = response.json()

# Response structure:
# {
#   "object": "list",
#   "data": [
#     {
#       "id": "gpt-4o",
#       "object": "model",
#       "provider": "openai",
#       "category": "flagship"
#     },
#     {
#       "id": "claude-3-5-sonnet-20241022",
#       "object": "model",
#       "provider": "anthropic",
#       "category": "flagship"
#     },
#     ...
#   ]
# }

# List all available model IDs
for model in models["data"]:
    print(f"{model['provider']}: {model['id']} ({model['category']})")`}
            />
            <Callout type="info">
              <strong>Supported providers:</strong> OpenAI (gpt-4o, gpt-4o-mini, gpt-4-turbo, o1, o1-mini, o3-mini),
              Anthropic (claude-3-5-sonnet, claude-3-5-haiku, claude-3-opus), and Google (gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash).
              Use the <IC>/models</IC> endpoint for the authoritative, up-to-date list.
            </Callout>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* ADVANCED FEATURES */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <SectionHeading id="advanced">Advanced Features</SectionHeading>

            <SubHeading id="tool-calling">Tool Calling / Function Calling</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Prysm captures tool calls (function calling) from OpenAI, Anthropic, and Google Gemini models.
              When a model returns tool calls, they're stored in the trace and displayed in the
              Request Explorer detail panel.
            </p>
            <CodeBlock
              filename="tool_calling.py"
              code={`response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "What's the weather in London?"}],
    tools=[{
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get current weather for a city",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string"}
                },
                "required": ["city"]
            }
        }
    }],
)

# Tool calls are captured in the trace automatically
# View them in Dashboard → Request Explorer → click the trace`}
            />

            <SubHeading id="logprobs">Logprobs</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Request logprobs from OpenAI and they'll be captured in the trace. Useful for
              analyzing model confidence and token probabilities.
            </p>
            <CodeBlock
              filename="logprobs.py"
              code={`response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "The capital of France is"}],
    logprobs=True,
    top_logprobs=3,
)

# Logprobs are stored in the trace and visible in the detail panel`}
            />

            <SubHeading id="captured-data">What Gets Captured</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Every request through Prysm is logged with the following data points:
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Field</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Model", "Which model was called (gpt-4o, claude-3-5-sonnet, etc.)"],
                    ["Provider", "The upstream provider (openai, anthropic, google, custom)"],
                    ["Latency", "Total request duration in milliseconds"],
                    ["TTFT", "Time to first token (streaming requests only)"],
                    ["Prompt tokens", "Input token count from the provider response"],
                    ["Completion tokens", "Output token count"],
                    ["Cost", "Calculated cost based on model pricing (USD)"],
                    ["Status", "success, error, or timeout"],
                    ["Request body", "Full messages array, tools, and parameters"],
                    ["Response body", "Complete model response including choices"],
                    ["Tool calls", "Function/tool calls returned by the model (if any)"],
                    ["Logprobs", "Token log probabilities (if requested)"],
                    ["User ID", "From X-Prysm-User-Id header or prysm_context"],
                    ["Session ID", "From X-Prysm-Session-Id header or prysm_context"],
                    ["Custom metadata", "From X-Prysm-Metadata header or prysm_context"],
                    ["Finish reason", "stop, length, tool_calls, or content_filter"],
                  ].map(([field, desc]) => (
                    <tr key={field} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-medium text-foreground whitespace-nowrap">{field}</td>
                      <td className="py-2.5 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* SELF-HOSTED */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <SectionHeading id="self-hosted">Self-Hosted Proxy</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Running the Prysm proxy on your own infrastructure? Point the SDK or your HTTP
              client at your instance:
            </p>
            <CodeBlock
              filename="Python SDK"
              code={`client = PrysmClient(
    prysm_key="sk-prysm-...",
    base_url="http://localhost:3000/api/v1",
).openai()`}
            />
            <CodeBlock
              filename="cURL"
              language="bash"
              code={`curl -X POST http://localhost:3000/api/v1/chat/completions \\
  -H "Authorization: Bearer sk-prysm-your-key" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "Hello!"}]}'`}
            />
            <CodeBlock
              filename="TypeScript"
              language="typescript"
              code={`const client = new OpenAI({
  baseURL: "http://localhost:3000/api/v1",
  apiKey: "sk-prysm-your-key",
});`}
            />

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* EXAMPLE APPLICATIONS */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <SectionHeading id="examples">Example Applications</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Full working applications that demonstrate Prysm AI's capabilities in production-like
              scenarios. Each example includes source code, a walkthrough tutorial, and real
              integration with the SDK, dashboard, and security scanning.
            </p>

            {/* ─── AI Debate Arena ─── */}
            <div className="rounded-lg border border-border overflow-hidden my-6">
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">Full-Stack</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-secondary text-muted-foreground border border-border uppercase tracking-wider">Python + FastAPI</span>
                    </div>
                    <h4 className="text-lg font-semibold mb-1">AI Debate Arena</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      A real-time debate application where GPT-4o Mini and Claude Sonnet 4 argue any topic
                      across 10 rounds — including 4 adversarial attack rounds with prompt injection, jailbreak
                      attempts, context manipulation, and authority spoofing. Every API call is traced through
                      Prysm, every attack is detected and blocked in real time, and every response gets
                      confidence scoring.
                    </p>
                  </div>
                </div>

                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 mt-6">What it demonstrates</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mb-6">
                  {[
                    "Drop-in SDK integration with OpenAI + Anthropic",
                    "Real-time prompt injection detection & blocking",
                    "Multi-provider tracing in a single session",
                    "Live security event streaming via SSE",
                    "Confidence scoring on every response",
                    "Dashboard session filtering & drill-down",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>

                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Quick start</p>
                <CodeBlock
                  filename="terminal"
                  language="bash"
                  code={`git clone https://github.com/osasisorae/debate-arena.git
cd debate-arena
pip install -r requirements.txt

# Set your keys in .env
cp .env.example .env
# PRYSM_API_KEY=sk-prysm-...
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...

python app.py`}
                />

                <div className="flex items-center gap-3 mt-4">
                  <a
                    href="https://github.com/osasisorae/debate-arena"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="outline" className="border-border hover:border-primary/50 text-sm">
                      View on GitHub
                      <ExternalLink className="w-3.5 h-3.5 ml-2" />
                    </Button>
                  </a>
                  <Link href="/blog/building-ai-debate-arena">
                    <Button size="sm" variant="outline" className="border-border hover:border-primary/50 text-sm">
                      Read Tutorial
                      <ArrowRight className="w-3.5 h-3.5 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            <Callout type="tip">
              <strong>Building something with Prysm?</strong> We'd love to feature your project here.
              Reach out at{" "}
              <a href="mailto:osarenrenisaiah@gmail.com" className="text-primary hover:underline">osarenrenisaiah@gmail.com</a>{" "}
              or open a PR on GitHub.
            </Callout>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* ERROR HANDLING */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <SectionHeading id="errors">Error Handling</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The proxy preserves upstream error types. If the LLM provider returns an error,
              you get the same exception you'd get without Prysm. Your existing error handling
              works unchanged.
            </p>
            <CodeBlock
              filename="error_handling.py"
              code={`import openai

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
    print(f"API error: {e}")`}
            />

            <SubHeading id="prysm-errors">Prysm-Specific Errors</SubHeading>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Status</th>
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Error</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Cause</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["401", "Unauthorized", "Invalid or missing sk-prysm-* API key"],
                    ["429", "Too Many Requests", "Free tier usage limit exceeded (10K requests/month)"],
                    ["500", "Internal Server Error", "Proxy encountered an unexpected error (check trace for details)"],
                    ["ValueError", "Client-side", "Invalid Prysm key format — raised at client creation time, before any API calls"],
                  ].map(([status, error, cause]) => (
                    <tr key={status} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-mono text-primary text-xs">{status}</td>
                      <td className="py-2.5 pr-4 font-medium text-foreground">{error}</td>
                      <td className="py-2.5 text-muted-foreground">{cause}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ─── COMMON MISTAKES ─── */}
            <SubHeading id="common-mistakes">Common Mistakes</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              These are the most frequent issues new users run into. Check here first if something isn&apos;t working.
            </p>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Symptom</th>
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Cause</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Fix</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [
                      "401 AuthenticationError: Incorrect API key",
                      "Provider key entered in the wrong provider field (e.g., Anthropic key in OpenAI field)",
                      "Go to Settings \u2192 Provider. Verify each key matches its provider: sk-... for OpenAI, sk-ant-... for Anthropic, AIza... for Google."
                    ],
                    [
                      "401 AuthenticationError: Invalid Prysm key",
                      "Using a raw provider key instead of your Prysm key in code",
                      "Replace the API key in your code with your Prysm key (sk-prysm-...). Provider keys go in the dashboard, not in your code."
                    ],
                    [
                      "Model not found or routing error",
                      "Provider not configured for the model you\u2019re calling",
                      "If using claude-* models, make sure you\u2019ve added your Anthropic key in Settings \u2192 Provider. Same for Gemini models and Google keys."
                    ],
                    [
                      "Requests work but no traces in dashboard",
                      "Hitting the LLM provider directly instead of through Prysm",
                      "Make sure your base_url is set to prysmai.io/api/v1 (or your self-hosted proxy URL), not the provider\u2019s URL."
                    ],
                  ].map(([symptom, cause, fix]) => (
                    <tr key={symptom} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-mono text-xs text-primary align-top">{symptom}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground align-top">{cause}</td>
                      <td className="py-2.5 text-muted-foreground align-top">{fix}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* CHANGELOG */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <SectionHeading id="changelog">Changelog</SectionHeading>

            <div className="space-y-8">
              {/* v0.5.0 */}
              <div className="border border-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/30">v0.5.0</span>
                  <span className="text-sm text-muted-foreground">March 8, 2026</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/30">LATEST</span>
                </div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Governance Layer & LangGraph Integration</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p><span className="text-primary font-mono text-xs">NEW</span> <IC>GovernanceSession</IC> &mdash; context manager for monitoring agent sessions with behavioral detection, code scanning, and policy enforcement via MCP.</p>
                  <p><span className="text-primary font-mono text-xs">NEW</span> Early Stopping detector &mdash; catches agents that quit before completing their stated task (unfollowed intents, incomplete tool sequences).</p>
                  <p><span className="text-primary font-mono text-xs">NEW</span> Tool Undertriggering detector &mdash; identifies when agents have tools available but fail to use them when the task requires it.</p>
                  <p><span className="text-primary font-mono text-xs">NEW</span> Code Security Scanner &mdash; scans agent-generated code for injection flaws, hardcoded secrets, unsafe deserialization, and more.</p>
                  <p><span className="text-primary font-mono text-xs">NEW</span> MCP endpoint at <IC>/api/mcp</IC> &mdash; Streamable HTTP transport with JSON-RPC 2.0 for direct agent integration (Claude Code, Cursor, etc.).</p>
                  <p><span className="text-primary font-mono text-xs">NEW</span> <IC>PrysmGraphMonitor</IC> &mdash; LangGraph integration replacing LangChain, with graph-aware telemetry (node tracking, state transitions, conditional routing).</p>
                  <p><span className="text-primary font-mono text-xs">NEW</span> <IC>governance=True</IC> flag on LangGraph and CrewAI integrations for automatic behavioral detection during agent runs.</p>
                  <p><span className="text-primary font-mono text-xs">NEW</span> Session Explorer, Governance Dashboard, and Policy Manager views in the web dashboard.</p>
                  <p><span className="text-red-400 font-mono text-xs">BREAKING</span> Removed <IC>PrysmCallbackHandler</IC> (LangChain). Use <IC>PrysmGraphMonitor</IC> (LangGraph) instead. Install with <IC>pip install prysmai[langgraph]</IC>.</p>
                </div>
              </div>

              {/* v0.4.1 */}
              <div className="border border-border/50 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-muted-foreground border border-border">v0.4.1</span>
                  <span className="text-sm text-muted-foreground">March 5, 2026</span>
                </div>
                <h4 className="text-sm font-semibold text-foreground mb-3">SDK Bug Fixes & Platform Hardening</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p><span className="text-red-400 font-mono text-xs">BUG-001</span> Fixed <IC>PrysmCallbackHandler.on_chain_start</IC> crashing with <IC>AttributeError</IC> when LangChain passes <IC>serialized=None</IC> (e.g., <IC>RunnableSequence</IC> chains). Added null guards to all callback methods.</p>
                  <p><span className="text-red-400 font-mono text-xs">BUG-002</span> Added per-request rate limiting to the proxy with <IC>X-RateLimit-Limit</IC>, <IC>X-RateLimit-Remaining</IC>, <IC>X-RateLimit-Reset</IC>, and <IC>Retry-After</IC> headers. Sequential load no longer causes connection errors.</p>
                  <p><span className="text-red-400 font-mono text-xs">BUG-003</span> Fixed <IC>PrysmCrewMonitor</IC> crashing when CrewAI agents delegate work and <IC>gpt-4o-mini</IC> produces malformed <IC>DelegateWorkToolSchema</IC> arguments. Delegation events are now captured gracefully.</p>
                  <p><span className="text-primary font-mono text-xs">NEW</span> <IC>GET /api/v1/models</IC> endpoint — returns all supported models grouped by provider.</p>
                  <p><span className="text-primary font-mono text-xs">NEW</span> Response headers for security scan results: <IC>X-Prysm-Scan-Result</IC>, <IC>X-Prysm-Entities-Detected</IC>, <IC>X-Prysm-ML-Toxicity-Flags</IC>, <IC>X-Prysm-Policy-Violations</IC>, <IC>X-Prysm-Scan-Tier</IC>, <IC>X-Prysm-Off-Topic</IC>.</p>
                  <p><span className="text-primary font-mono text-xs">NEW</span> Non-streaming responses now use full async output scanning (ML toxicity + NER + policy engine), matching streaming behavior.</p>
                  <p><span className="text-primary font-mono text-xs">NEW</span> PagerDuty alert channel support via Events API v2 with automatic incident creation and dedup.</p>
                </div>
              </div>

              {/* v0.4.0 */}
              <div className="border border-border/50 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-muted-foreground border border-border">v0.4.0</span>
                  <span className="text-sm text-muted-foreground">February 2026</span>
                </div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Security Suite & Framework Integrations</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p><span className="text-primary font-mono text-xs">NEW</span> Off-topic detection — keyword blocklist + LLM-powered semantic analysis with configurable thresholds.</p>
                  <p><span className="text-primary font-mono text-xs">NEW</span> ML toxicity scoring — 6-dimension analysis (toxicity, severe toxicity, identity attack, insult, profanity, threat) with weighted scoring.</p>
                  <p><span className="text-primary font-mono text-xs">NEW</span> NER-based PII detection — 7 entity types (PERSON, ORG, LOCATION, EMAIL, PHONE, SSN, CREDIT_CARD) with risk-weighted scoring.</p>
                  <p><span className="text-primary font-mono text-xs">NEW</span> Output policy engine — keyword blocklist, regex pattern matching, and LLM-judged semantic rules.</p>
                  <p><span className="text-primary font-mono text-xs">NEW</span> Tiered scanning — Basic (keyword only), Standard (+ ML toxicity), Deep (+ NER + output policies) based on plan.</p>
                  <p><span className="text-primary font-mono text-xs">NEW</span> Alert channels — Email, Slack, Discord, and custom webhook notifications with configurable thresholds.</p>
                  <p><span className="text-primary font-mono text-xs">NEW</span> Framework integrations — <IC>PrysmCrewMonitor</IC> (CrewAI), <IC>PrysmSpanHandler</IC> (LlamaIndex). LangChain support was replaced by LangGraph in v0.5.0.</p>
                  <p><span className="text-primary font-mono text-xs">NEW</span> Anthropic translation layer — use Claude models through the OpenAI-compatible proxy endpoint.</p>
                  <p><span className="text-primary font-mono text-xs">NEW</span> Confidence analysis, recommendations engine, and explainability suite in the dashboard.</p>
                </div>
              </div>
            </div>

            {/* ─── CTA ─── */}
            <div className="mt-20 mb-8 p-8 rounded-lg border border-border bg-secondary/20 text-center">
              <h3 className="text-xl font-bold mb-2">Ready to see inside your AI?</h3>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                Get your API key and start capturing traces in under 5 minutes.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => setEarlyAccessOpen(true)}
                >
                  Get Early Access
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <a
                  href="https://github.com/osasisorae/prysmai-python"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" className="border-border hover:border-primary/50">
                    View on GitHub
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DocsFooter />

      {/* Early Access Modal */}
      <EarlyAccessModal open={earlyAccessOpen} onOpenChange={setEarlyAccessOpen} />
    </div>
  );
}
