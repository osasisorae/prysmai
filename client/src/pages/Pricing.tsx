/*
 * PRYSM AI PRICING PAGE
 * Design: Consistent with landing page — dark theme, cyan + neutral, Inter font
 * Tiers: Free, Pro ($39/mo), Team ($149/mo), Enterprise (custom)
 * Pattern: Shared navbar/footer with Home.tsx
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Check,
  ArrowRight,
  Zap,
  Building2,
  Users,
  Rocket,
  HelpCircle,
} from "lucide-react";
import { EarlyAccessModal } from "@/components/EarlyAccessModal";

const LOGO_URL =
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663306080277/pKkWElgCpRmlNvjQ.png";

/* ─── Tier data ─── */

interface Tier {
  name: string;
  price: string;
  period: string;
  description: string;
  icon: React.ElementType;
  features: string[];
  cta: string;
  highlighted?: boolean;
  badge?: string;
}

const tiers: Tier[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description:
      "For developers exploring AI observability. Get started with core tracing and rule-based security scanning.",
    icon: Zap,
    features: [
      "5,000 traced requests / month",
      "7-day data retention",
      "1 project",
      "Rule-based security scanning",
      "Basic confidence scores",
      "Community support (GitHub)",
      "Read-only API access",
    ],
    cta: "Get Started Free",
  },
  {
    name: "Pro",
    price: "$39",
    period: "/ month",
    description:
      "For builders shipping AI to production. Full security scanning, explainability, and extended retention.",
    icon: Rocket,
    features: [
      "50,000 traced requests / month",
      "$5 per additional 10K requests",
      "30-day data retention",
      "3 projects",
      "Deep LLM security analysis",
      "Full attention visualization",
      "Explainability reports",
      "Email support",
      "Full API access",
    ],
    cta: "Start Pro",
    highlighted: true,
    badge: "Most Popular",
  },
  {
    name: "Team",
    price: "$149",
    period: "/ month",
    description:
      "For teams building production AI systems. Shared workspace, longer retention, and priority support.",
    icon: Users,
    features: [
      "250,000 traced requests / month",
      "$4 per additional 10K requests",
      "90-day data retention",
      "Unlimited projects",
      "Up to 10 team members",
      "Deep LLM security analysis",
      "Full explainability suite",
      "Team workspace & sharing",
      "Priority email support",
      "Full API + webhooks",
    ],
    cta: "Start Team",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description:
      "For organizations with advanced security, compliance, and scale requirements. Dedicated support and SLAs.",
    icon: Building2,
    features: [
      "Unlimited traced requests",
      "Custom data retention",
      "Unlimited projects & members",
      "Custom security policies",
      "SOC-2 & compliance reports",
      "SSO / SAML integration",
      "Dedicated account manager",
      "Onboarding & training",
      "SLA guarantees",
      "On-premise deployment option",
    ],
    cta: "Contact Us",
  },
];

/* ─── FAQ data ─── */

interface FAQ {
  q: string;
  a: string;
}

const faqs: FAQ[] = [
  {
    q: "What counts as a traced request?",
    a: "Every LLM API call that passes through the Prysm proxy counts as one traced request. This includes both streaming and non-streaming requests. Requests that are blocked by security scanning still count toward your limit.",
  },
  {
    q: "What happens when I hit my request limit?",
    a: "On the Free plan, tracing pauses until the next billing cycle — your AI app continues to work, but new requests won't be logged. On Pro and Team plans, additional requests are billed at the overage rate automatically.",
  },
  {
    q: "Can I switch plans at any time?",
    a: "Yes. Upgrades take effect immediately and you'll be charged a prorated amount. Downgrades take effect at the start of your next billing cycle.",
  },
  {
    q: "What's the difference between rule-based and deep LLM security scanning?",
    a: "Rule-based scanning uses pattern matching to detect known prompt injection and jailbreak patterns — it's fast and covers the most common attacks. Deep LLM analysis uses a secondary model to evaluate suspicious prompts for novel or sophisticated attack vectors that pattern matching would miss.",
  },
  {
    q: "Do you offer a startup discount?",
    a: "Yes. If your company is under 2 years old and has raised less than $5M in funding, we offer 30% off your first year on any paid plan. Email us at hello@prysmai.io with your company details.",
  },
  {
    q: "Is there a self-hosted option?",
    a: "Enterprise plans include the option for on-premise deployment. Contact us to discuss your infrastructure requirements.",
  },
];

