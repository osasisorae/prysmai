/*
 * PRYSM AI LANDING PAGE — V2 (Value-Driven)
 * Design: "Dark Observatory" — Cybersecurity Command Center
 * Copy: Outcome-focused, customer POV, non-technical language
 * Typography: Space Grotesk (display), JetBrains Mono (code accents)
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Shield,
  Clock,
  ShieldOff,
  Users,
  Moon,
  Zap,
  FileCheck,
  Rocket,
  Terminal,
  Link,
  Coffee,
  ArrowRight,
  ChevronDown,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

// CDN Image URLs
const HERO_BG = "https://private-us-east-1.manuscdn.com/sessionFile/Q0GdsnUFZ8bvWNXmTe1Tx2/sandbox/GSvs4qYJdgmPuexB5sb2lI-img-1_1771174049000_na1fn_cHJ5c20taGVyby1iZw.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUTBHZHNuVUZaOGJ2V05YbVRlMVR4Mi9zYW5kYm94L0dTdnM0cVlKZGdtUHVleEI1c2IybEktaW1nLTFfMTc3MTE3NDA0OTAwMF9uYTFmbl9jSEo1YzIwdGFHVnlieTFpWncucG5nP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=dtcY4oAznH93cd-cHdrX8Ssuw~tHp8gipzltdcvN4-F~PAwQxFNwwaeS9Pun9kf6NZ6nUron6ilKNoYFiLt1C1-a-u7i3II65gHDrDiMKT3GK81jxhABeHljI6B4dBS7QKrHUs1EKHURhOo9pydveRxPO-fdNHguOfBW3NlMxVVSJuzbpCtu28XPcv4Q5Fgr8fAXTYVJ3UCXUyiy72KsjeYw9SWZKCcT9hc5exrugKgy7qRC-fvpb~-~vfARELwY0ru1dKp7jg7G-aiAx7otl7nBw0MwOmiZZRAIQ~2q2HMX-g4UX8DVTFxVl~2einfKxbStajJ8092-FEAngppRgw__";

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
    await new Promise((r) => setTimeout(r, 1200));
    toast.success("You're on the list! We'll be in touch soon.");
    setEmail("");
    setIsSubmitting(false);
  };

  const scrollToWaitlist = () =>
    document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" });

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
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </div>
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
            onClick={scrollToWaitlist}
          >
            Start Free
          </Button>
        </div>
      </nav>

      {/* ========== HERO ========== */}
      <section className="relative min-h-screen flex items-center pt-16">
        <div className="absolute inset-0">
          <img src={HERO_BG} alt="" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/50 to-background" />
          <div className="absolute inset-0 grid-overlay opacity-20" />
        </div>

        <div className="container relative z-10 py-20 lg:py-32">
          <motion.div className="max-w-3xl" initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp} custom={0}>
              <span
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-primary/30 bg-primary/10 text-primary mb-8"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                NOW IN PRIVATE BETA
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.08] mb-6"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Ship AI agents your customers{" "}
              <span className="text-primary glow-cyan-text">actually trust.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mb-10"
            >
              One prompt injection can leak customer data, break compliance, and destroy
              months of trust. Prysm catches threats inside your AI before they reach
              production — so you ship with confidence, not anxiety.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3">
              <Button
                className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold glow-cyan"
                onClick={scrollToWaitlist}
              >
                Start Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                className="h-12 px-8 border-border hover:border-primary/50 hover:bg-primary/5 font-medium"
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              >
                See How It Works
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
                The Risk You Can't See
              </span>
            </motion.div>

            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-8"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Every AI agent you deploy is a{" "}
              <span style={{ color: "oklch(0.65 0.22 25)" }}>door you can't lock.</span>
            </motion.h2>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg text-muted-foreground leading-relaxed mb-16 max-w-3xl"
            >
              Your agent talks to customers, handles data, and makes decisions. But you have
              no idea what's happening inside it. A single prompt injection can make it leak
              private data, ignore your rules, or generate harmful content. And you won't know
              until a customer complains — or worse, a regulator calls.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: Clock,
                  title: "Hours lost debugging",
                  desc: "When your agent fails, you're stuck reading thousands of logs trying to figure out why. The average team spends 8+ hours diagnosing a single production incident.",
                  color: "oklch(0.82 0.16 80)",
                },
                {
                  icon: ShieldOff,
                  title: "Invisible vulnerabilities",
                  desc: "Traditional testing catches known attacks. But new prompt injections are invented daily. Your agent is exposed to threats you haven't imagined yet.",
                  color: "oklch(0.65 0.22 25)",
                },
                {
                  icon: Users,
                  title: "Eroding customer trust",
                  desc: "One bad response — a data leak, a hallucination, an offensive reply — and your users lose confidence in your entire product.",
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

      {/* ========== SOLUTION SECTION ========== */}
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
                What Changes With Prysm
              </span>
            </motion.div>

            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6 max-w-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Know what your AI is thinking —{" "}
              <span className="text-primary">before it speaks.</span>
            </motion.h2>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg text-muted-foreground leading-relaxed max-w-2xl mb-16"
            >
              Prysm sits between your agent and your users. Every prompt is analyzed in
              real-time. Dangerous patterns are flagged and blocked before they cause damage.
              You get a live view of exactly what's happening — not just what your model
              outputs, but why.
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={3}
              className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl"
            >
              {[
                {
                  icon: Moon,
                  title: "Sleep through the night",
                  desc: "Set your threat threshold once. Prysm blocks malicious prompts automatically. No more 3am alerts about your agent going rogue.",
                },
                {
                  icon: Zap,
                  title: "Debug in minutes, not days",
                  desc: "When something looks wrong, Prysm shows you exactly which internal patterns activated and why. What used to take 8 hours now takes 8 minutes.",
                },
                {
                  icon: FileCheck,
                  title: "Pass your next audit",
                  desc: "Generate compliance reports showing every prompt your agent processed, every threat it blocked, and every decision it made. EU AI Act and SOC 2 ready.",
                },
                {
                  icon: Rocket,
                  title: "Ship faster, worry less",
                  desc: "Stop delaying launches because you're afraid of what your agent might do. Prysm gives you the confidence to deploy on schedule.",
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
                Your Command Center
              </span>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6"
              style={{ fontFamily: "var(--font-display)" }}
            >
              See everything.{" "}
              <span className="text-primary">Miss nothing.</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A real-time security dashboard built for the teams who build AI. Watch threat
              scores, track what's happening inside your model, and get instant alerts — all
              in one view.
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
              <img src={DASHBOARD_IMG} alt="Prysm AI security monitoring dashboard" className="w-full h-auto" />
            </div>
            <div
              className="absolute -top-3 -right-3 px-3 py-1.5 rounded-md bg-primary/20 border border-primary/30 text-xs font-medium text-primary"
              style={{ fontFamily: "var(--font-mono)" }}
            >
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
                Get Started in 5 Minutes
              </span>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-16 max-w-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Three lines of code.{" "}
              <span className="text-primary">Total peace of mind.</span>
            </motion.h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
              {[
                {
                  step: "01",
                  icon: Terminal,
                  title: "Install",
                  desc: "pip install prysm. Add it to your existing project. No infrastructure changes, no new servers, no migration.",
                },
                {
                  step: "02",
                  icon: Link,
                  title: "Connect",
                  desc: "Wrap your agent with prysm.protect(). Works with LangChain, CrewAI, OpenAI, Claude, Llama — any framework, any model.",
                },
                {
                  step: "03",
                  icon: Coffee,
                  title: "Relax",
                  desc: "Open your dashboard. Watch threats get caught in real-time. Go back to building features instead of fighting fires.",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  custom={i + 2}
                  className="relative p-8 rounded-xl border border-border bg-card/50 backdrop-blur-sm group hover:border-primary/30 transition-colors"
                >
                  <span
                    className="text-6xl font-bold text-border/40 absolute top-4 right-6"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {item.step}
                  </span>
                  <item.icon className="w-8 h-8 text-primary mb-6" />
                  <h3 className="text-xl font-semibold mb-3" style={{ fontFamily: "var(--font-display)" }}>
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>

            <motion.div variants={fadeUp} custom={5} className="max-w-3xl mx-auto">
              <div className="rounded-xl overflow-hidden border border-border/50">
                <img src={CODE_IMG} alt="Prysm AI integration code example" className="w-full h-auto" />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ========== PRICING ========== */}
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
                Simple, Honest Pricing
              </span>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 text-center"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Start free. Scale as you grow.
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-lg text-muted-foreground max-w-xl mx-auto text-center mb-16"
            >
              No surprises. No hidden fees. Pay only for what you use.
            </motion.p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {/* Starter */}
              <motion.div variants={fadeUp} custom={3} className="p-6 rounded-xl border border-border bg-card/50">
                <h3
                  className="text-sm font-medium text-muted-foreground mb-1 tracking-widest uppercase"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Starter
                </h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Free</span>
                </div>
                <p className="text-xs text-muted-foreground mb-6">Perfect for prototypes and side projects</p>
                <ul className="space-y-2.5 mb-6">
                  {["10,000 requests/month", "1 agent", "Basic threat detection", "Community dashboard"].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  className="w-full h-10 border-border hover:border-primary/50 hover:bg-primary/5 text-sm"
                  onClick={scrollToWaitlist}
                >
                  Start Free
                </Button>
              </motion.div>

              {/* Growth */}
              <motion.div variants={fadeUp} custom={4} className="p-6 rounded-xl border border-border bg-card/50">
                <h3
                  className="text-sm font-medium text-muted-foreground mb-1 tracking-widest uppercase"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Growth
                </h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>$49</span>
                  <span className="text-muted-foreground text-sm">/mo</span>
                </div>
                <p className="text-xs text-muted-foreground mb-6">For teams shipping their first AI product</p>
                <ul className="space-y-2.5 mb-6">
                  {[
                    "50,000 requests/month",
                    "Up to 5 agents",
                    "Advanced threat detection",
                    "Slack & email alerts",
                    "30-day history",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  className="w-full h-10 border-border hover:border-primary/50 hover:bg-primary/5 text-sm"
                  onClick={scrollToWaitlist}
                >
                  Start Free Trial
                </Button>
              </motion.div>

              {/* Pro — Recommended */}
              <motion.div
                variants={fadeUp}
                custom={5}
                className="p-6 rounded-xl border border-primary/30 bg-primary/5 relative"
              >
                <div
                  className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-primary text-primary-foreground"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  POPULAR
                </div>
                <h3
                  className="text-sm font-medium text-primary mb-1 tracking-widest uppercase"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Pro
                </h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>$199</span>
                  <span className="text-muted-foreground text-sm">/mo</span>
                </div>
                <p className="text-xs text-muted-foreground mb-6">For teams running AI in production</p>
                <ul className="space-y-2.5 mb-6">
                  {[
                    "200,000 requests/month",
                    "Unlimited agents",
                    "Deep model inspection",
                    "Real-time feature dashboard",
                    "90-day history",
                    "Priority support",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan text-sm font-semibold"
                  onClick={scrollToWaitlist}
                >
                  Start Free Trial
                </Button>
              </motion.div>

              {/* Enterprise */}
              <motion.div variants={fadeUp} custom={6} className="p-6 rounded-xl border border-border bg-card/50">
                <h3
                  className="text-sm font-medium text-muted-foreground mb-1 tracking-widest uppercase"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Enterprise
                </h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Let's Talk</span>
                </div>
                <p className="text-xs text-muted-foreground mb-6">For regulated industries and large deployments</p>
                <ul className="space-y-2.5 mb-6">
                  {[
                    "Custom volume",
                    "Self-hosted deployment",
                    "SSO & role-based access",
                    "SIEM integration",
                    "Dedicated support",
                    "Custom SLA",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  className="w-full h-10 border-border hover:border-primary/50 hover:bg-primary/5 text-sm"
                  onClick={scrollToWaitlist}
                >
                  Contact Sales
                </Button>
              </motion.div>
            </div>
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
              Your AI is only as trusted as your ability to{" "}
              <span className="text-primary glow-cyan-text">explain it.</span>
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-lg text-muted-foreground mb-10">
              Join the teams building AI their customers can rely on.
              Start protecting your agents in under 5 minutes.
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
                {isSubmitting ? "Joining..." : "Start Free"}
              </Button>
            </motion.form>

            <motion.p variants={fadeUp} custom={3} className="text-xs text-muted-foreground mt-4">
              No credit card required. Free forever on the Starter plan.
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
              &copy; {new Date().getFullYear()} Prysm AI. Ship AI your customers trust.
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
