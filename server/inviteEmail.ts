/**
 * Invite Email — Sent when admin approves a waitlist signup
 * Contains a link to set up their account with a password
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
      html: getInviteEmailHtml(setupUrl),
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

function getInviteEmailHtml(setupUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;">
              <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">
                Prysm<span style="color:#00e5cc;">AI</span>
              </span>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color:#111118;border:1px solid #1e1e2e;border-radius:12px;padding:40px 32px;">
              
              <!-- Badge -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:rgba(0,229,204,0.1);border:1px solid rgba(0,229,204,0.2);border-radius:20px;padding:6px 14px;">
                    <span style="font-size:11px;font-weight:600;color:#00e5cc;text-transform:uppercase;letter-spacing:0.1em;">
                      You've Been Approved
                    </span>
                  </td>
                </tr>
              </table>

              <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
                Welcome to Prysm AI
              </h1>

              <p style="margin:0 0 24px;font-size:15px;color:#a0a0b0;line-height:1.7;">
                Your early access request has been approved. You're now part of a select group of builders who get to see inside their AI models before anyone else.
              </p>

              <p style="margin:0 0 32px;font-size:15px;color:#a0a0b0;line-height:1.7;">
                Click the button below to set up your account and start exploring.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background-color:#00e5cc;border-radius:8px;">
                    <a href="${setupUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#0a0a0f;text-decoration:none;letter-spacing:-0.01em;">
                      Set Up Your Account &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #1e1e2e;margin:24px 0;" />

              <p style="margin:0 0 16px;font-size:13px;font-weight:600;color:#ffffff;text-transform:uppercase;letter-spacing:0.08em;">
                What you'll get
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td style="padding-right:10px;vertical-align:top;color:#00e5cc;font-size:14px;">&#10003;</td>
                  <td style="font-size:14px;color:#a0a0b0;line-height:1.6;">Full access to the Prysm AI dashboard</td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td style="padding-right:10px;vertical-align:top;color:#00e5cc;font-size:14px;">&#10003;</td>
                  <td style="font-size:14px;color:#a0a0b0;line-height:1.6;">API keys to connect your AI agents</td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td style="padding-right:10px;vertical-align:top;color:#00e5cc;font-size:14px;">&#10003;</td>
                  <td style="font-size:14px;color:#a0a0b0;line-height:1.6;">Real-time observability and security monitoring</td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:0;">
                <tr>
                  <td style="padding-right:10px;vertical-align:top;color:#00e5cc;font-size:14px;">&#10003;</td>
                  <td style="font-size:14px;color:#a0a0b0;line-height:1.6;">Direct line to the founding team for feedback</td>
                </tr>
              </table>

              <!-- Small print -->
              <p style="margin:32px 0 0;font-size:12px;color:#555568;line-height:1.6;">
                If the button doesn't work, copy and paste this link into your browser:<br/>
                <a href="${setupUrl}" style="color:#00e5cc;text-decoration:none;word-break:break-all;">${setupUrl}</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:32px;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#555568;">
                Built for builders who go deeper.
              </p>
              <p style="margin:0;font-size:11px;color:#3a3a4a;">
                &copy; ${new Date().getFullYear()} Prysm AI
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