/* ─── Component ─── */

export default function Pricing() {
  const [earlyAccessOpen, setEarlyAccessOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ========== NAVBAR ========== */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 backdrop-blur-xl bg-background/80">
        <div className="container flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2.5">
            <img src={LOGO_URL} alt="Prysm AI" className="w-8 h-8" />
            <span className="text-lg font-semibold tracking-tight">
              Prysm<span className="text-primary">AI</span>
            </span>
          </a>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="/#problem" className="hover:text-foreground transition-colors">
              Why Prysm
            </a>
            <a href="/#solution" className="hover:text-foreground transition-colors">
              Product
            </a>
            <a
              href="/pricing"
              className="text-foreground font-medium"
            >
              Pricing
            </a>
            <a href="/docs" className="hover:text-foreground transition-colors">
              Docs
            </a>
            <a href="/blog" className="hover:text-foreground transition-colors">
              Blog
            </a>
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
      <section className="pt-32 pb-16 lg:pt-44 lg:pb-24">
        <div className="container text-center">
          <p className="text-sm font-medium text-primary tracking-wide mb-6">
            Simple, transparent pricing
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6 max-w-3xl mx-auto">
            See inside your AI.{" "}
            <span className="text-primary">Pay only for what you use.</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Start free with 5,000 traced requests per month. Upgrade when you're
            ready for production-grade security scanning and explainability.
          </p>
        </div>
      </section>

      {/* ========== PRICING TIERS ========== */}
      <section className="pb-28 lg:pb-40">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative flex flex-col rounded-xl border p-8 ${
                  tier.highlighted
                    ? "border-primary/40 bg-primary/[0.04]"
                    : "border-border/50 bg-card/30"
                }`}
              >
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                      {tier.badge}
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <tier.icon
                    className={`w-6 h-6 mb-4 ${
                      tier.highlighted ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <h3 className="text-xl font-bold tracking-tight mb-1">
                    {tier.name}
                  </h3>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-3xl font-bold tracking-tight">
                      {tier.price}
                    </span>
                    {tier.period && (
                      <span className="text-sm text-muted-foreground">
                        {tier.period}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {tier.description}
                  </p>
                </div>

                <div className="flex-1 mb-8">
                  <div className="space-y-3">
                    {tier.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Check
                          className={`w-4 h-4 mt-0.5 shrink-0 ${
                            tier.highlighted
                              ? "text-primary"
                              : "text-muted-foreground/60"
                          }`}
                        />
                        <span className="text-sm text-muted-foreground">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  className={`w-full h-11 font-medium ${
                    tier.highlighted
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-secondary/50 text-foreground hover:bg-secondary/80 border border-border/50"
                  }`}
                  onClick={() => {
                    if (tier.name === "Enterprise") {
                      window.location.href = "mailto:hello@prysmai.io?subject=Enterprise%20Inquiry";
                    } else {
                      setEarlyAccessOpen(true);
                    }
                  }}
                >
                  {tier.cta}
                  {tier.name !== "Enterprise" && (
                    <ArrowRight className="w-4 h-4 ml-2" />
                  )}
                </Button>
              </div>
            ))}
          </div>

          {/* Founding member callout */}
          <div className="mt-12 max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/[0.04]">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">Founding Members</span>{" "}
                — First 25 paying users get 30% off for life.{" "}
                <span className="text-primary">Spots remaining.</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========== COMPARISON TABLE ========== */}
      <section className="pb-28 lg:pb-40">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-12 text-center">
              Compare plans
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-4 pr-4 font-medium text-muted-foreground w-[200px]">
                      Feature
                    </th>
                    <th className="text-center py-4 px-4 font-semibold">Free</th>
                    <th className="text-center py-4 px-4 font-semibold text-primary">
                      Pro
                    </th>
                    <th className="text-center py-4 px-4 font-semibold">Team</th>
                    <th className="text-center py-4 px-4 font-semibold">
                      Enterprise
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      feature: "Traced requests / mo",
                      free: "5,000",
                      pro: "50,000",
                      team: "250,000",
                      enterprise: "Unlimited",
                    },
                    {
                      feature: "Data retention",
                      free: "7 days",
                      pro: "30 days",
                      team: "90 days",
                      enterprise: "Custom",
                    },
                    {
                      feature: "Projects",
                      free: "1",
                      pro: "3",
                      team: "Unlimited",
                      enterprise: "Unlimited",
                    },
                    {
                      feature: "Team members",
                      free: "1",
                      pro: "1",
                      team: "Up to 10",
                      enterprise: "Unlimited",
                    },
                    {
                      feature: "Security scanning",
                      free: "Rule-based",
                      pro: "Rule + LLM",
                      team: "Rule + LLM",
                      enterprise: "Custom policies",
                    },
                    {
                      feature: "Explainability",
                      free: "Basic scores",
                      pro: "Full suite",
                      team: "Full suite",
                      enterprise: "Full suite",
                    },
                    {
                      feature: "API access",
                      free: "Read-only",
                      pro: "Full",
                      team: "Full + webhooks",
                      enterprise: "Full + webhooks",
                    },
                    {
                      feature: "Support",
                      free: "Community",
                      pro: "Email",
                      team: "Priority email",
                      enterprise: "Dedicated",
                    },
                    {
                      feature: "SSO / SAML",
                      free: "—",
                      pro: "—",
                      team: "—",
                      enterprise: "✓",
                    },
                    {
                      feature: "On-premise",
                      free: "—",
                      pro: "—",
                      team: "—",
                      enterprise: "✓",
                    },
                    {
                      feature: "SLA",
                      free: "—",
                      pro: "—",
                      team: "—",
                      enterprise: "✓",
                    },
                  ].map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/20 last:border-0"
                    >
                      <td className="py-3.5 pr-4 text-muted-foreground font-medium">
                        {row.feature}
                      </td>
                      <td className="py-3.5 px-4 text-center text-muted-foreground">
                        {row.free}
                      </td>
                      <td className="py-3.5 px-4 text-center text-foreground">
                        {row.pro}
                      </td>
                      <td className="py-3.5 px-4 text-center text-muted-foreground">
                        {row.team}
                      </td>
                      <td className="py-3.5 px-4 text-center text-muted-foreground">
                        {row.enterprise}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FAQ ========== */}
      <section className="pb-28 lg:pb-40">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-12">
              <HelpCircle className="w-5 h-5 text-primary" />
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Frequently asked questions
              </h2>
            </div>

            <div className="space-y-0">
              {faqs.map((faq, i) => (
                <div key={i} className="border-b border-border/30">
                  <button
                    className="w-full text-left py-5 flex items-start justify-between gap-4"
                    onClick={() =>
                      setExpandedFaq(expandedFaq === i ? null : i)
                    }
                  >
                    <span className="font-medium text-foreground">
                      {faq.q}
                    </span>
                    <span
                      className={`text-muted-foreground text-lg leading-none shrink-0 transition-transform duration-200 ${
                        expandedFaq === i ? "rotate-45" : ""
                      }`}
                    >
                      +
                    </span>
                  </button>
                  {expandedFaq === i && (
                    <p className="pb-5 text-sm text-muted-foreground leading-relaxed -mt-1">
                      {faq.a}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== FINAL CTA ========== */}
      <section className="py-28 lg:py-40 border-t border-border/30">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">
              Start seeing inside your AI.{" "}
              <span className="text-primary">Today.</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-10">
              5,000 free traced requests per month. No credit card required.
              Upgrade when you're ready.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
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
                onClick={() =>
                  (window.location.href =
                    "mailto:hello@prysmai.io?subject=Enterprise%20Inquiry")
                }
              >
                Talk to Sales
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="border-t border-border py-16">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <a href="/" className="flex items-center gap-2.5">
              <img src={LOGO_URL} alt="Prysm AI" className="w-7 h-7" />
              <span className="text-sm font-semibold">
                Prysm<span className="text-primary">AI</span>
              </span>
            </a>
            <p className="text-xs text-muted-foreground">
              Built for builders who go deeper.
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
