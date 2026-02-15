import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, Calendar, Clock, User } from "lucide-react";
import { Link } from "wouter";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1 },
  }),
};

// Blog article data
const ARTICLE = {
  title: "Stop Flying Blind: Why We Need to See Inside Our AI Agents",
  author: "Osarenren N.",
  date: "February 15, 2026",
  readTime: "8 min read",
  slug: "stop-flying-blind",
};

export default function Blog() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-xl bg-background/80">
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <span className="text-lg font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                Prysm<span className="text-primary">AI</span>
              </span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link href="/blog" className="text-foreground font-medium">Blog</Link>
          </div>
          <Link href="/">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
              Join Waitlist
            </Button>
          </Link>
        </div>
      </nav>

      {/* Article */}
      <article className="pt-28 pb-24">
        <div className="container max-w-3xl">
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
            {/* Back link */}
            <motion.div variants={fadeUp} custom={0} className="mb-8">
              <Link href="/blog">
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Blog
                </span>
              </Link>
            </motion.div>

            {/* Header */}
            <motion.div variants={fadeUp} custom={1} className="mb-4">
              <span
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border border-primary/30 bg-primary/10 text-primary"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                AI SECURITY
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={2}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-6"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {ARTICLE.title}
            </motion.h1>

            <motion.div variants={fadeUp} custom={3} className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-12 pb-8 border-b border-border/50">
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                {ARTICLE.author}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {ARTICLE.date}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {ARTICLE.readTime}
              </span>
            </motion.div>

            {/* Article body */}
            <motion.div variants={fadeUp} custom={4} className="prose prose-invert prose-lg max-w-none">
              <p className="text-lg text-muted-foreground leading-relaxed">
                The age of autonomous AI agents is no longer a distant vision; it is a production reality. Across industries, companies are deploying agents to handle everything from customer support to complex financial analysis. The AI agent market is projected to surge from $7.6 billion in 2025 to over $50 billion by 2030, and Gartner predicts that 40% of all enterprise applications will integrate task-specific AI agents by the end of this year.
              </p>

              <p className="text-lg text-muted-foreground leading-relaxed">
                This is a monumental platform shift. Yet, for all their power, we are building this new world on a foundation of sand. We are deploying systems that we fundamentally do not understand, creating a new and dangerous class of security and reliability risks. When an AI agent fails, the teams who built it are left flying blind, sifting through mountains of logs to guess at the cause. This is not just inefficient; it is unsustainable.
              </p>

              <h2 className="text-2xl font-bold mt-12 mb-4 text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                The Black Box Problem in Production
              </h2>

              <p className="text-muted-foreground leading-relaxed">
                The core of the issue is that most AI agents are treated as black boxes. We see the input (the prompt) and the output (the response), but the process in between is an opaque mystery. This leads to a host of critical failure modes that current observability tools are ill-equipped to handle.
              </p>

              <p className="text-muted-foreground leading-relaxed">
                Research from firms like Galileo AI has categorized the top 10 ways agents fail in production, including hallucination cascades, tool invocation misfires, and data leakage. The number one vulnerability for LLM applications, according to the OWASP Top 10, is prompt injection, which appears in a staggering 73% of production AI systems.
              </p>

              <p className="text-muted-foreground leading-relaxed">
                When these failures occur, the post-mortem is a painful, manual process. Engineers are forced to become digital detectives, piecing together clues from traces and logs. They might be able to determine <em>what</em> happened, but they can rarely determine <em>why</em> it happened at the model level. The result is a series of brittle, reactive patches that fix one symptom while leaving the root cause untouched.
              </p>

              <h2 className="text-2xl font-bold mt-12 mb-4 text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                The Architecture of Modern Agents
              </h2>

              <p className="text-muted-foreground leading-relaxed">
                This problem is compounded by the way we build agents today. The dominant architecture relies on a stack of specialized components, orchestrated by powerful frameworks.
              </p>

              {/* Architecture table */}
              <div className="my-8 rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-card/50">
                      <th className="text-left px-4 py-3 font-semibold text-foreground border-b border-border">Component</th>
                      <th className="text-left px-4 py-3 font-semibold text-foreground border-b border-border">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Application Layer", "The user-facing interface (e.g., a Next.js web app)."],
                      ["Agent Framework", "The core logic orchestrator (e.g., LangGraph, CrewAI)."],
                      ["LLM Provider", "The reasoning engine (e.g., OpenAI API, self-hosted Llama 3)."],
                      ["Supporting Services", "Tools, memory, and traditional observability platforms."],
                    ].map(([comp, desc], i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-3 font-medium text-primary" style={{ fontFamily: "var(--font-mono)" }}>{comp}</td>
                        <td className="px-4 py-3 text-muted-foreground">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-muted-foreground leading-relaxed">
                This modularity is powerful, but it also adds layers of abstraction that obscure the model's inner workings. The most critical component, the LLM itself, remains a mystery.
              </p>

              <h2 className="text-2xl font-bold mt-12 mb-4 text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                A New Path Forward: Mechanistic Interpretability
              </h2>

              <p className="text-muted-foreground leading-relaxed">
                What if we could stop guessing? What if we could see the threat forming inside the model's mind <em>before</em> it leads to a failure? This is the promise of <strong className="text-foreground">mechanistic interpretability (MI)</strong>, a rapidly advancing field of AI research that aims to reverse-engineer the internal mechanisms of neural networks.
              </p>

              <p className="text-muted-foreground leading-relaxed">
                As I explored in my book, <em>The Spirit of Complexity</em>, true understanding of any complex system — whether a child learning in a classroom or a neural network processing a prompt — comes not from measuring its outputs, but from observing the patterns of its internal state. The book's fictional "Spirit Framework" was designed to visualize how a student's mind formed connections, recognizing unique learning patterns in their natural state.
              </p>

              <p className="text-muted-foreground leading-relaxed">
                We can apply this same philosophy to AI agents. Recent academic work has proven that MI can be used to identify the specific internal "features" within a model that correspond to dangerous behaviors like generating malicious code or ignoring instructions. If we can identify these features, we can monitor them in real-time.
              </p>

              <div className="my-8 p-6 rounded-lg border border-primary/20 bg-primary/5">
                <p className="text-foreground leading-relaxed italic">
                  Imagine a security dashboard that doesn't just show you logs, but a live heatmap of your agent's internal activations. Imagine seeing a spike in the "deception" feature the moment a user attempts a prompt injection, and automatically blocking the response before it's ever generated. This is not science fiction; this is the next generation of AI security.
                </p>
              </div>

              <h2 className="text-2xl font-bold mt-12 mb-4 text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                Introducing Prysm AI: Seeing Through Your AI
              </h2>

              <p className="text-muted-foreground leading-relaxed">
                This is the mission we are embarking on with <strong className="text-foreground">Prysm AI</strong>. Our goal is to build the tools that finally move us from reactive, black-box monitoring to proactive, white-box security. Just as a prism splits a beam of light to reveal the full spectrum of colors hidden within, Prysm AI is designed to split an agent's behavior into its constituent parts, making the invisible visible.
              </p>

              <p className="text-muted-foreground leading-relaxed">
                We are building a new type of security tool — a middleware that plugs directly into agent frameworks like LangChain and provides real-time insight into the model's internal state. We believe this is the only way to build a future where we can trust the intelligent systems we are so rapidly deploying.
              </p>

              <p className="text-muted-foreground leading-relaxed">
                The journey is just beginning. If you are an engineer, researcher, or leader building with AI agents and find yourself flying blind, we invite you to join us.
              </p>

              {/* References */}
              <div className="mt-12 pt-8 border-t border-border/50">
                <h3 className="text-lg font-semibold mb-4 text-foreground" style={{ fontFamily: "var(--font-display)" }}>References</h3>
                <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                  <li>Forbes. (2025). <em>AI Agent Market Size And Forecast</em>.</li>
                  <li>Gartner, Inc. (2026). <em>Top Strategic Technology Trends 2026</em>.</li>
                  <li>Galileo AI. (2026, February 10). <em>Debugging AI Agents: The 10 Most Common Failure Modes</em>.</li>
                  <li>OWASP Foundation. (2025). <em>OWASP Top 10 for Large Language Model Applications</em>.</li>
                  <li>Garcia-Carrasco, J., & Ortiz-Garcia, E. G. (2024). <em>Using Mechanistic Interpretability to Detect and Understand Vulnerabilities in LLMs</em>. IJCAI.</li>
                </ol>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </article>

      {/* CTA */}
      <section className="py-16 border-t border-border/50">
        <div className="container max-w-3xl text-center">
          <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Ready to see inside your AI?
          </h2>
          <p className="text-muted-foreground mb-6">
            Join the builders who go deeper. Get early access to Prysm AI.
          </p>
          <Link href="/">
            <Button className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold glow-cyan">
              Join the Waitlist
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
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
