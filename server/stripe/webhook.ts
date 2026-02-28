import type { Request, Response } from "express";
import Stripe from "stripe";
import { constructWebhookEvent } from "./stripe";
import { getDb } from "../db";
import { organizations } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

type PlanType = "free" | "pro" | "team" | "enterprise";

/**
 * Map Stripe price amount (cents) to plan key.
 */
function amountToPlan(amountCents: number): PlanType {
  switch (amountCents) {
    case 3900:
      return "pro";
    case 14900:
      return "team";
    default:
      return "pro"; // fallback
  }
}

/**
 * Handle Stripe webhook events.
 * Registered at POST /api/stripe/webhook with express.raw() body parser.
 */
export async function handleStripeWebhook(
  req: Request,
  res: Response
): Promise<void> {
  const signature = req.headers["stripe-signature"];

  if (!signature) {
    res.status(400).json({ error: "Missing stripe-signature header" });
    return;
  }

  let event: Stripe.Event;

  try {
    event = constructWebhookEvent(
      req.body as Buffer,
      signature as string
    );
  } catch (err: any) {
    console.error("[Stripe Webhook] Signature verification failed:", err.message);
    res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
    return;
  }

  // Handle test events for webhook verification
  if (event.id.startsWith("evt_test_")) {
    console.log("[Stripe Webhook] Test event detected, returning verification response");
    res.json({ verified: true });
    return;
  }

  console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

  const db = await getDb();
  if (!db) {
    console.error("[Stripe Webhook] Database not available");
    res.status(500).json({ error: "Database not available" });
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.org_id;
        const planKey = session.metadata?.plan;

        if (orgId && session.customer && session.subscription) {
          const plan = (planKey as PlanType) || "pro";
          await db
            .update(organizations)
            .set({
              plan,
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
            })
            .where(eq(organizations.id, parseInt(orgId)));

          console.log(
            `[Stripe Webhook] Org ${orgId} upgraded to ${plan} (customer: ${session.customer}, subscription: ${session.subscription})`
          );
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find org by Stripe customer ID
        const [org] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.stripeCustomerId, customerId))
          .limit(1);

        if (org) {
          if (subscription.status === "active") {
            // Determine plan from price amount
            const priceAmount = subscription.items.data[0]?.price?.unit_amount || 0;
            const plan = amountToPlan(priceAmount);

            await db
              .update(organizations)
              .set({ plan, stripeSubscriptionId: subscription.id })
              .where(eq(organizations.id, org.id));

            console.log(`[Stripe Webhook] Org ${org.id} subscription updated to ${plan}`);
          } else if (
            subscription.status === "canceled" ||
            subscription.status === "unpaid"
          ) {
            await db
              .update(organizations)
              .set({ plan: "free", stripeSubscriptionId: null })
              .where(eq(organizations.id, org.id));

            console.log(`[Stripe Webhook] Org ${org.id} downgraded to free (${subscription.status})`);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const [org] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.stripeCustomerId, customerId))
          .limit(1);

        if (org) {
          await db
            .update(organizations)
            .set({ plan: "free", stripeSubscriptionId: null })
            .where(eq(organizations.id, org.id));

          console.log(`[Stripe Webhook] Org ${org.id} subscription deleted, downgraded to free`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(
          `[Stripe Webhook] Payment failed for customer ${invoice.customer} — invoice ${invoice.id}`
        );
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error(`[Stripe Webhook] Error processing ${event.type}:`, err);
    res.status(500).json({ error: "Webhook handler failed" });
  }
}
