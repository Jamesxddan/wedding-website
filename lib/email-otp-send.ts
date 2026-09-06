import "server-only";

const FROM = "James & Sharon <rsvp@jameswedssharon.site>";

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:24px 0;background:#f5ede0;font-family:Georgia,'Times New Roman',serif">
  <div style="max-width:480px;margin:0 auto;background:#fffdf9;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(90,31,46,0.10)">
    <div style="background:#5a1f2e;padding:32px;text-align:center">
      <p style="color:#D4AF37;font-size:11px;letter-spacing:4px;text-transform:uppercase;margin:0;font-family:-apple-system,sans-serif">James &amp; Sharon</p>
    </div>
    <div style="padding:32px">
      <p style="font-size:15px;line-height:1.75;color:#3a1a10;margin:0 0 20px">Use this code to verify your email and continue to the wedding site:</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#8B4A6B;text-align:center;margin:0 0 20px">${code}</p>
      <p style="font-size:13px;color:#a07840;margin:0">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
    </div>
  </div>
</body>
</html>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: `Your verification code: ${code}`,
        html,
      }),
    });
  } catch {
    /* best-effort — the caller still returns debug_code outside production */
  }
}
