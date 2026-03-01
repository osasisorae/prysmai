/**
 * Usage Alert Email
 * Sent when a user's API usage reaches 80% of their tier limit.
 * Includes current usage stats and an upgrade CTA.
 */

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Prysm AI <hello@prysmai.io>";

interface UsageAlertParams {
  email: string;
  orgName: string;
  currentPlan: string;
  currentUsage: number;
  limit: number;
  percentUsed: number;
  siteUrl: string;
}

export async function sendUsageAlertEmail(params: UsageAlertParams): Promise<{ success: boolean; error?: string }> {
  const { email, orgName, currentPlan, currentUsage, limit, percentUsed, siteUrl } = params;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `⚠️ ${percentUsed}% of your ${currentPlan} API limit used — ${orgName}`,
      html: getUsageAlertHtml(params),
    });

    if (error) {
      console.error("[Email] Usage alert send error:", error);
      return { success: false, error: error.message };
    }

    console.log("[Email] Usage alert sent to", email, "id:", data?.id);
    return { success: true };
  } catch (err: any) {
    console.error("[Email] Failed to send usage alert:", err);
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

function getNextPlan(currentPlan: string): { name: string; limit: string; price: string } | null {
  switch (currentPlan.toLowerCase()) {
    case "free":
      return { name: "Pro", limit: "50,000", price: "$39/mo" };
    case "pro":
      return { name: "Team", limit: "250,000", price: "$149/mo" };
    case "team":
      return { name: "Enterprise", limit: "Unlimited", price: "Custom" };
    default:
      return null;
  }
}

function getUsageAlertHtml(params: UsageAlertParams): string {
  const { orgName, currentPlan, currentUsage, limit, percentUsed, siteUrl } = params;
  const nextPlan = getNextPlan(currentPlan);
  const planName = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);
  const remaining = limit - currentUsage;
  const billingUrl = `${siteUrl}/dashboard/billing`;

  const upgradeBlock = nextPlan
    ? `
      <tr>
        <td style="padding-top:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid rgba(0,229,204,0.2);border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:20px 24px;background-color:rgba(0,229,204,0.05);">
                <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#ffffff;">
                  Upgrade to ${nextPlan.name} — ${nextPlan.limit} requests/month
                </p>
                <p style="margin:0 0 16px;font-size:13px;color:#a0a0b0;line-height:1.5;">
                  Get ${nextPlan.limit} requests, deep LLM security scanning, and more for ${nextPlan.price}.
                </p>
                <a href="${billingUrl}" style="display:inline-block;padding:10px 24px;background-color:#00e5cc;color:#0a0a0f;font-size:13px;font-weight:600;text-decoration:none;border-radius:6px;">
                  Upgrade Now →
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `
    : "";

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
              
              <!-- Alert Badge -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:20px;padding:6px 14px;">
                    <span style="font-size:11px;font-weight:600;color:#f59e0b;text-transform:uppercase;letter-spacing:0.1em;">
                      ⚠️ Usage Alert
                    </span>
                  </td>
                </tr>
              </table>

              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">
                You've used ${percentUsed}% of your monthly limit
              </h1>

              <p style="margin:0 0 24px;font-size:15px;color:#a0a0b0;line-height:1.7;">
                Your organization <strong style="color:#ffffff;">${orgName}</strong> on the <strong style="color:#ffffff;">${planName}</strong> plan has used <strong style="color:#f59e0b;">${currentUsage.toLocaleString()}</strong> of <strong style="color:#ffffff;">${limit.toLocaleString()}</strong> API requests this month.
              </p>

              <!-- Usage Bar -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:8px;">
                <tr>
                  <td>
                    <div style="width:100%;height:12px;background-color:#1e1e2e;border-radius:6px;overflow:hidden;">
                      <div style="width:${Math.min(100, percentUsed)}%;height:100%;background-color:#f59e0b;border-radius:6px;"></div>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;font-size:13px;color:#666680;">
                ${remaining.toLocaleString()} requests remaining · Resets on the 1st of next month
              </p>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #1e1e2e;margin:24px 0;" />

              <p style="margin:0 0 12px;font-size:13px;color:#a0a0b0;line-height:1.6;">
                When you reach 100%, new API requests will be blocked until the next billing period. To avoid interruption:
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td style="padding-right:10px;vertical-align:top;color:#00e5cc;font-size:14px;">&#10003;</td>
                  <td style="font-size:13px;color:#a0a0b0;line-height:1.6;">Upgrade your plan for more requests</td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td style="padding-right:10px;vertical-align:top;color:#00e5cc;font-size:14px;">&#10003;</td>
                  <td style="font-size:13px;color:#a0a0b0;line-height:1.6;">Review your usage patterns in the dashboard</td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:0;">
                <tr>
                  <td style="padding-right:10px;vertical-align:top;color:#00e5cc;font-size:14px;">&#10003;</td>
                  <td style="font-size:13px;color:#a0a0b0;line-height:1.6;">Optimize request batching to reduce volume</td>
                </tr>
              </table>

              <!-- Upgrade CTA -->
              ${upgradeBlock}

              <!-- Dashboard Link -->
              <tr>
                <td style="padding-top:20px;">
                  <a href="${billingUrl}" style="font-size:13px;color:#00e5cc;text-decoration:none;">
                    View usage details →
                  </a>
                </td>
              </tr>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:32px;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#555568;">
                You're receiving this because your API usage is approaching the limit.
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
