/**
 * Docs — SDK documentation with installation, quick start, API reference
 * Design: Matches V5 landing page (Inter, 2-color, generous whitespace)
 * Layout: Sidebar navigation + content area
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

/* ─── Sidebar Navigation ─── */
const NAV_SECTIONS = [
  { id: "installation", label: "Installation", icon: Terminal },
  { id: "quick-start", label: "Quick Start", icon: Zap },
  { id: "how-it-works", label: "How It Works", icon: Layers },
  { id: "api-reference", label: "API Reference", icon: Code2 },
  { id: "context", label: "Context & Metadata", icon: Settings },
  { id: "streaming", label: "Streaming", icon: ArrowRight },
  { id: "async", label: "Async Support", icon: Zap },
  { id: "self-hosted", label: "Self-Hosted Proxy", icon: Shield },
  { id: "captured-data", label: "What Gets Captured", icon: BookOpen },
  { id: "errors", label: "Error Handling", icon: Shield },
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
            href="https://github.com/osasisorae/prysmai/tree/main/sdk"
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
  const [activeSection, setActiveSection] = useState("installation");
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
            Prysm AI SDK
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            One line of code to see inside your AI. Install the Python SDK, wrap your
            OpenAI client, and get full observability — latency, tokens, cost, and
            complete request/response capture.
          </p>
          <div className="flex items-center gap-3 mt-6">
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
                v0.1.1 on PyPI <ExternalLink className="w-3 h-3" />
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
            {/* ─── Installation ─── */}
            <SectionHeading id="installation">Installation</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Install the Prysm AI SDK from PyPI. Requires Python 3.9 or higher.
            </p>
            <CodeBlock
              code="pip install prysmai"
              language="bash"
              filename="Terminal"
            />
            <p className="text-muted-foreground leading-relaxed">
              The SDK depends on <IC>openai</IC> (v1.0+) and <IC>httpx</IC> (v0.24+).
              Both are installed automatically.
            </p>

            {/* ─── Quick Start ─── */}
            <SectionHeading id="quick-start">Quick Start</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Wrap your existing OpenAI client with <IC>monitor()</IC> — that's the
              entire integration. Your code stays exactly the same. The only difference
              is that every API call now flows through the Prysm proxy, which captures
              metrics and logs the full request/response.
            </p>
            <CodeBlock
              filename="app.py"
              code={`import openai
from prysmai import monitor

# Your existing OpenAI client
client = openai.OpenAI(api_key="sk-...")

# Wrap it with Prysm — one line
monitored = monitor(client, prysm_key="sk-prysm-...")

# Every call is now tracked
response = monitored.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Explain quantum computing"}],
)

print(response.choices[0].message.content)`}
            />
            <p className="text-muted-foreground leading-relaxed">
              After running this, open your Prysm dashboard. You'll see the request
              with full metrics: latency, token counts, cost, model, and the complete
              prompt/response.
            </p>

            <div className="mt-6 p-4 rounded-lg border border-primary/20 bg-primary/5">
              <p className="text-sm text-foreground">
                <strong>Environment variable alternative:</strong> Set{" "}
                <IC>PRYSM_API_KEY</IC> in your environment and you can skip the{" "}
                <IC>prysm_key</IC> parameter entirely.
              </p>
              <CodeBlock
                code={`export PRYSM_API_KEY="sk-prysm-your-key-here"

# Now just:
monitored = monitor(client)  # reads from env`}
                language="bash"
              />
            </div>

            {/* ─── How It Works ─── */}
            <SectionHeading id="how-it-works">How It Works</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The SDK creates a new OpenAI client that points at the Prysm proxy
              instead of the OpenAI API directly. Your application code stays exactly
              the same — the only difference is the client instance.
            </p>
            <div className="my-6 p-6 rounded-lg bg-secondary/30 border border-border font-mono text-sm leading-loose text-center">
              <span className="text-foreground">Your App</span>
              <span className="text-muted-foreground mx-3">→</span>
              <span className="text-primary font-semibold">Prysm Proxy</span>
              <span className="text-muted-foreground mx-3">→</span>
              <span className="text-foreground">OpenAI API</span>
              <br />
              <span className="text-muted-foreground text-xs mt-2 inline-block">
                ↓ metrics stored (latency, tokens, cost, errors)
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              The proxy authenticates the request using your <IC>sk-prysm-*</IC> API
              key, forwards it to OpenAI using your project's stored provider
              credentials, captures the full request/response with timing and token
              counts, and returns the response to your application unchanged.
            </p>

            {/* ─── API Reference ─── */}
            <SectionHeading id="api-reference">API Reference</SectionHeading>

            <SubHeading id="monitor-fn">
              <IC>monitor(client, prysm_key, base_url, timeout)</IC>
            </SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-2">
              The primary entry point. Takes an existing OpenAI client and returns a
              new one routed through Prysm. Preserves the client type — sync in, sync
              out; async in, async out.
            </p>
            <ParamTable
              params={[
                {
                  name: "client",
                  type: "OpenAI | AsyncOpenAI",
                  default: "required",
                  desc: "Your existing OpenAI client instance",
                },
                {
                  name: "prysm_key",
                  type: "str",
                  default: "PRYSM_API_KEY env",
                  desc: "Your Prysm API key (sk-prysm-...)",
                },
                {
                  name: "base_url",
                  type: "str",
                  default: "proxy.prysmai.io/v1",
                  desc: "Prysm proxy URL",
                },
                {
                  name: "timeout",
                  type: "float",
                  default: "120.0",
                  desc: "Request timeout in seconds",
                },
              ]}
            />
            <CodeBlock
              code={`# Sync
monitored = monitor(openai.OpenAI(api_key="sk-..."), prysm_key="sk-prysm-...")

# Async
monitored = monitor(openai.AsyncOpenAI(api_key="sk-..."), prysm_key="sk-prysm-...")`}
            />

            <SubHeading id="prysm-client">
              <IC>PrysmClient(prysm_key, base_url, timeout)</IC>
            </SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-2">
              Lower-level client for more control. Create sync or async OpenAI clients
              directly.
            </p>
            <ParamTable
              params={[
                {
                  name: "prysm_key",
                  type: "str",
                  default: "PRYSM_API_KEY env",
                  desc: "Your Prysm API key (sk-prysm-...)",
                },
                {
                  name: "base_url",
                  type: "str",
                  default: "proxy.prysmai.io/v1",
                  desc: "Prysm proxy URL",
                },
                {
                  name: "timeout",
                  type: "float",
                  default: "120.0",
                  desc: "Request timeout in seconds",
                },
              ]}
            />
            <CodeBlock
              code={`from prysmai import PrysmClient

prysm = PrysmClient(prysm_key="sk-prysm-...")

# Create sync client
client = prysm.openai()

# Create async client
async_client = prysm.async_openai()

# Use like any OpenAI client
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello!"}],
)`}
            />

            {/* ─── Context & Metadata ─── */}
            <SectionHeading id="context">Context &amp; Metadata</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Attach metadata to every request for filtering and grouping in your
              dashboard. Tag requests with user IDs, session IDs, or any custom
              key-value pairs.
            </p>

            <SubHeading id="global-context">Global Context</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-2">
              Set metadata that applies to all subsequent requests:
            </p>
            <CodeBlock
              code={`from prysmai import prysm_context

# Set globally — all requests will include these
prysm_context.set(
    user_id="user_123",
    session_id="sess_abc",
    metadata={"env": "production", "version": "1.2.0"}
)`}
            />

            <SubHeading id="scoped-context">Scoped Context</SubHeading>
            <p className="text-muted-foreground leading-relaxed mb-2">
              Use a context manager for request-specific metadata that reverts
              automatically:
            </p>
            <CodeBlock
              code={`from prysmai import prysm_context

prysm_context.set(user_id="default_user")

# Scoped — only applies within the block
with prysm_context(user_id="user_456", metadata={"feature": "chat"}):
    response = monitored.chat.completions.create(...)
    # Tagged with user_456

# Back to default_user outside the block`}
            />

            <SubHeading id="context-methods">Context Methods</SubHeading>
            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 pr-4 text-muted-foreground font-medium">Method</th>
                    <th className="text-left py-2.5 text-muted-foreground font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-mono text-primary text-xs">prysm_context.set()</td>
                    <td className="py-2.5 text-muted-foreground">Set global context for all subsequent requests</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-mono text-primary text-xs">prysm_context.get()</td>
                    <td className="py-2.5 text-muted-foreground">Get the current context object</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-mono text-primary text-xs">prysm_context.clear()</td>
                    <td className="py-2.5 text-muted-foreground">Reset context to defaults</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-mono text-primary text-xs">prysm_context(...)</td>
                    <td className="py-2.5 text-muted-foreground">Use as context manager for scoped metadata</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ─── Streaming ─── */}
            <SectionHeading id="streaming">Streaming</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Streaming works exactly as you'd expect — no changes needed. The proxy
              captures Time to First Token (TTFT), total latency, and the full
              streamed content.
            </p>
            <CodeBlock
              filename="streaming.py"
              code={`stream = monitored.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Write a haiku about AI"}],
    stream=True,
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")`}
            />

            {/* ─── Async ─── */}
            <SectionHeading id="async">Async Support</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Full async support with the same API. Pass an <IC>AsyncOpenAI</IC> client
              to <IC>monitor()</IC> and you get an async client back.
            </p>
            <CodeBlock
              filename="async_example.py"
              code={`import asyncio
import openai
from prysmai import monitor

async def main():
    client = openai.AsyncOpenAI(api_key="sk-...")
    monitored = monitor(client, prysm_key="sk-prysm-...")

    response = await monitored.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "Hello async!"}],
    )
    print(response.choices[0].message.content)

asyncio.run(main())`}
            />

            {/* ─── Self-Hosted ─── */}
            <SectionHeading id="self-hosted">Self-Hosted Proxy</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Running the Prysm proxy on your own infrastructure? Point the SDK at
              your instance:
            </p>
            <CodeBlock
              code={`monitored = monitor(
    client,
    prysm_key="sk-prysm-...",
    base_url="http://localhost:3000/v1",  # Your self-hosted proxy
)`}
            />

            {/* ─── What Gets Captured ─── */}
            <SectionHeading id="captured-data">What Gets Captured</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Every request through the SDK is logged with the following data points,
              visible in your Prysm dashboard:
            </p>
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
                    ["Model", "Which model was called (gpt-4o, gpt-4o-mini, etc.)"],
                    ["Latency", "Total request duration in milliseconds"],
                    ["TTFT", "Time to first token (streaming requests)"],
                    ["Prompt tokens", "Input token count"],
                    ["Completion tokens", "Output token count"],
                    ["Cost", "Calculated cost based on model pricing"],
                    ["Status", "Success, error, or timeout"],
                    ["Request body", "Full messages array and parameters"],
                    ["Response body", "Complete model response"],
                    ["User ID", "From prysm_context (if set)"],
                    ["Session ID", "From prysm_context (if set)"],
                    ["Custom metadata", "Any key-value pairs from prysm_context"],
                  ].map(([metric, desc]) => (
                    <tr key={metric} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 font-medium text-foreground">{metric}</td>
                      <td className="py-2.5 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ─── Error Handling ─── */}
            <SectionHeading id="errors">Error Handling</SectionHeading>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The SDK preserves OpenAI's error types. If the upstream API returns an
              error, you get the same exception you'd get without Prysm. Your existing
              error handling works unchanged.
            </p>
            <CodeBlock
              filename="error_handling.py"
              code={`try:
    response = monitored.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "test"}],
    )
except openai.AuthenticationError:
    print("Invalid API key")
except openai.RateLimitError:
    print("Rate limited")
except openai.APIError as e:
    print(f"API error: {e}")`}
            />
            <p className="text-muted-foreground leading-relaxed">
              Prysm-specific errors (invalid Prysm key format, missing key) raise a
              standard <IC>ValueError</IC> at client creation time — before any API
              calls are made.
            </p>

            {/* ─── CTA ─── */}
            <div className="mt-20 mb-8 p-8 rounded-lg border border-border bg-secondary/20 text-center">
              <h3 className="text-xl font-bold mb-2">Ready to see inside your AI?</h3>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                Get your API key and start capturing traces in under 2 minutes.
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
                  href="https://github.com/osasisorae/prysmai/tree/main/sdk"
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
