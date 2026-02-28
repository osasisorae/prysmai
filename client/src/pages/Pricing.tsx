/*
 * PRYSM AI PRICING PAGE
 * Design: Consistent with landing page — dark theme, cyan + neutral, Inter font
 * Tiers: Free, Pro ($39/mo), Team ($149/mo), Enterprise (custom)
 * Pattern: Shared navbar/footer with Home.tsx
 * Stripe: Pro and Team buttons trigger Stripe Checkout for logged-in users
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Check,
  ArrowRight,
  Zap,
  Building2,
  Users,
  Rocket,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { EarlyAccessModal } from "@/components/EarlyAccessModal";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const LOGO_URL =
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663306080277/pKkWElgCpRmlNvjQ.png";

/* ─── Tier data ─── */

interface Tier {
  name: string;
  planKey: string; // maps to Stripe plan key
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
    planKey: "free",
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
    planKey: "pro",
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
    planKey: "team",
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
    planKey: "enterprise",
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

/* ─── Comparison table ─── */

interface ComparisonRow {
  feature: string;
  free: string;
  pro: string;
  team: string;
  enterprise: string;
}

const comparisonRows: ComparisonRow[] = [
  { feature: "Traced requests / month", free: "5,000", pro: "50,000", team: "250,000", enterprise: "Unlimited" },
  { feature: "Data retention", free: "7 days", pro: "30 days", team: "90 days", enterprise: "Custom" },
  { feature: "Projects", free: "1", pro: "3", team: "Unlimited", enterprise: "Unlimited" },
  { feature: "Team members", free: "1", pro: "1", team: "10", enterprise: "Unlimited" },
  { feature: "Security scanning", free: "Rule-based", pro: "Deep LLM", team: "Deep LLM", enterprise: "Custom" },
  { feature: "Explainability", free: "Basic", pro: "Full", team: "Full", enterprise: "Full + Custom" },
  { feature: "API access", free: "Read-only", pro: "Full", team: "Full + Webhooks", enterprise: "Full + Custom" },
  { feature: "Support", free: "Community", pro: "Email", team: "Priority", enterprise: "Dedicated" },
  { feature: "Overage rate (per 10K)", free: "—", pro: "$5", team: "$4", enterprise: "Custom" },
];

/* ─── Component ─── */

export default function Pricing() {
  const [earlyAccessOpen, setEarlyAccessOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [upgradeConfirm, setUpgradeConfirm] = useState<{ from: string; to: Tier } | null>(null);
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  // Fetch current plan if authenticated
  const planQuery = trpc.billing.getPlan.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000,
    retry: false,
  });
  const currentPlan = planQuery.data?.plan || "free";

