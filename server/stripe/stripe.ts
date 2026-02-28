import Stripe from "stripe";
import { ENV } from "../_core/env";
import { PLANS, stripePriceIds } from "./products";

let _stripe: Stripe | null = null;

/**
 * Get the Stripe client instance (lazy initialization).
 * Avoids crash at import time when STRIPE_SECRET_KEY is not yet set.
 */
export function getStripe(): Stripe {
  if (!_stripe) {
    if (!ENV.stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    _stripe = new Stripe(ENV.stripeSecretKey);
  }
  return _stripe;
}

// Backward-compat export
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as any)[prop];
  },
});

/**
 * Ensure a Stripe product and price exist for a given plan.
 * Creates them if they don't exist, caches the price ID.
 */
export async function ensurePriceForPlan(planKey: string): Promise<string> {
  // Return cached price ID if available
  if (stripePriceIds[planKey]) {
    return stripePriceIds[planKey];
  }

  const plan = PLANS[planKey];
  if (!plan || plan.priceMonthly === 0) {
    throw new Error(`Plan "${planKey}" is not a paid plan`);
  }

  // Search for existing product by metadata
  const existingProducts = await stripe.products.search({
    query: `metadata["prysm_plan"]:"${planKey}"`,
  });

  let productId: string;

  if (existingProducts.data.length > 0) {
    productId = existingProducts.data[0].id;
  } else {
    // Create the product
    const product = await stripe.products.create({
      name: `PrysmAI ${plan.name}`,
      description: plan.description,
      metadata: { prysm_plan: planKey },
    });
    productId = product.id;
  }

  // Search for existing price on this product
  const existingPrices = await stripe.prices.list({
    product: productId,
    active: true,
    type: "recurring",
  });

  const matchingPrice = existingPrices.data.find(
    (p) =>
      p.unit_amount === plan.priceMonthly &&
      p.recurring?.interval === "month"
  );

  if (matchingPrice) {
    stripePriceIds[planKey] = matchingPrice.id;
    return matchingPrice.id;
  }

  // Create the price
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: plan.priceMonthly,
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { prysm_plan: planKey },
  });

  stripePriceIds[planKey] = price.id;
  return price.id;
}

/**
 * Create a Stripe Checkout Session for a subscription plan.
 */
export async function createCheckoutSession(opts: {
  planKey: string;
  userId: number;
  userEmail: string;
  userName?: string;
  orgId: number;
  origin: string;
}): Promise<string> {
  const { planKey, userId, userEmail, userName, orgId, origin } = opts;

  const priceId = await ensurePriceForPlan(planKey);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: userEmail,
    client_reference_id: userId.toString(),
    metadata: {
      user_id: userId.toString(),
      org_id: orgId.toString(),
      customer_email: userEmail,
      customer_name: userName || "",
      plan: planKey,
    },
    allow_promotion_codes: true,
    success_url: `${origin}/dashboard?checkout=success&plan=${planKey}`,
    cancel_url: `${origin}/pricing?checkout=cancelled`,
  });

  if (!session.url) {
    throw new Error("Failed to create checkout session URL");
  }

  return session.url;
}

/**
 * Create a Stripe Customer Portal session for managing subscriptions.
 */
export async function createBillingPortalSession(opts: {
  stripeCustomerId: string;
  origin: string;
}): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: opts.stripeCustomerId,
    return_url: `${opts.origin}/dashboard`,
  });

  return session.url;
}

/**
 * Verify and construct a Stripe webhook event.
 */
export function constructWebhookEvent(
  payload: Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    ENV.stripeWebhookSecret
  );
}

/**
 * Get subscription details from Stripe.
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Cancel a subscription at period end.
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}
