/*
 * PRYSM AI LANDING PAGE — V7 (Copy Document V1.0)
 * Design: Clean dark theme, generous whitespace, 2-color palette (cyan + neutral)
 * Flow: Hero → Providers → Problem → Solution → Features → Integration → Who It's For → Vision → Pricing Teaser → Final CTA → Research → Footer
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Eye,
  Sparkles,
  Scale,
  ArrowRight,
  Code,
  Terminal,
  User,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { StackLogo, ResearchLogo } from "@/components/BrandLogos";
import { EarlyAccessModal } from "@/components/EarlyAccessModal";

const LOGO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663306080277/pKkWElgCpRmlNvjQ.png";

export default function Home() {
  let { user, loading, error, isAuthenticated, logout } = useAuth();
  const [earlyAccessOpen, setEarlyAccessOpen] = useState(false);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ========== NAVBAR ========== */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur-xl bg-background/80">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <img src={LOGO_URL} alt="Prysm AI" className="w-8 h-8" />
            <span className="text-lg font-semibold tracking-tight">
              Prysm<span className="text-primary">AI</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#problem" className="hover:text-foreground transition-colors">Why Prysmai</a>
            <a href="#features" className="hover:text-foreground transition-colors">Product</a>
            <a href="/pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="/docs" className="hover:text-foreground transition-colors">Docs</a>
            <a href="/blog" className="hover:text-foreground transition-colors">Blog</a>
          </div>
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setEarlyAccessOpen(true)}
          >
            Get Started Free
          </Button>
        </div>
      </nav>

      {/* ========== HERO ========== */}
      <section className="pt-32 pb-24 lg:pt-44 lg:pb-36">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-8">
              You're shipping AI.{" "}
              <span className="text-primary">Do you know what it's doing?</span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mb-12">
              Prysmai sits between your application and your AI provider. It watches every
              request and response, catches security threats in real time, tracks your costs
              to the cent, and tells you exactly when your AI is guessing versus when it's
              confident. One line of code to get started.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                onClick={() => setEarlyAccessOpen(true)}
              >
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                className="h-12 px-8 border-border hover:border-primary/40 hover:bg-primary/5"
                onClick={() => scrollTo("how-it-works")}
              >
                See How It Works
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ========== PROVIDER TRUST STRIP ========== */}
      <section className="py-16 border-y border-border/30">
        <div className="container">
          <p className="text-center text-xs font-medium tracking-widest uppercase text-muted-foreground mb-10">
            Works with OpenAI · Anthropic · Google Gemini · vLLM · Ollama · Any OpenAI-compatible endpoint
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-50">
            {["OpenAI", "Anthropic", "LangGraph", "CrewAI", "Agent Framework", "Meta / Llama", "Hugging Face"].map((name) => (
              <StackLogo key={name} name={name} />
            ))}
          </div>
        </div>
      </section>

      {/* ========== PROBLEM SECTION ========== */}
      <section id="problem" className="py-28 lg:py-40">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-8">
              Right now, your AI application is a{" "}
              <span className="text-primary">black box.</span>
            </h2>

            <p className="text-lg text-muted-foreground leading-relaxed mb-20 max-w-3xl">
              You built something great. You integrated an LLM. It works. Users are using it.
              But here's what you don't know:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {[
                {
                  title: "Visibility",
                  desc: "You don't know what prompts are actually being sent to the AI. You don't know what it's responding with. If something goes wrong, you have no record of what happened.",
                },
                {
                  title: "Security",
                  desc: "You don't know if users are trying to manipulate your AI. Prompt injection — where an attacker embeds hidden instructions to hijack the AI's behavior — is the number one AI exploit right now. You'd have no idea if it happened to you.",
                },
                {
                  title: "Cost",
                  desc: "You get a monthly bill from your AI provider. But you don't know which features are expensive, which users are consuming the most, or where you're wasting money. You can't optimize what you can't see.",
                },
                {
                  title: "Quality",
                  desc: "You don't know when your AI is confident and when it's guessing. Hallucinations — where the AI makes up information and presents it as fact — are invisible without the right tooling.",
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-6">
                  <div className="w-1 shrink-0 rounded-full bg-primary/30" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-lg text-muted-foreground leading-relaxed mt-16 text-center max-w-2xl mx-auto">
              This is what it looks like to run an AI application without Prysmai.
              And it's how most teams are operating today.
            </p>
          </div>
        </div>
      </section>

      {/* ========== SOLUTION SECTION ========== */}
      <section id="how-it-works" className="py-28 lg:py-40 border-y border-border/30">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-8">
              Prysmai gives you{" "}
              <span className="text-primary">eyes inside your AI.</span>
            </h2>

            <p className="text-lg text-muted-foreground leading-relaxed mb-12 max-w-3xl">
              Here's how it works. You point your application at Prysmai instead of pointing
              it directly at OpenAI. That's it. One configuration change. No code rewrites.
              No new abstractions.
            </p>

            <p className="text-muted-foreground leading-relaxed mb-16 max-w-3xl">
              From that moment on, every message going to your AI and every response coming
              back flows through Prysmai. We capture it, analyze it, and surface it in a
              dashboard that shows you exactly what your AI is doing — in real time.
            </p>

            {/* Flow diagram */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-8 md:p-12 mb-8">
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 text-sm font-medium">
                <div className="px-6 py-3 rounded-lg border border-border bg-background">Your App</div>
                <span className="text-primary text-lg">→</span>
                <div className="px-6 py-3 rounded-lg border border-primary/40 bg-primary/10 text-primary">Prysmai</div>
                <span className="text-primary text-lg">→</span>
                <div className="px-6 py-3 rounded-lg border border-border bg-background">AI Provider</div>
              </div>
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 text-sm font-medium mt-4">
                <div className="px-6 py-3 rounded-lg border border-border bg-background">Your App</div>
                <span className="text-primary text-lg">←</span>
                <div className="px-6 py-3 rounded-lg border border-primary/40 bg-primary/10 text-primary">Prysmai</div>
                <span className="text-primary text-lg">←</span>
                <div className="px-6 py-3 rounded-lg border border-border bg-background">AI Provider</div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center italic">
              Prysmai intercepts every request and response. Your app and your AI provider
              don't notice a thing. But you now have complete visibility.
            </p>
          </div>
        </div>
      </section>

      {/* ========== FEATURES — FOUR CAPABILITIES ========== */}
      <section id="features" className="py-28 lg:py-40">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-20 text-center">
              Four things Prysmai does that{" "}
              <span className="text-primary">nothing else does together.</span>
            </h2>

            {/* Capability 1: Security */}
            <div className="mb-24">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-6 h-6 text-primary" />
                <p className="text-xs font-medium tracking-widest uppercase text-primary">Security</p>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">
                It catches threats before they reach your AI.
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6 max-w-3xl">
                Every request that flows through Prysmai gets scanned for security threats in
                real time. We detect prompt injection attacks — the attempts by malicious users
                to embed hidden instructions that hijack your AI's behavior. We scan for
                personally identifiable information like email addresses, phone numbers, credit
                card numbers, and social security numbers, and we can automatically redact that
                data before it ever reaches your AI provider.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-8 max-w-3xl">
                We score every request on a threat scale from 0 to 100. Clean. Low. Medium. High.
                When a request crosses your threshold, we block it, flag it, or alert your team —
                whatever you configure.
              </p>
              <p className="text-sm text-primary font-medium">
                20+ injection patterns detected · 7 attack categories · 8 PII data types
              </p>
            </div>

            {/* Capability 2: Observability */}
            <div className="mb-24">
              <div className="flex items-center gap-3 mb-6">
                <Eye className="w-6 h-6 text-primary" />
                <p className="text-xs font-medium tracking-widest uppercase text-primary">Observability</p>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">
                It shows you everything that's happening, in real time.
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6 max-w-3xl">
                The Prysmai dashboard is a live view of your AI application. You can see every
                request as it happens. You can see your cost accumulating in real time. You can
                see latency distribution, error rates, token usage, and model performance — all
                in one place.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6 max-w-3xl">
                You can drill into any individual request and see the full prompt, the full
                response, and every piece of metadata. You can search and filter by user, by
                model, by feature, by date range, by cost, by latency. If something goes wrong,
                you find it in seconds.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-8 max-w-3xl">
                We also measure time-to-first-token — how long it takes for the first word of
                the response to appear. This is the metric that determines whether your users
                perceive your application as fast or slow.
              </p>
              <p className="text-sm text-primary font-medium">
                Real-time dashboard · Cost tracking per request · Latency down to the millisecond
              </p>
            </div>

            {/* Capability 3: Explainability */}
            <div className="mb-24">
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="w-6 h-6 text-primary" />
                <p className="text-xs font-medium tracking-widest uppercase text-primary">Explainability</p>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">
                It tells you when your AI is confident and when it's guessing.
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6 max-w-3xl">
                When an AI generates a response, it assigns a probability to every word it
                chooses. Prysmai captures those probabilities — called logprobs — and visualizes
                them as a color-coded heatmap on every response. Green means the model was
                confident. Red means it was uncertain.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6 max-w-3xl">
                When you see a run of red tokens, that's where the model was guessing. That's
                where hallucinations happen. This is the most reliable hallucination detection
                available — not because we ask another AI to check the work, but because we read
                the model's own confidence signals directly.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-8 max-w-3xl">
                You can also ask Prysmai to explain any response. Why did the model say that?
                What were the key decision points? What was it most uncertain about? The answer
                is there, in the trace.
              </p>
              <p className="text-sm text-primary font-medium">
                Token-level confidence heatmap · Hallucination detection · "Why did it say that?" explanations
              </p>
            </div>

            {/* Capability 4: Governance */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Scale className="w-6 h-6 text-primary" />
                <p className="text-xs font-medium tracking-widest uppercase text-primary">Governance</p>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">
                It watches your AI agents so you don't have to.
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6 max-w-3xl">
                AI agents are different from chatbots. They don't just answer questions — they
                take actions. They write code. They call APIs. They access databases. They operate
                for minutes or hours at a time, making decisions without any human in the loop.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-8 max-w-3xl">
                Prysmai's governance layer monitors agent behavior in real time. It detects when
                an agent stops working before it finishes its task. It detects when an agent has
                tools available but isn't using them. It scans any code the agent generates for
                security vulnerabilities before that code gets executed. And it exposes all of
                this through the Model Context Protocol — which means any MCP-compatible agent
                (including Claude Code and Cursor) can connect directly to Prysmai's governance
                system without any additional code.
              </p>
              <p className="text-sm text-primary font-medium">
                Real-time behavioral monitoring · Code security scanning · MCP endpoint · LangGraph + CrewAI + Agent Framework integrations
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== INTEGRATION SECTION ========== */}
      <section className="py-28 lg:py-40 border-y border-border/30">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-8">
              One line of code.{" "}
              <span className="text-primary">Seriously.</span>
            </h2>

            <p className="text-lg text-muted-foreground leading-relaxed mb-12 max-w-3xl">
              You don't rewrite your application. You don't learn a new SDK. You don't change
              how your AI works. You just tell your app to talk to Prysmai instead of talking
              directly to OpenAI.
            </p>

            <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden mb-8">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-card/50">
                <Terminal className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Python</span>
              </div>
              <pre className="p-6 text-sm leading-relaxed overflow-x-auto">
                <code className="text-muted-foreground">{`# Before Prysmai
client = OpenAI(api_key="your-key")

# After Prysmai — that's it
client = OpenAI(
    api_key="sk-prysm-your-prysmai-key",
    base_url="https://api.prysmai.io/v1"
)`}</code>
              </pre>
            </div>

            <p className="text-muted-foreground leading-relaxed mb-10 max-w-3xl">
              Prysmai is fully OpenAI-compatible. If your application works with OpenAI today,
              it works with Prysmai today. No changes to your prompts, your models, your
              streaming setup, or your function calling. Everything just works.
            </p>

            <p className="text-sm text-muted-foreground">
              <span className="text-primary font-medium">Supported frameworks:</span>{" "}
              LangChain · LangGraph · CrewAI · Microsoft Agent Framework · LlamaIndex · OpenAI SDK · REST API
            </p>
          </div>
        </div>
      </section>

      {/* ========== WHO IT'S FOR ========== */}
      <section className="py-28 lg:py-40">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-20 text-center">
              Built for every person on{" "}
              <span className="text-primary">your AI team.</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {/* Developer */}
              <div>
                <Code className="w-6 h-6 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-4">If you're building the AI application.</h3>
                <p className="text-muted-foreground leading-relaxed text-sm mb-4">
                  You ship code. You don't have time to build observability from scratch. You
                  need to know when something breaks, why it broke, and how to fix it fast.
                  Prysmai gives you a production-grade observability layer in minutes. Real-time
                  logs. Cost tracking. Performance metrics. Hallucination detection. Security
                  scanning. All of it, without writing a single line of monitoring code.
                </p>
                <p className="text-sm text-muted-foreground italic">
                  No serious engineer runs a web server without logs and metrics. Running an AI
                  application without Prysmai is the same mistake.
                </p>
              </div>

              {/* Security & Compliance */}
              <div>
                <ShieldCheck className="w-6 h-6 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-4">If you're responsible for keeping it safe.</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  AI is a new attack surface. Prompt injection is the number one AI exploit right
                  now. PII leakage through AI systems is a GDPR and HIPAA violation waiting to
                  happen. AI agents operating without oversight are a liability. Prysmai is the
                  security layer your organization needs before it can responsibly deploy AI at
                  scale. Real-time threat detection. PII redaction. Complete audit trails. Policy
                  enforcement. All of it, without slowing down your developers.
                </p>
              </div>

              {/* Business Leader */}
              <div>
                <BarChart3 className="w-6 h-6 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-4">If you're responsible for the results.</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  AI is expensive and unpredictable. You don't know what you're spending, you
                  don't know if it's working, and you don't know if it's safe. Prysmai solves
                  all three. Exact cost tracking across every model and every request. Quality
                  metrics so you know when your AI is giving good answers and when it's making
                  things up. Governance controls so your agents operate within defined boundaries.
                  For any organization serious about deploying AI responsibly, Prysmai is not
                  optional infrastructure. It's essential infrastructure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== VISION SECTION ========== */}
      <section className="py-28 lg:py-40 border-y border-border/30">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-8">
              We're at an inflection point.{" "}
              <span className="text-primary">And most teams aren't ready.</span>
            </h2>

            <div className="space-y-6 text-muted-foreground leading-relaxed max-w-3xl mb-12">
              <p>
                Right now, most AI applications are reactive. A user asks a question, the AI
                answers. That's the current state. But the world is moving fast toward agentic
                AI — systems that don't just answer questions but actually take actions. Write
                code. Browse the web. Manage workflows. Make decisions.
              </p>
              <p>
                This is already happening. 61% of CEOs are already deploying AI agents. And
                Gartner predicts that more than 40% of those projects will fail by 2027. Not
                because the AI isn't capable. Because organizations have no way to govern it.
                No way to know what the agent did. No way to enforce policies. No way to catch
                it when it goes off the rails.
              </p>
              <p>
                That's the problem Prysmai is built to solve. We're building the governance
                platform for the age of autonomous AI. And we're building it at exactly the
                moment when the world is starting to realize it needs it.
              </p>
            </div>

            <Button
              variant="outline"
              className="border-border hover:border-primary/40 hover:bg-primary/5"
              onClick={() => scrollTo("waitlist")}
            >
              See Where We're Going
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* ========== PRICING TEASER ========== */}
      <section className="py-28 lg:py-40">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-8">
              Start free.{" "}
              <span className="text-primary">Scale when you're ready.</span>
            </h2>

            <p className="text-lg text-muted-foreground leading-relaxed mb-12">
              The free tier includes 10,000 requests per month — enough to get started, see
              the value, and decide if Prysmai is right for your team. No credit card required.
            </p>

            <Button
              variant="outline"
              className="border-border hover:border-primary/40 hover:bg-primary/5"
              onClick={() => window.location.href = "/pricing"}
            >
              View Pricing
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* ========== FINAL CTA ========== */}
      <section id="waitlist" className="py-28 lg:py-40 border-t border-border/30">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-8">
              Your AI is running.{" "}
              <span className="text-primary">Do you know what it's doing?</span>
            </h2>

            <p className="text-lg text-muted-foreground mb-12">
              Join the teams using Prysmai to see inside their AI applications — and keep them safe.
            </p>

            <Button
              className="h-12 px-10 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              onClick={() => setEarlyAccessOpen(true)}
            >
              Get Started Free — it takes 5 minutes
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* ========== RESEARCH CREDIBILITY STRIP ========== */}
      <section className="py-16 border-t border-border/30">
        <div className="container">
          <p className="text-center text-xs font-medium tracking-widest uppercase text-muted-foreground mb-10">
            Built on research from
          </p>
          <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16">
            {[
              { name: "Anthropic", desc: "Sparse Autoencoders" },
              { name: "OpenAI", desc: "Superposition Research" },
              { name: "DeepMind", desc: "Circuit Discovery" },
              { name: "MIT", desc: "Mechanistic Interpretability" },
            ].map((org) => (
              <ResearchLogo key={org.name} name={org.name} desc={org.desc} />
            ))}
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
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
              Security, governance, and observability for AI applications.
            </p>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Prysm AI
            </p>
          </div>
        </div>
      </footer>

      {/* Early Access Modal */}
      <EarlyAccessModal open={earlyAccessOpen} onOpenChange={setEarlyAccessOpen} />
    </div>
  );
}
