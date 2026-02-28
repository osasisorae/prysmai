/**
 * Stripe Products & Prices Configuration
 * Defines the PrysmAI subscription plans and their Stripe price IDs.
 * Price IDs are created dynamically on first use if they don't exist.
 */

export interface PlanConfig {
  name: string;
  description: string;
  priceMonthly: number; // in cents
  features: string[];
  requestLimit: number;
  dataRetentionDays: number;
  maxProjects: number;
  maxTeamMembers: number;
  overagePer10k: number; // in cents, 0 = no overage
}

export const PLANS: Record<string, PlanConfig> = {
  free: {
    name: "Free",
    description: "For developers exploring AI observability",
    priceMonthly: 0,
    features: [
      "5,000 traced requests / month",
      "7-day data retention",
      "1 project",
      "Rule-based security scanning",
      "Basic confidence scores",
    ],
    requestLimit: 5_000,
    dataRetentionDays: 7,
    maxProjects: 1,
    maxTeamMembers: 1,
    overagePer10k: 0,
  },
  pro: {
    name: "Pro",
    description: "For builders shipping AI to production",
    priceMonthly: 3900, // $39.00
    features: [
      "50,000 traced requests / month",
      "30-day data retention",
      "3 projects",
      "Deep LLM security analysis",
      "Full explainability suite",
    ],
    requestLimit: 50_000,
    dataRetentionDays: 30,
    maxProjects: 3,
    maxTeamMembers: 1,
    overagePer10k: 500, // $5.00 per 10K
  },
  team: {
    name: "Team",
    description: "For teams building production AI systems",
    priceMonthly: 14900, // $149.00
    features: [
      "250,000 traced requests / month",
      "90-day data retention",
      "Unlimited projects",
      "Up to 10 team members",
      "Priority support",
    ],
    requestLimit: 250_000,
    dataRetentionDays: 90,
    maxProjects: -1, // unlimited
    maxTeamMembers: 10,
    overagePer10k: 400, // $4.00 per 10K
  },
  enterprise: {
    name: "Enterprise",
    description: "Custom plans for organizations at scale",
    priceMonthly: 0, // custom pricing
    features: [
      "Unlimited traced requests",
      "Custom data retention",
      "Unlimited projects & members",
      "Dedicated support & SLA",
    ],
    requestLimit: -1,
    dataRetentionDays: -1,
    maxProjects: -1,
    maxTeamMembers: -1,
    overagePer10k: 0,
  },
};

/**
 * Cache for Stripe Price IDs — populated at runtime after creating products/prices
 */
export const stripePriceIds: Record<string, string> = {};
