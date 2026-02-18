/**
 * Invite Email — Sent when admin approves a waitlist signup
 * Simple plain text email with a link to set up their account
 */

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Prysm AI <hello@prysmai.io>";

export async function sendInviteEmail(
  email: string,
  inviteToken: string,
  baseUrl: string
): Promise<{ success: boolean; error?: string }> {
  const setupUrl = `${baseUrl}/setup-account?token=${inviteToken}`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "You're in! Set up your Prysm AI account",
      text: getInviteEmailText(setupUrl),
    });

    if (error) {
      console.error("[Email] Resend error:", error);
      return { success: false, error: error.message };
    }

    console.log("[Email] Invite sent to", email, "id:", data?.id);
    return { success: true };
  } catch (err: any) {
    console.error("[Email] Failed to send invite:", err);
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

function getInviteEmailText(setupUrl: string): string {
  return `Welcome to Prysm AI!

Your early access request has been approved. You're now part of a select group of builders who get to see inside their AI models.

Set up your account here:
${setupUrl}

Once you create your password, you'll be guided through a quick setup to connect your first AI project.

If you didn't request this, you can safely ignore this email.

— The Prysm AI Team`;
}
