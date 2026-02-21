import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Prysm AI <hello@prysmai.io>";

const TO_EMAIL = "maryolorunfemi6@gmail.com";

const subject = "You're one of our first — Founding Tester invite for Prysm AI";

const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0A0A0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0F;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          
          <!-- Header -->
          <tr>
            <td style="padding-bottom:32px;">
              <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Prysm<span style="color:#00E5CC;">AI</span></span>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="background-color:#111118;border:1px solid #1a1a2e;border-radius:12px;padding:40px 36px;">
              
              <!-- Badge -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:rgba(0,229,204,0.1);border:1px solid rgba(0,229,204,0.3);border-radius:20px;padding:6px 14px;">
                    <span style="font-size:11px;font-weight:600;color:#00E5CC;letter-spacing:1.5px;text-transform:uppercase;">Founding Tester Invitation</span>
                  </td>
                </tr>
              </table>

              <h1 style="margin:0 0 20px;font-size:26px;font-weight:700;color:#ffffff;line-height:1.3;">
                Hi Mary,
              </h1>

              <p style="margin:0 0 18px;font-size:15px;color:#a0a0b8;line-height:1.7;">
                I'm Osarenren, the founder of Prysm AI. You were one of our earliest waitlist signups, and I wanted to reach out personally.
              </p>

              <p style="margin:0 0 18px;font-size:15px;color:#a0a0b8;line-height:1.7;">
                We've just finished building the core platform — a full observability layer for LLM applications. Think of it as the debugger that AI development never had. One API call, and you can see every token, every decision, every cost, every trace from your AI application in real-time.
              </p>

              <p style="margin:0 0 18px;font-size:15px;color:#a0a0b8;line-height:1.7;">
                Before we open up to the public, we're inviting a small group of <strong style="color:#ffffff;">Founding Testers</strong> to get early access and help shape the product. I'd love for you to be one of them.
              </p>

              <!-- What you get box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;background-color:rgba(0,229,204,0.04);border:1px solid rgba(0,229,204,0.15);border-radius:8px;padding:24px;">
                <tr>
                  <td>
                    <p style="margin:0 0 16px;font-size:14px;font-weight:600;color:#00E5CC;text-transform:uppercase;letter-spacing:1px;">What you get</p>
                    <p style="margin:0 0 10px;font-size:15px;color:#d0d0e0;line-height:1.6;">
                      &#10003;&nbsp;&nbsp;<strong style="color:#ffffff;">Lifetime Pro plan</strong> — free forever (normally $49/month)
                    </p>
                    <p style="margin:0 0 10px;font-size:15px;color:#d0d0e0;line-height:1.6;">
                      &#10003;&nbsp;&nbsp;<strong style="color:#ffffff;">Founding Tester badge</strong> on your Prysm profile
                    </p>
                    <p style="margin:0 0 10px;font-size:15px;color:#d0d0e0;line-height:1.6;">
                      &#10003;&nbsp;&nbsp;<strong style="color:#ffffff;">Direct founder access</strong> — email me anytime with feedback or ideas
                    </p>
                    <p style="margin:0;font-size:15px;color:#d0d0e0;line-height:1.6;">
                      &#10003;&nbsp;&nbsp;<strong style="color:#ffffff;">Your name in our launch credits</strong> as a founding contributor
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 18px;font-size:15px;color:#a0a0b8;line-height:1.7;">
                <strong style="color:#ffffff;">What I'd ask in return:</strong> Build a small project with Prysm — it can be anything that uses an LLM (a chatbot, a summarizer, an AI assistant, whatever you're curious about). Try the SDK, explore the dashboard, and share your honest feedback with me. If you enjoy the experience, I'd love it if you shared what you built on LinkedIn — not as a promotion, but as a developer story about what you learned.
              </p>

              <p style="margin:0 0 18px;font-size:15px;color:#a0a0b8;line-height:1.7;">
                If you're interested, just reply to this email or drop me a line at <a href="mailto:osasisorae@gmail.com" style="color:#00E5CC;text-decoration:none;">osasisorae@gmail.com</a> and I'll approve your account right away so you can get started. You'll have a full week to explore, build, and share your experience.
              </p>

              <p style="margin:0 0 6px;font-size:15px;color:#a0a0b8;line-height:1.7;">
                Looking forward to hearing from you.
              </p>

              <p style="margin:24px 0 0;font-size:15px;color:#ffffff;line-height:1.6;">
                Osarenren Isorae<br>
                <span style="color:#a0a0b8;">Founder, Prysm AI</span><br>
                <a href="mailto:osasisorae@gmail.com" style="color:#00E5CC;text-decoration:none;">osasisorae@gmail.com</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:32px;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#555570;">
                Prysm AI — See inside your AI.
              </p>
              <p style="margin:0;font-size:11px;color:#3a3a50;">
                You're receiving this because you joined the Prysm AI waitlist.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

async function main() {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      replyTo: "osasisorae@gmail.com",
      subject: subject,
      html: html,
    });

    if (error) {
      console.error("Failed to send:", error);
      process.exit(1);
    }

    console.log("Email sent successfully!");
    console.log("Email ID:", data?.id);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

main();
