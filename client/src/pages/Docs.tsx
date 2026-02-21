/**
 * Docs — Full platform documentation for Prysm AI Layer 1
 * Design: Matches V5 landing page (Inter, 2-color, generous whitespace)
 * Layout: Sidebar navigation + content area
 * Sections: Overview, Getting Started, Python SDK, REST API, Providers,
 *           Dashboard, API Keys, Alerts, Team, Cost Tracking,
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
  { id: "rest-api", label: "REST API", icon: Globe },
  { id: "providers", label: "Providers", icon: Layers },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "team", label: "Team Management", icon: Users },
  { id: "cost-tracking", label: "Cost Tracking", icon: DollarSign },
  { id: "endpoints", label: "All Endpoints", icon: Blocks },
  { id: "advanced", label: "Advanced Features", icon: Wrench },
  { id: "self-hosted", label: "Self-Hosted Proxy", icon: Shield },
  { id: "errors", label: "Error Handling", icon: Activity },
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
                v0.1.3 on PyPI <ExternalLink className="w-3 h-3" />
              </span>
            </a>
          </div>
        </div>
      </section>

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
              Prysm AI is an observability proxy for LLM applications. It sits between your application
              and your LLM provider, capturing every request and response with full metrics — latency,
              token counts, cost, errors, and the complete prompt/completion data.
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
                &darr; traces, metrics, cost, latency, alerts &mdash; all captured automatically
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

            <SubHeading id="step-3">3. Generate an API Key</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Go to the <strong>API Keys</strong> page in your dashboard and create a new key.
              You'll get a key starting with <IC>sk-prysm-</IC>. Copy it immediately — the full
              key is only shown once.
            </p>

            <SubHeading id="step-4">4. Send Your First Request</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Install the Python SDK and make a request. Your OpenAI credentials are already
              stored in your project — you only need your Prysm key.
            </p>
            <CodeBlock
              filename="Terminal"
              language="bash"
              code="pip install prysmai"
            />
            <CodeBlock
              filename="app.py"
              code={`from prysmai import PrysmClient

client = PrysmClient(prysm_key="sk-prysm-...").openai()

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Explain quantum computing"}],
)

print(response.choices[0].message.content)`}
            />
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
              Prysm supports multiple LLM providers. Configure your provider during project setup
              in the onboarding wizard, or update it anytime in <strong>Settings &rarr; Configuration</strong>.
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
                    ["GET", "/api/v1/health", "Health check. Returns { status: 'ok' }. No auth required."],
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
