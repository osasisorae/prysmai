/*
 * PRYSM AI LANDING PAGE — V6 (Governance-First)
 * Design: Clean dark theme with calm confidence
 * Principles: Generous whitespace, 2-color palette (cyan + neutral),
 *   single font (Inter), minimal animation, simplified cards
 * Positioning: "Security, governance, and observability for autonomous AI agents"
 * Flow: Hero → Stack logos → Problem → Identity → Solution → Teaser → CTA → Research → Footer
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  Brain,
  ShieldCheck,
  Timer,
  MessageSquareWarning,
  ArrowRight,
  X,
  Check,
  Sparkles,
  Scan,
  Layers,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { StackLogo, ResearchLogo } from "@/components/BrandLogos";
import { EarlyAccessModal } from "@/components/EarlyAccessModal";
import SecurityScanDemo from "@/components/SecurityScanDemo";

const LOGO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663306080277/pKkWElgCpRmlNvjQ.png";

const CONCEPT_VISUAL = "https://private-us-east-1.manuscdn.com/sessionFile/Q0GdsnUFZ8bvWNXmTe1Tx2/sandbox/73vpL8l461ipBpWYew94xE-img-1_1771186440000_na1fn_cHJ5c20tY29uY2VwdC12aXN1YWw.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUTBHZHNuVUZaOGJ2V05YbVRlMVR4Mi9zYW5kYm94LzczdnBMOGw0NjFpcEJwV1lldzk0eEUtaW1nLTFfMTc3MTE4NjQ0MDAwMF9uYTFmbl9jSEo1YzIwdFkyOXVZMlZ3ZEMxMmFYTjFZV3cucG5nP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=PeyyUycRnpBlFcOs6UD6sjB8VGHt9dDMHSyWG6g11Qm2krBrzztDVpydJV1Q71IXqOiFbJ8vrCV888uahk1JL43eLbXinUy41ewE9WbCDDdxOixhaztWXZom0~laLPaXWcjF0RO6SKsI5xffgQxip-mCipuD8Zq5APFPKYzl43bJMDbzOCofFjQekEoh~3UBsdZidcy5FkOtSL7jAk8yCSmnrh48qRAw3jbn6dYKIbD7cedLK9lNPx5Zdv9zCpbWzU8PeEEJV6hES~zJs0YIPzfkWYHpt4Vqbv5g3OZA07pY5cLuDLT8L2gj7GtOY5hqaeeXNTdzkfeamdwKUsp5Gw__";

export default function Home() {
  let { user, loading, error, isAuthenticated, logout } = useAuth();

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [earlyAccessOpen, setEarlyAccessOpen] = useState(false);

  const joinWaitlist = trpc.waitlist.join.useMutation({
    onSuccess: (data) => {
      if (data.alreadyExists) {
        toast.success("You're already on the list. We'll be in touch.");
      } else {
        toast.success("You're on the list. Welcome to the builders who go deeper.");
      }
      setEmail("");
      setIsSubmitting(false);
    },
    onError: () => {
      toast.error("Something went wrong. Please try again.");
      setIsSubmitting(false);
    },
  });

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setIsSubmitting(true);
    joinWaitlist.mutate({ email, source: "landing_page" });
  };

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
            <a href="#problem" className="hover:text-foreground transition-colors">Why Prysm</a>
            <a href="#solution" className="hover:text-foreground transition-colors">Product</a>
            <a href="/pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="/docs" className="hover:text-foreground transition-colors">Docs</a>
            <a href="/blog" className="hover:text-foreground transition-colors">Blog</a>
          </div>
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setEarlyAccessOpen(true)}
          >
            Get Early Access
          </Button>
        </div>
      </nav>

      {/* ========== HERO ========== */}
      <section className="pt-32 pb-24 lg:pt-44 lg:pb-36">
        <div className="container">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-primary tracking-wide mb-6">
              Security, governance, and observability for autonomous AI agents
            </p>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-8">
              Your agents make thousands of decisions.{" "}
              <span className="text-primary">Do you know which ones to trust?</span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mb-12">
              The teams shipping the most reliable AI agents aren't just monitoring outputs.
              They're governing every decision, tracing every tool call, and catching threats
              before they reach production. Prysm is the governance and security layer that
              makes autonomous agents auditable, explainable, and safe.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                onClick={() => setEarlyAccessOpen(true)}
              >
                Get Early Access
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                className="h-12 px-8 border-border hover:border-primary/40 hover:bg-primary/5"
                onClick={() => scrollTo("problem")}
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CONCEPT VISUAL ========== */}
      <section className="pb-24 lg:pb-36">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="rounded-xl overflow-hidden border border-border/30">
              <img
                src={CONCEPT_VISUAL}
                alt="Prysm AI — light passing through a prism to reveal AI model internals"
                className="w-full h-auto"
              />
            </div>
            <p className="text-center text-sm text-muted-foreground mt-6">
              Govern, secure, and observe every decision your agents make.
            </p>
          </div>
        </div>
      </section>

      {/* ========== FRAMEWORK LOGOS — SOCIAL PROOF ========== */}
      <section className="py-16 border-y border-border/30">
        <div className="container">
          <p className="text-center text-xs font-medium tracking-widest uppercase text-muted-foreground mb-10">
            Works with your stack
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-50">
            {["LangGraph", "CrewAI", "Agent Framework", "OpenAI", "Anthropic", "Meta / Llama", "Hugging Face"].map((name) => (
              <StackLogo key={name} name={name} />
            ))}
          </div>
        </div>
      </section>

      {/* ========== PROBLEM SECTION ========== */}
      <section id="problem" className="py-28 lg:py-40">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <p className="text-sm font-medium text-primary tracking-wide mb-6">
              The governance gap
            </p>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-8">
              Autonomous agents are powerful. Ungoverned agents are dangerous.
            </h2>

            <p className="text-lg text-muted-foreground leading-relaxed mb-20">
              Your agents call tools, make decisions, and take actions on behalf of your users.
              But when something goes wrong — a hallucination, a jailbreak, a tool call that
              shouldn't have happened — you have no audit trail, no explanation, and no way to
              prevent it from happening again. The problem isn't your agents. It's that no one
              built the governance layer they need.
            </p>

            <div className="space-y-8">
              {[
                {
                  title: "No audit trail for agent decisions",
                  desc: "Your agent chose a tool, called an API, and took an action. Why? You can't answer that — and neither can your compliance team. Every ungoverned decision is a liability.",
                },
                {
                  title: "Security threats you can't see coming",
                  desc: "Jailbreak attacks succeed over 90% of the time against unprotected agents. Without real-time governance, one bad prompt can make your AI leak data, ignore policies, or go off-script.",
                },
                {
                  title: "Enterprise trust requires evidence",
                  desc: "Your board asks how your AI makes decisions. Your compliance team needs an audit trail. Your customers want to trust it. Governance gives you the evidence they need.",
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
          </div>
        </div>
      </section>

      {/* ========== IDENTITY SECTION ========== */}
      <section className="py-28 lg:py-40">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <p className="text-sm font-medium text-primary tracking-wide mb-6">
              Built for responsible AI teams
            </p>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-8 max-w-3xl">
              Anyone can deploy an agent.{" "}
              <span className="text-primary">Not everyone can govern one.</span>
            </h2>

            <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mb-20">
              There are two kinds of teams building AI agents. The first kind ships fast
              and hopes for the best. The second kind builds governance into the foundation.
              They trace every decision, enforce policies on every action, and can explain
              exactly why their agent did what it did. Prysm is built for the second kind.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Without Prysm */}
              <div className="p-8 rounded-xl border border-border/50 relative">
                <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-8">
                  Without Prysm
                </p>
                <div className="space-y-5">
                  {[
                    "Deploying without governance",
                    "Debugging without traces",
                    "Explaining without evidence",
                    "Shipping without audit trails",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <X className="w-4 h-4 shrink-0 text-muted-foreground/50" />
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* With Prysm */}
              <div className="p-8 rounded-xl border border-primary/20 bg-primary/[0.03] relative">
                <p className="text-xs font-medium tracking-widest uppercase text-primary mb-8">
                  With Prysm
                </p>
                <div className="space-y-5">
                  {[
                    "Deploying with governance policies",
                    "Debugging with full decision traces",
                    "Explaining with audit evidence",
                    "Shipping with enterprise confidence",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SOLUTION SECTION ========== */}
      <section id="solution" className="py-28 lg:py-40">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <p className="text-sm font-medium text-primary tracking-wide mb-6">
              What you get
            </p>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-20 max-w-3xl">
              Govern every decision your agents make.{" "}
              <span className="text-primary">Trace why they made it.</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
              {[
                {
                  icon: Brain,
                  title: "Agent decision explainability",
                  desc: "Trace every tool call, every LLM decision, every action your agent takes. See the full decision chain — from input to output — with evidence your compliance team can audit.",
                },
                {
                  icon: ShieldCheck,
                  title: "Real-time threat governance",
                  desc: "Enforce security policies on every agent action. Block jailbreaks, detect prompt injection, prevent PII leakage — all in real-time, before threats reach production.",
                },
                {
                  icon: Timer,
                  title: "Unified workflow tracing",
                  desc: "See LLM calls, tool executions, and agent decisions in a single correlated timeline. Debug multi-step agent workflows in minutes, not days.",
                },
                {
                  icon: MessageSquareWarning,
                  title: "Enterprise-ready audit trails",
                  desc: "Generate compliance-ready reports showing exactly how your agents make decisions. Built for the boards, regulators, and customers who need to trust your AI.",
                },
              ].map((item, i) => (
                <div key={i}>
                  <item.icon className="w-6 h-6 text-primary mb-4" />
                  <h3 className="text-lg font-semibold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== WHAT WE'RE BUILDING — HONEST TEASER ========== */}
      <section className="py-28 lg:py-40 border-y border-border/30">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <p className="text-sm font-medium text-primary tracking-wide mb-6">
              What we're building
            </p>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-8">
              The governance layer for agentic AI.{" "}
              <span className="text-primary">Built for production.</span>
            </h2>

            <p className="text-lg text-muted-foreground leading-relaxed mb-20 max-w-3xl">
              We're building the infrastructure that makes autonomous AI agents safe,
              auditable, and compliant — from development through production.
              Here's what's live and what's coming next.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {[
                {
                  icon: Scan,
                  title: "Multi-agent coordination",
                  desc: "Govern agent-to-agent communication, shared memory access, and cross-agent decision chains. Coming in Phase 3.",
                },
                {
                  icon: Activity,
                  title: "Compliance reporting",
                  desc: "Auto-generated audit reports for SOC 2, ISO 27001, and AI-specific regulations. Export-ready evidence for every agent action.",
                },
                {
                  icon: Layers,
                  title: "Approval workflows",
                  desc: "Require human approval for high-risk agent actions. Define escalation policies based on action type, risk score, or cost threshold.",
                },
              ].map((item, i) => (
                <div key={i}>
                  <item.icon className="w-6 h-6 text-primary mb-4" />
                  <h3 className="text-lg font-semibold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-14 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Governance, tracing, and security are live — enterprise features coming Q2 2026</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SECURITY SCAN DEMO ========== */}
      <SecurityScanDemo />

      {/* ========== FINAL CTA ========== */}
      <section id="waitlist" className="py-28 lg:py-40">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-8">
              The most trusted AI agents aren't the smartest.{" "}
              <span className="text-primary">They're the most governed.</span>
            </h2>

            <p className="text-lg text-muted-foreground mb-12">
              Stop hoping your agents behave. Start governing them. Join the teams building AI that's auditable, explainable, and safe.
            </p>

            <Button
              className="h-12 px-10 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              onClick={() => setEarlyAccessOpen(true)}
            >
              Get Early Access
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <p className="text-xs text-muted-foreground mt-6">
              No credit card required. Be the first to know when we launch.
            </p>
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
              The governance and security layer for autonomous AI agents.
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
