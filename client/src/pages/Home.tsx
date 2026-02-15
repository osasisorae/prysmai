/*
 * PRYSM AI LANDING PAGE — V4 (Honest & Identity-Driven)
 * Design: "Dark Observatory" — Cybersecurity Command Center
 * Copy: Identity-based, aspiration-driven, no fake promises
 * Hook: "The best agents are built by teams who see the deepest"
 * Typography: Space Grotesk (display), JetBrains Mono (code accents)
 *
 * Flow: Hero → Manifesto → Stack logos → Problem → Identity → Solution → CTA → Research → Footer
 * Removed: Fake dashboard preview, fake installation steps, premature pricing
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  Shield,
  Dices,
  ShieldAlert,
  EyeOff,
  Brain,
  ShieldCheck,
  Timer,
  MessageSquareWarning,
  ArrowRight,
  ChevronDown,
  X,
  Check,
  Sparkles,
  Scan,
  Layers,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { StackLogo, ResearchLogo } from "@/components/BrandLogos";

const HERO_BG = "https://private-us-east-1.manuscdn.com/sessionFile/Q0GdsnUFZ8bvWNXmTe1Tx2/sandbox/GSvs4qYJdgmPuexB5sb2lI-img-1_1771174049000_na1fn_cHJ5c20taGVyby1iZw.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUTBHZHNuVUZaOGJ2V05YbVRlMVR4Mi9zYW5kYm94L0dTdnM0cVlKZGdtUHVleEI1c2IybEktaW1nLTFfMTc3MTE3NDA0OTAwMF9uYTFmbl9jSEo1YzIwdGFHVnlieTFpWncucG5nP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=dtcY4oAznH93cd-cHdrX8Ssuw~tHp8gipzltdcvN4-F~PAwQxFNwwaeS9Pun9kf6NZ6nUron6ilKNoYFiLt1C1-a-u7i3II65gHDrDiMKT3GK81jxhABeHljI6B4dBS7QKrHUs1EKHURhOo9pydveRxPO-fdNHguOfBW3NlMxVVSJuzbpCtu28XPcv4Q5Fgr8fAXTYVJ3UCXUyiy72KsjeYw9SWZKCcT9hc5exrugKgy7qRC-fvpb~-~vfARELwY0ru1dKp7jg7G-aiAx7otl7nBw0MwOmiZZRAIQ~2q2HMX-g4UX8DVTFxVl~2einfKxbStajJ8092-FEAngppRgw__";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.15 },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

export default function Home() {
  // The userAuth hooks provides authentication state
  // To implement login/logout functionality, simply call logout() or redirect to getLoginUrl()
  let { user, loading, error, isAuthenticated, logout } = useAuth();

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ========== NAVBAR ========== */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-xl bg-background/80">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <span className="text-lg font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Prysm<span className="text-primary">AI</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#problem" className="hover:text-foreground transition-colors">Why Prysm</a>
            <a href="#solution" className="hover:text-foreground transition-colors">Product</a>
            <a href="/blog" className="hover:text-foreground transition-colors">Blog</a>
          </div>
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
            onClick={() => scrollTo("waitlist")}
          >
            Get Early Access
          </Button>
        </div>
      </nav>

      {/* ========== HERO ========== */}
      <section className="relative min-h-screen flex items-center pt-16">
        <div className="absolute inset-0">
          <img src={HERO_BG} alt="" className="w-full h-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
          <div className="absolute inset-0 grid-overlay opacity-15" />
        </div>

        <div className="container relative z-10 py-20 lg:py-32">
          <motion.div className="max-w-3xl" initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp} custom={0}>
              <span
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-primary/30 bg-primary/10 text-primary mb-8"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                FOR BUILDERS WHO GO DEEPER
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-4xl sm:text-5xl lg:text-[4.25rem] font-bold tracking-tight leading-[1.08] mb-6"
              style={{ fontFamily: "var(--font-display)" }}
            >
              You wouldn't ship code you can't debug.{" "}
              <span className="text-primary glow-cyan-text">Why ship AI you can't understand?</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mb-10"
            >
              The teams building the most reliable AI agents aren't guessing what their
              models do. They're seeing inside them. Prysm gives you that vision — so
              you build with understanding, not hope.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3">
              <Button
                className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold glow-cyan"
                onClick={() => scrollTo("waitlist")}
              >
                Get Early Access
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                className="h-12 px-8 border-border hover:border-primary/50 hover:bg-primary/5 font-medium"
                onClick={() => scrollTo("problem")}
              >
                Learn More
              </Button>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="w-6 h-6 text-muted-foreground" />
        </motion.div>
      </section>

      {/* ========== MANIFESTO STRIP ========== */}
      <div className="border-y border-border/30 bg-card/30 py-4">
        <p
          className="text-center text-sm text-muted-foreground tracking-wide"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          "Most teams deploy AI they don't understand. We think the best builders deserve better."
        </p>
      </div>

      {/* ========== FRAMEWORK LOGOS — SOCIAL PROOF ========== */}
      <section className="py-12 border-b border-border/30">
        <div className="container">
          <p
            className="text-center text-xs font-medium tracking-widest uppercase text-muted-foreground mb-8"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Works with your stack
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-60 hover:opacity-80 transition-opacity">
            {["LangChain", "CrewAI", "OpenAI", "Anthropic", "Meta / Llama", "Hugging Face", "AutoGen"].map((name) => (
              <StackLogo key={name} name={name} />
            ))}
          </div>
        </div>
      </section>

      {/* ========== PROBLEM SECTION ========== */}
      <section id="problem" className="py-24 lg:py-32 relative">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="max-w-4xl mx-auto"
          >
            <motion.div variants={fadeUp} custom={0} className="mb-4">
              <span
                className="text-xs font-medium tracking-widest uppercase"
                style={{ fontFamily: "var(--font-mono)", color: "oklch(0.82 0.16 80)" }}
              >
                The Blind Spot
              </span>
            </motion.div>

            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-8"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Right now, you're building{" "}
              <span style={{ color: "oklch(0.82 0.16 80)" }}>in the dark.</span>
            </motion.h2>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg text-muted-foreground leading-relaxed mb-16 max-w-3xl"
            >
              You've spent weeks perfecting your agent. The prompts are tight. The tools
              are connected. It works in testing. Then it hits production — and something
              breaks. A hallucination. A jailbreak. A response that makes no sense. You
              open the logs and start guessing. Eight hours later, you're still guessing.
              Not because you're not good enough. Because no one gave you the tools to
              actually see what's happening inside your model.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: Dices,
                  title: "You're guessing, not debugging",
                  desc: "When your agent fails, you can't trace WHY it failed. You read logs, tweak prompts, and hope. That's not engineering. That's gambling.",
                  color: "oklch(0.82 0.16 80)",
                },
                {
                  icon: ShieldAlert,
                  title: "More vulnerable than you think",
                  desc: "Jailbreak attacks succeed over 90% of the time against unprotected agents. One bad prompt can make your AI leak data, ignore rules, or go completely off-script.",
                  color: "oklch(0.65 0.22 25)",
                },
                {
                  icon: EyeOff,
                  title: "You can't explain what you can't see",
                  desc: "Your board asks how your AI makes decisions. Your compliance team needs an audit trail. Your customers want to trust it. You don't have answers — because you've never been able to look inside.",
                  color: "oklch(0.78 0.17 195)",
                },
              ].map((item, i) => (
                <div key={i} className="p-6 rounded-lg border border-border bg-card/50 backdrop-blur-sm">
                  <item.icon className="w-6 h-6 mb-4" style={{ color: item.color }} />
                  <h3
                    className="text-lg font-semibold mb-2"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ========== IDENTITY SECTION — THE PSYCHOLOGICAL HOOK ========== */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.03] to-background" />
        <div className="container relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="max-w-5xl mx-auto"
          >
            <motion.div variants={fadeUp} custom={0} className="mb-4">
              <span
                className="text-xs font-medium text-primary tracking-widest uppercase"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                A Different Kind of Builder
              </span>
            </motion.div>

            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-8 max-w-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Anyone can wrap an API.{" "}
              <span className="text-primary">Not everyone can understand what's inside.</span>
            </motion.h2>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg text-muted-foreground leading-relaxed max-w-3xl mb-16"
            >
              There are two kinds of teams building AI agents. The first kind calls an API,
              writes some prompts, and ships. When it breaks, they shrug. The second kind
              goes deeper. They want to understand every decision their model makes. They
              don't just want their agent to work — they want to know WHY it works.
              Prysm is built for the second kind.
            </motion.p>

            {/* Contrasting columns */}
            <motion.div variants={fadeUp} custom={3} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Without Prysm */}
              <div className="p-8 rounded-xl border border-border bg-card/30 relative">
                <div
                  className="absolute top-4 right-4 px-2 py-0.5 rounded text-[10px] font-medium border border-border text-muted-foreground"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  WITHOUT PRYSM
                </div>
                <div className="space-y-5 mt-6">
                  {[
                    "Deploying and hoping",
                    "Debugging by guessing",
                    "Explaining by hand-waving",
                    "Shipping with anxiety",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <X className="w-4 h-4 shrink-0" style={{ color: "oklch(0.65 0.22 25)" }} />
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* With Prysm */}
              <div className="p-8 rounded-xl border border-primary/30 bg-primary/[0.04] relative">
                <div
                  className="absolute top-4 right-4 px-2 py-0.5 rounded text-[10px] font-medium border border-primary/30 text-primary"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  WITH PRYSM
                </div>
                <div className="space-y-5 mt-6">
                  {[
                    "Deploying with understanding",
                    "Debugging with precision",
                    "Explaining with evidence",
                    "Shipping with confidence",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ========== SOLUTION SECTION ========== */}
      <section id="solution" className="py-24 lg:py-32 relative">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} custom={0} className="mb-4">
              <span
                className="text-xs font-medium text-primary tracking-widest uppercase"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                What You Get
              </span>
            </motion.div>

            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6 max-w-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              See every decision your AI makes.{" "}
              <span className="text-primary">Understand why it made it.</span>
            </motion.h2>

            <motion.div
              variants={fadeUp}
              custom={2}
              className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mt-12"
            >
              {[
                {
                  icon: Brain,
                  title: "Understand, don't guess",
                  desc: "See which internal patterns activated, which features fired, and why your model chose that response. For the first time, you'll actually know what your AI is doing.",
                },
                {
                  icon: ShieldCheck,
                  title: "Catch threats before your customers do",
                  desc: "Prysm analyzes every prompt in real-time and blocks attacks before they reach your model. You set the rules. Prysm enforces them.",
                },
                {
                  icon: Timer,
                  title: "Debug in minutes, not days",
                  desc: "Stop reading logs for hours. Prysm shows you exactly where things went wrong — which layer, which feature, which decision. What took 8 hours now takes 8 minutes.",
                },
                {
                  icon: MessageSquareWarning,
                  title: "Answer any question about your AI",
                  desc: "When your board, your compliance team, or your customers ask how your AI works — you'll have the answer. With evidence.",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="p-6 rounded-xl border border-border bg-card/50 backdrop-blur-sm group hover:border-primary/30 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3
                    className="text-lg font-semibold mb-2"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ========== WHAT WE'RE BUILDING — HONEST TEASER ========== */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-card/20 to-background" />
        <div className="container relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="max-w-4xl mx-auto"
          >
            <motion.div variants={fadeUp} custom={0} className="mb-4">
              <span
                className="text-xs font-medium text-primary tracking-widest uppercase"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                What We're Building
              </span>
            </motion.div>

            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6"
              style={{ fontFamily: "var(--font-display)" }}
            >
              A new kind of observability.{" "}
              <span className="text-primary">Built for AI.</span>
            </motion.h2>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg text-muted-foreground leading-relaxed mb-16 max-w-3xl"
            >
              We're building tools that let you look inside your AI models in real-time
              — not just at their outputs, but at the internal processes that produce them.
              Here's the direction we're heading.
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={3}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {[
                {
                  icon: Scan,
                  title: "Real-time model inspection",
                  desc: "Watch internal feature activations as your model processes each request. See which concepts light up and which stay silent.",
                },
                {
                  icon: Activity,
                  title: "Prompt threat detection",
                  desc: "Analyze incoming prompts for adversarial patterns, jailbreak attempts, and injection attacks — before they reach your model.",
                },
                {
                  icon: Layers,
                  title: "Explainability reports",
                  desc: "Generate human-readable explanations of why your model made a specific decision. Built for compliance, audits, and trust.",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="p-6 rounded-xl border border-dashed border-primary/20 bg-primary/[0.03] group hover:border-primary/40 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3
                    className="text-lg font-semibold mb-2"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </motion.div>

            <motion.div
              variants={fadeUp}
              custom={4}
              className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span style={{ fontFamily: "var(--font-mono)" }}>
                Actively in development — early access coming soon
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ========== FINAL CTA / WAITLIST ========== */}
      <section id="waitlist" className="py-24 lg:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        <div className="absolute inset-0 grid-overlay opacity-15" />
        <div className="container relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="max-w-2xl mx-auto text-center"
          >
            <motion.h2
              variants={fadeUp}
              custom={0}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6"
              style={{ fontFamily: "var(--font-display)" }}
            >
              The best AI isn't built by the biggest teams.{" "}
              <span className="text-primary glow-cyan-text">It's built by the teams who see the deepest.</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-lg text-muted-foreground mb-10">
              Stop guessing. Start understanding. Join the builders who go deeper.
            </motion.p>

            <motion.form
              variants={fadeUp}
              custom={2}
              onSubmit={handleWaitlist}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                style={{ fontFamily: "var(--font-mono)" }}
              />
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold whitespace-nowrap glow-cyan"
              >
                {isSubmitting ? "Joining..." : "Get Early Access"}
              </Button>
            </motion.form>

            <motion.p variants={fadeUp} custom={3} className="text-xs text-muted-foreground mt-4">
              No credit card required. Be the first to know when we launch.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ========== RESEARCH CREDIBILITY STRIP ========== */}
      <section className="py-12 border-t border-border/30">
        <div className="container">
          <p
            className="text-center text-xs font-medium tracking-widest uppercase text-muted-foreground mb-6"
            style={{ fontFamily: "var(--font-mono)" }}
          >
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
      <footer className="border-t border-border py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                Prysm<span className="text-primary">AI</span>
              </span>
            </div>
            <p
              className="text-xs text-muted-foreground"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Built for builders who go deeper.
            </p>
            <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
              &copy; {new Date().getFullYear()} Prysm AI
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
