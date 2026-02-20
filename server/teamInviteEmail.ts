/**
 * Team Invite Email — Sent when a team member is invited to join an organization
 */

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendTeamInviteEmail(
  email: string,
  inviteToken: string,
  baseUrl: string,
  orgName: string
): Promise<{ success: boolean; error?: string }> {
  const acceptUrl = `${baseUrl}/accept-invite?token=${inviteToken}`;

  try {
    const { data, error } = await resend.emails.send({
      from: `Prysm AI <${process.env.RESEND_FROM_EMAIL || "hello@prysmai.io"}>`,
      to: email,
      subject: `You've been invited to join ${orgName} on Prysm AI`,
      text: getTeamInviteText(acceptUrl, orgName),
      html: getTeamInviteHtml(acceptUrl, orgName),
    });

    if (error) {
      console.error("[Email] Resend error:", error);
      return { success: false, error: error.message };
    }

    console.log("[Email] Team invite sent to", email, "id:", data?.id);
    return { success: true };
  } catch (err: any) {
    console.error("[Email] Failed to send team invite:", err);
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

function getTeamInviteText(acceptUrl: string, orgName: string): string {
  return `You've been invited to join ${orgName} on Prysm AI!

A team member has invited you to collaborate on their AI observability projects.

Accept the invitation here:
${acceptUrl}

If you don't have a Prysm AI account yet, you'll be able to create one when you accept.

If you didn't expect this invitation, you can safely ignore this email.

— The Prysm AI Team`;
}

function getTeamInviteHtml(acceptUrl: string, orgName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td style="padding-bottom:24px;">
              <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">
                Prysm<span style="color:#00e5cc;">AI</span>
              </span>
            </td>
          </tr>
          <tr>
            <td style="background-color:#111118;border:1px solid #1e1e2e;border-radius:12px;padding:32px;">
              <div style="background-color:rgba(0,229,204,0.1);border:1px solid rgba(0,229,204,0.3);border-radius:8px;padding:4px 12px;display:inline-block;margin-bottom:16px;">
                <span style="font-size:11px;font-weight:600;color:#00e5cc;text-transform:uppercase;letter-spacing:0.1em;">
                  Team Invitation
                </span>
              </div>
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">
                Join ${orgName} on Prysm AI
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#a0a0b0;line-height:1.7;">
                A team member has invited you to collaborate on their AI observability projects. Accept the invitation to get started.
              </p>
              <a href="${acceptUrl}" style="display:inline-block;background-color:#00e5cc;color:#0a0a0f;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
                Accept Invitation
              </a>
              <p style="margin:24px 0 0;font-size:13px;color:#555568;">
                If you don't have a Prysm AI account, you'll be able to create one when you accept.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#3a3a4a;">
                &copy; ${new Date().getFullYear()} Prysm AI &middot; If you didn't expect this, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
