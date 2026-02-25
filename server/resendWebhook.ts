/**
 * Resend Inbound Webhook Handler
 *
 * Listens for Resend's email.received webhook events and forwards
 * emails sent to info@prysmai.io to osasisorae@gmail.com.
 *
 * Setup:
 * 1. Enable Resend Inbound on prysmai.io domain (Dashboard → Emails → Receiving)
 * 2. Register webhook URL: https://prysmai.manus.space/api/webhooks/resend
 * 3. Select event: email.received
 */

import { Router } from "express";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Forwarding configuration
const FORWARD_TO = "osasisorae@gmail.com";
const FORWARD_FROM = "info@prysmai.io";

export const resendWebhookRouter = Router();

resendWebhookRouter.post("/resend", async (req, res) => {
  try {
    const event = req.body;

    // Log the incoming webhook event
    console.log(`[Resend Webhook] Received event: ${event?.type || "unknown"}`);

    if (event?.type !== "email.received") {
      // Acknowledge non-email events (Resend sends various event types)
      return res.status(200).json({ received: true, forwarded: false });
    }

    const emailId = event?.data?.email_id;
    if (!emailId) {
      console.error("[Resend Webhook] Missing email_id in event data");
      return res.status(400).json({ error: "Missing email_id" });
    }

    console.log(
      `[Resend Webhook] Forwarding email ${emailId} from ${FORWARD_FROM} to ${FORWARD_TO}`
    );

    // Use the Resend forward helper — it automatically fetches content + attachments
    const { data, error } = await resend.emails.receiving.forward({
      emailId,
      to: FORWARD_TO,
      from: FORWARD_FROM,
    });

    if (error) {
      console.error("[Resend Webhook] Forward failed:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`[Resend Webhook] Email forwarded successfully. ID: ${data?.id}`);
    return res.status(200).json({ received: true, forwarded: true, id: data?.id });
  } catch (err: any) {
    console.error("[Resend Webhook] Unexpected error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
