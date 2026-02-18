/**
 * Password Reset Email — Sent when user requests a password reset
 * Simple plain text email with a link to reset their password
 */

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Prysm AI <hello@prysmai.io>";

export async function sendResetEmail(
  email: string,
  resetToken: string,
  baseUrl: string
): Promise<{ success: boolean; error?: string }> {
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Reset your Prysm AI password",
      text: getResetEmailText(resetUrl),
    });

    if (error) {
      console.error("[Email] Resend error:", error);
      return { success: false, error: error.message };
    }

    console.log("[Email] Reset email sent to", email, "id:", data?.id);
    return { success: true };
  } catch (err: any) {
    console.error("[Email] Failed to send reset email:", err);
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

function getResetEmailText(resetUrl: string): string {
  return `Hi,

You requested a password reset for your Prysm AI account.

Reset your password here:
${resetUrl}

This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.

— The Prysm AI Team`;
}
