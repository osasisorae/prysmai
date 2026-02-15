/*
 * PRYSM AI LANDING PAGE
 * Design: "Dark Observatory" — Cybersecurity Command Center
 * Color: Near-black base, electric cyan (#00E5FF) primary, amber warnings
 * Typography: Space Grotesk (headings/body), JetBrains Mono (code/accents)
 * Layout: Full-bleed dark canvas with floating panels
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Shield,
  Zap,
  Eye,
  Terminal,
  ArrowRight,
  ChevronDown,
  Activity,
  Lock,
  Layers,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

// Image URLs
const HERO_BG = "https://private-us-east-1.manuscdn.com/sessionFile/Q0GdsnUFZ8bvWNXmTe1Tx2/sandbox/GSvs4qYJdgmPuexB5sb2lI-img-1_1771174049000_na1fn_cHJ5c20taGVyby1iZw.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUTBHZHNuVUZaOGJ2V05YbVRlMVR4Mi9zYW5kYm94L0dTdnM0cVlKZGdtUHVleEI1c2IybEktaW1nLTFfMTc3MTE3NDA0OTAwMF9uYTFmbl9jSEo1YzIwdGFHVnlieTFpWncucG5nP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=dtcY4oAznH93cd-cHdrX8Ssuw~tHp8gipzltdcvN4-F~PAwQxFNwwaeS9Pun9kf6NZ6nUron6ilKNoYFiLt1C1-a-u7i3II65gHDrDiMKT3GK81jxhABeHljI6B4dBS7QKrHUs1EKHURhOo9pydveRxPO-fdNHguOfBW3NlMxVVSJuzbpCtu28XPcv4Q5Fgr8fAXTYVJ3UCXUyiy72KsjeYw9SWZKCcT9hc5exrugKgy7qRC-fvpb~-~vfARELwY0ru1dKp7jg7G-aiAx7otl7nBw0MwOmiZZRAIQ~2q2HMX-g4UX8DVTFxVl~2einfKxbStajJ8092-FEAngppRgw__";

const PRISM_IMG = "https://private-us-east-1.manuscdn.com/sessionFile/Q0GdsnUFZ8bvWNXmTe1Tx2/sandbox/GSvs4qYJdgmPuexB5sb2lI-img-2_1771174043000_na1fn_cHJ5c20tcHJpc20taWxsdXN0cmF0aW9u.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUTBHZHNuVUZaOGJ2V05YbVRlMVR4Mi9zYW5kYm94L0dTdnM0cVlKZGdtUHVleEI1c2IybEktaW1nLTJfMTc3MTE3NDA0MzAwMF9uYTFmbl9jSEo1YzIwdGNISnBjMjB0YVd4c2RYTjBjbUYwYVc5dS5wbmc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=nLvTRtIEWi~mexjYl-0eDgqrhM4w~DW-tzVo8PKK2b-gTCtVMOYBdQICsQAz-E3gHsa6BVciClT8zWbJe-3bm1L94~TqsGkiJJbOkej30cTeWl9Zc9qxdEOUP5LnSBa9jqUYdu6RPvZkkJ7o~3tBYi7lDgHy9TfWcjgorGZyjnIUhQ3aDGL9U1~hjZ1pJQi6do0lyGq-DX5P9NWTLwzzeg9qgcJbxb~BNsnQXMSeicGgbF554ZmMnA2tq714AALpavha15zKvtHFQx2wTOKhVJJ~FGb1~l8SOeFy6etiXg5rHERC9d4nR~kU12kBBugD-Ub-xZkxF6Bg-mnUt6~nDw__";

const DASHBOARD_IMG = "https://private-us-east-1.manuscdn.com/sessionFile/Q0GdsnUFZ8bvWNXmTe1Tx2/sandbox/GSvs4qYJdgmPuexB5sb2lI-img-3_1771174040000_na1fn_cHJ5c20tZGFzaGJvYXJkLXByZXZpZXc.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUTBHZHNuVUZaOGJ2V05YbVRlMVR4Mi9zYW5kYm94L0dTdnM0cVlKZGdtUHVleEI1c2IybEktaW1nLTNfMTc3MTE3NDA0MDAwMF9uYTFmbl9jSEo1YzIwdFpHRnphR0p2WVhKa0xYQnlaWFpwWlhjLnBuZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=WR6bKS12t1LgK-9DbjAlCTlBbrVsS4xxG49DIMt3aKuDR7ezc2ZMmJ7d5H38~JbwBcknQ3vvAMVdZfKo6I02tHB4Pxu5nNJ-ODCXstQxJ~jSpYpsV5EtSZZ6uz8~8o494V-vs~0ULKiItHxeEawKmud0cX5Y8p7pnTr1zGFXdsOyn8odfWyL3xFh8TQQL-Rdbl3F0ByakUTWQFWM4XbImJWmT7QDyh1TR22~7VaL96tz0Y7jRKRnx02svY9avVrXSxxOoL-EFecpYVLK-0im8ozbG3wgtRnawRtecv3TIaN-o4DkC91MmSHAc83hwtZSGNx2ys1QgCXSwrypSuOcVA__";

const CODE_IMG = "https://private-us-east-1.manuscdn.com/sessionFile/Q0GdsnUFZ8bvWNXmTe1Tx2/sandbox/GSvs4qYJdgmPuexB5sb2lI-img-4_1771174049000_na1fn_cHJ5c20tY29kZS10ZXJtaW5hbA.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUTBHZHNuVUZaOGJ2V05YbVRlMVR4Mi9zYW5kYm94L0dTdnM0cVlKZGdtUHVleEI1c2IybEktaW1nLTRfMTc3MTE3NDA0OTAwMF9uYTFmbl9jSEo1YzIwdFkyOWtaUzEwWlhKdGFXNWhiQS5wbmc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=Dwq9-NJzNWFZ1X4ftZkLofy-mCNqqxh0sZ~DBp2Z-qIqTg5yukR3-~XKhnWgd3lJNNrNLDWqADCBpk-bt~0p2WBJGYEjaohTFzCDs6orSF1KOp4vBGzTMkj8nJ9KuZvs-DxRaoZJdFCzYUe9wqik4IW3cxi~wD~-YOxeLTi~hYWLFcof8fBvDDxQAlEXFWCfgDFrIi2oeTPMfn6~FxUyxcrpeF5SvuPMWfxi38iefPhsNpBzpIwJZfOb6NgNSxj8wr3D1gqb0iuYGe8jW-qeFoV6mYtuolxWrbdJVv2icVA13cbHkPZ4VpoC354a-bCF0XaF1~Mo8V-nrdw3Mc11CA__";

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
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setIsSubmitting(true);
    // Simulate submission
    await new Promise((r) => setTimeout(r, 1200));
    toast.success("You're on the list! We'll be in touch soon.");
    setEmail("");
    setIsSubmitting(false);
  };

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
            <a href="#problem" className="hover:text-foreground transition-colors">Problem</a>
            <a href="#solution" className="hover:text-foreground transition-colors">Solution</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </div>
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
            onClick={() => document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })}
          >
            Join Waitlist
          </Button>
        </div>
      </nav>

      {/* ========== HERO SECTION ========== */}
      <section className="relative min-h-screen flex items-center pt-16">
        {/* Background */}
        <div className="absolute inset-0">
          <img
            src={HERO_BG}
            alt=""
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
          <div className="absolute inset-0 grid-overlay opacity-30" />
        </div>

        <div className="container relative z-10 py-20 lg:py-32">
          <motion.div
            className="max-w-3xl"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            {/* Badge */}
            <motion.div variants={fadeUp} custom={0}>
              <span
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-primary/30 bg-primary/10 text-primary mb-8"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                PRIVATE BETA — NOW ACCEPTING SIGNUPS
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Stop Flying Blind.{" "}
              <span className="text-primary glow-cyan-text">
                See Through Your AI.
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mb-10"
            >
              Prysm AI is the first real-time security monitor for AI agents that uses
              mechanistic interpretability to detect threats <em>before</em> they happen.
              Stop cleaning up after prompt injections and data leaks. Start preventing them.
            </motion.p>

            {/* CTA */}
            <motion.form
              variants={fadeUp}
              custom={3}
              onSubmit={handleWaitlist}
              className="flex flex-col sm:flex-row gap-3 max-w-md"
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
                className="h-12 px-6 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold whitespace-nowrap glow-cyan"
              >
                {isSubmitting ? "Joining..." : "Join Waitlist"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.form>

            {/* Social proof */}
            <motion.p
              variants={fadeUp}
              custom={4}
              className="text-sm text-muted-foreground mt-4"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              pip install prysm-middleware
            </motion.p>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="w-6 h-6 text-muted-foreground" />
        </motion.div>
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
                className="text-xs font-medium text-amber-warn tracking-widest uppercase"
                style={{ fontFamily: "var(--font-mono)", color: "oklch(0.82 0.16 80)" }}
              >
                The Problem
              </span>
            </motion.div>

            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-8"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Your AI agents are a{" "}
              <span style={{ color: "oklch(0.65 0.22 25)" }}>black box</span>.
            </motion.h2>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg text-muted-foreground leading-relaxed mb-16"
            >
              When your agent fails in production — a hallucination, a data leak, a prompt injection —
              you're stuck digging through thousands of log entries for hours. You can see <em>what</em> happened,
              but never <em>why</em>. The result? Brittle patches that fix one symptom while the root cause festers.
            </motion.p>

            {/* Stats grid */}
            <motion.div
              variants={fadeUp}
              custom={3}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {[
                {
                  stat: "73%",
                  label: "of production AI systems are vulnerable to prompt injection",
                  source: "OWASP 2025",
                  icon: AlertTriangle,
                  color: "oklch(0.65 0.22 25)",
                },
                {
                  stat: "8hrs",
                  label: "average time to diagnose a single agent failure in production",
                  source: "Industry avg.",
                  icon: Activity,
                  color: "oklch(0.82 0.16 80)",
                },
                {
                  stat: "$50B",
                  label: "projected AI agent market by 2030 — security is the bottleneck",
                  source: "Forbes 2025",
                  icon: Layers,
                  color: "oklch(0.78 0.17 195)",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="p-6 rounded-lg border border-border bg-card/50 backdrop-blur-sm"
                >
                  <item.icon className="w-5 h-5 mb-4" style={{ color: item.color }} />
                  <div
                    className="text-4xl font-bold mb-2"
                    style={{ fontFamily: "var(--font-display)", color: item.color }}
                  >
                    {item.stat}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                    {item.label}
                  </p>
                  <span
                    className="text-xs text-muted-foreground/60"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {item.source}
                  </span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ========== SOLUTION / PRISM SECTION ========== */}
      <section id="solution" className="py-24 lg:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background" />
        <div className="container relative z-10">
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
                The Solution
              </span>
            </motion.div>

            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6 max-w-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Like a prism splits light,{" "}
              <span className="text-primary">Prysm splits AI behavior</span>{" "}
              into its hidden features.
            </motion.h2>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg text-muted-foreground leading-relaxed max-w-2xl mb-16"
            >
              Prysm AI uses mechanistic interpretability — the science of reverse-engineering
              neural networks — to decompose your agent's internal state into human-understandable
              features. See the "deception" feature spike when someone attempts a jailbreak.
              Block it before it generates a response.
            </motion.p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Prism illustration */}
              <motion.div variants={fadeUp} custom={3}>
                <div className="relative rounded-xl overflow-hidden border border-border/50">
                  <img
                    src={PRISM_IMG}
                    alt="Prysm AI decomposes AI behavior like a prism splits light"
                    className="w-full h-auto"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <p
                      className="text-xs text-muted-foreground"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      AI output → Prysm → Decomposed features (deception, PII, code injection...)
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Feature list */}
              <motion.div variants={fadeUp} custom={4} className="space-y-6">
                {[
                  {
                    icon: Eye,
                    title: "Real-Time Feature Monitoring",
                    desc: "Watch the activation strength of dangerous features like 'ignore-instructions' or 'reveal-sensitive-data' as prompts flow through your agent.",
                  },
                  {
                    icon: Shield,
                    title: "Automatic Threat Blocking",
                    desc: "Set a threat score threshold. When a malicious prompt activates dangerous features beyond your limit, Prysm blocks it automatically.",
                  },
                  {
                    icon: Zap,
                    title: "One-Line Integration",
                    desc: "pip install prysm-middleware. Wrap your agent in prysm.monitor(). That's it. Works with LangChain, CrewAI, and any Python agent.",
                  },
                  {
                    icon: Lock,
                    title: "Deep Model Inspection",
                    desc: "For self-hosted models (Llama 3, Mistral), access the full internal activation state. See which neurons fire and why.",
                  },
                ].map((feature, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3
                        className="font-semibold text-foreground mb-1"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========== DASHBOARD PREVIEW ========== */}
      <section className="py-24 lg:py-32 relative">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.div variants={fadeUp} custom={0} className="mb-4">
              <span
                className="text-xs font-medium text-primary tracking-widest uppercase"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                The Dashboard
              </span>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Your AI agent's{" "}
              <span className="text-primary">mission control</span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              A security-first interface that shows you what's happening inside your model in real-time.
              Threat scores, feature activations, and neural network heatmaps — all in one view.
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative max-w-5xl mx-auto"
          >
            <div className="rounded-xl overflow-hidden border border-border/50 glow-cyan">
              <img
                src={DASHBOARD_IMG}
                alt="Prysm AI security monitoring dashboard"
                className="w-full h-auto"
              />
            </div>
            {/* Floating labels */}
            <div className="absolute -top-3 -right-3 px-3 py-1.5 rounded-md bg-primary/20 border border-primary/30 text-xs font-medium text-primary" style={{ fontFamily: "var(--font-mono)" }}>
              LIVE
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section id="how-it-works" className="py-24 lg:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-card/20 to-background" />
        <div className="container relative z-10">
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
                How It Works
              </span>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-16 max-w-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Three steps to{" "}
              <span className="text-primary">total visibility</span>
            </motion.h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "Install & Connect",
                  desc: "pip install prysm-middleware. Add two lines of code to wrap your agent. Works with LangChain, CrewAI, or any Python-based agent framework.",
                  icon: Terminal,
                },
                {
                  step: "02",
                  title: "Decompose & Tag",
                  desc: "Prysm trains a Sparse Autoencoder on your model, discovering thousands of human-readable features. Tag the dangerous ones — 'deception', 'code-injection', 'PII-exposure'.",
                  icon: Layers,
                },
                {
                  step: "03",
                  title: "Monitor & Block",
                  desc: "Deploy with prysm.monitor(). Every prompt is analyzed in real-time. The dashboard shows live feature activations. Threats are blocked before they cause damage.",
                  icon: Shield,
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  custom={i + 2}
                  className="relative p-8 rounded-xl border border-border bg-card/50 backdrop-blur-sm group hover:border-primary/30 transition-colors"
                >
                  <span
                    className="text-6xl font-bold text-border/50 absolute top-4 right-6"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {item.step}
                  </span>
                  <item.icon className="w-8 h-8 text-primary mb-6" />
                  <h3
                    className="text-xl font-semibold mb-3"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Code preview */}
            <motion.div
              variants={fadeUp}
              custom={5}
              className="mt-16 max-w-3xl mx-auto"
            >
              <div className="rounded-xl overflow-hidden border border-border/50">
                <img
                  src={CODE_IMG}
                  alt="Prysm AI code integration example"
                  className="w-full h-auto"
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ========== PRICING / TIERS ========== */}
      <section id="pricing" className="py-24 lg:py-32 relative">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} custom={0} className="text-center mb-4">
              <span
                className="text-xs font-medium text-primary tracking-widest uppercase"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Pricing
              </span>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6 text-center"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Built for every team
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg text-muted-foreground max-w-2xl mx-auto text-center mb-16"
            >
              Start free with output-level monitoring. Upgrade to Pro for deep mechanistic
              interpretability on your self-hosted models.
            </motion.p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Community Tier */}
              <motion.div
                variants={fadeUp}
                custom={3}
                className="p-8 rounded-xl border border-border bg-card/50"
              >
                <h3
                  className="text-sm font-medium text-muted-foreground mb-2 tracking-widest uppercase"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Community
                </h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                    Free
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-8">
                  For teams using API-based models (OpenAI, Claude, Gemini).
                  Output-level security monitoring.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    "Prompt injection detection",
                    "PII exposure scanning",
                    "Basic threat scoring",
                    "Simple guardrails",
                    "Community dashboard",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  className="w-full h-11 border-border hover:border-primary/50 hover:bg-primary/5"
                  onClick={() => document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Join Waitlist
                </Button>
              </motion.div>

              {/* Pro Tier */}
              <motion.div
                variants={fadeUp}
                custom={4}
                className="p-8 rounded-xl border border-primary/30 bg-primary/5 relative"
              >
                <div
                  className="absolute -top-3 right-6 px-3 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  RECOMMENDED
                </div>
                <h3
                  className="text-sm font-medium text-primary mb-2 tracking-widest uppercase"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Pro
                </h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                    $499
                  </span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>
                <p className="text-sm text-muted-foreground mb-8">
                  For teams running self-hosted models (Llama 3, Mistral).
                  Deep mechanistic interpretability.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    "Everything in Community",
                    "Deep MI monitoring (SAE analysis)",
                    "Real-time feature activation dashboard",
                    "Neural network heatmaps",
                    "Advanced threat alerts (Slack, PagerDuty)",
                    "Priority support",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan font-semibold"
                  onClick={() => document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Join Waitlist — Early Access
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========== WAITLIST CTA ========== */}
      <section id="waitlist" className="py-24 lg:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        <div className="absolute inset-0 grid-overlay opacity-20" />
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
              Ready to{" "}
              <span className="text-primary glow-cyan-text">see through</span>{" "}
              your AI?
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={1}
              className="text-lg text-muted-foreground mb-10"
            >
              We're building the future of AI security. Join the private beta waitlist
              and be the first to protect your agents with mechanistic interpretability.
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

            <motion.p
              variants={fadeUp}
              custom={3}
              className="text-xs text-muted-foreground mt-4"
            >
              No spam. We'll only email you when the beta is ready.
            </motion.p>
          </motion.div>
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
            <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>
              &copy; {new Date().getFullYear()} Prysm AI. See through your AI.
            </p>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <a href="https://prysmai.io" className="hover:text-foreground transition-colors flex items-center gap-1">
                prysmai.io <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