  const createCheckout = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      toast.info("Redirecting to checkout...");
      window.open(data.url, "_blank");
      setCheckoutLoading(null);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create checkout session");
      setCheckoutLoading(null);
    },
  });

  const handleTierClick = (tier: Tier) => {
    if (tier.planKey === "enterprise") {
      window.location.href = "mailto:hello@prysmai.io?subject=Enterprise%20Inquiry";
      return;
    }

    if (tier.planKey === "free") {
      if (isAuthenticated) {
        navigate("/dashboard");
      } else {
        setEarlyAccessOpen(true);
      }
      return;
    }

    // Pro or Team — need to be logged in
    if (!isAuthenticated) {
      toast.info("Please sign up first, then upgrade from your dashboard.");
      setEarlyAccessOpen(true);
      return;
    }

    // Already on this plan
    if (currentPlan === tier.planKey) {
      toast.info(`You're already on the ${tier.name} plan.`);
      return;
    }

    // Downgrade attempt (e.g., Team → Pro)
    const planOrder = ["free", "pro", "team", "enterprise"];
    if (planOrder.indexOf(tier.planKey) < planOrder.indexOf(currentPlan)) {
      toast.info("To downgrade, go to Billing in your dashboard.");
      return;
    }

    // Upgrading from a paid plan — show confirmation
    if (currentPlan !== "free") {
      setUpgradeConfirm({ from: currentPlan, to: tier });
      return;
    }

    setCheckoutLoading(tier.planKey);
    createCheckout.mutate({ plan: tier.planKey as "pro" | "team" });
  };

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
            onClick={() => {
              if (isAuthenticated) {
                navigate("/dashboard");
              } else {
                setEarlyAccessOpen(true);
              }
            }}
          >
            {isAuthenticated ? "Dashboard" : "Get Early Access"}
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
                {isAuthenticated && currentPlan === tier.planKey && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/90 text-white">
                      Current Plan
                    </span>
                  </div>
                )}
                {(!isAuthenticated || currentPlan !== tier.planKey) && tier.badge && (
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
                    isAuthenticated && currentPlan === tier.planKey
                      ? "bg-green-500/10 text-green-400 border border-green-500/30 cursor-default"
                      : tier.highlighted
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-secondary/50 text-foreground hover:bg-secondary/80 border border-border/50"
                  }`}
                  onClick={() => handleTierClick(tier)}
                  disabled={checkoutLoading === tier.planKey || (isAuthenticated && currentPlan === tier.planKey)}
                >
                  {checkoutLoading === tier.planKey ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Redirecting...
                    </>
                  ) : isAuthenticated && currentPlan === tier.planKey ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Your Current Plan
                    </>
                  ) : (
                    <>
                      {tier.cta}
                      {tier.planKey !== "enterprise" && (
                        <ArrowRight className="w-4 h-4 ml-2" />
                      )}
                    </>
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
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-4">
            Compare plans
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
            Every plan includes the core proxy, dashboard, and SDK. Here's what
            changes as you scale.
          </p>

          <div className="max-w-5xl mx-auto overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left py-4 pr-6 text-muted-foreground font-medium w-[200px]">
                    Feature
                  </th>
                  <th className="text-center py-4 px-4 text-muted-foreground font-medium">
                    Free
                  </th>
                  <th className="text-center py-4 px-4 font-medium text-primary">
                    Pro
                  </th>
                  <th className="text-center py-4 px-4 text-muted-foreground font-medium">
                    Team
                  </th>
                  <th className="text-center py-4 px-4 text-muted-foreground font-medium">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/20 last:border-0"
                  >
                    <td className="py-3.5 pr-6 text-muted-foreground">
                      {row.feature}
                    </td>
                    <td className="py-3.5 px-4 text-center text-muted-foreground/80">
                      {row.free}
                    </td>
                    <td className="py-3.5 px-4 text-center text-foreground font-medium">
                      {row.pro}
                    </td>
                    <td className="py-3.5 px-4 text-center text-muted-foreground/80">
                      {row.team}
                    </td>
                    <td className="py-3.5 px-4 text-center text-muted-foreground/80">
                      {row.enterprise}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ========== FAQ ========== */}
      <section className="pb-28 lg:pb-40">
        <div className="container">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-4">
            Frequently asked questions
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
            Everything you need to know about PrysmAI pricing.
          </p>

          <div className="max-w-2xl mx-auto space-y-2">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="border border-border/30 rounded-lg overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-card/30 transition-colors"
                  onClick={() =>
                    setExpandedFaq(expandedFaq === i ? null : i)
                  }
                >
                  <span className="text-sm font-medium pr-4">{faq.q}</span>
                  <HelpCircle
                    className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${
                      expandedFaq === i ? "rotate-45" : ""
                    }`}
                  />
                </button>
                {expandedFaq === i && (
                  <div className="px-6 pb-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== BOTTOM CTA ========== */}
      <section className="pb-28 lg:pb-40">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Ready to see inside your AI?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Start with the free plan. No credit card required. Upgrade when
              your AI is ready for production.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                onClick={() => {
                  if (isAuthenticated) {
                    navigate("/dashboard");
                  } else {
                    setEarlyAccessOpen(true);
                  }
                }}
              >
                {isAuthenticated ? "Go to Dashboard" : "Get Started Free"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                className="h-12 px-8 border-border hover:border-primary/50 hover:bg-primary/5 font-medium"
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
      <footer className="border-t border-border/30 py-12">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src={LOGO_URL} alt="Prysm AI" className="w-6 h-6" />
            <span className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Prysm AI. All rights reserved.
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="/docs" className="hover:text-foreground transition-colors">
              Docs
            </a>
            <a href="/blog" className="hover:text-foreground transition-colors">
              Blog
            </a>
            <a
              href="mailto:hello@prysmai.io"
              className="hover:text-foreground transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>

      {/* ========== UPGRADE CONFIRMATION DIALOG ========== */}
      <Dialog open={!!upgradeConfirm} onOpenChange={(open) => !open && setUpgradeConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upgrade to {upgradeConfirm?.to.name}?</DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <p>
                You're currently on the <span className="font-medium text-foreground capitalize">{upgradeConfirm?.from}</span> plan.
                Upgrading to <span className="font-medium text-foreground">{upgradeConfirm?.to.name}</span> ({upgradeConfirm?.to.price}{upgradeConfirm?.to.period}) takes effect immediately.
              </p>
              <p>
                Stripe will automatically <span className="font-medium text-foreground">prorate</span> your existing subscription — you'll receive credit for the unused portion of your current billing period toward the new plan.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setUpgradeConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={checkoutLoading !== null}
              onClick={() => {
                if (!upgradeConfirm) return;
                setCheckoutLoading(upgradeConfirm.to.planKey);
                createCheckout.mutate({ plan: upgradeConfirm.to.planKey as "pro" | "team" });
                setUpgradeConfirm(null);
              }}
            >
              {checkoutLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
              ) : (
                <>Confirm Upgrade<ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== EARLY ACCESS MODAL ========== */}
      <EarlyAccessModal
        open={earlyAccessOpen}
        onOpenChange={setEarlyAccessOpen}
      />
    </div>
  );
}
