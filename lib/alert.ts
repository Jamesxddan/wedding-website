import "server-only";

const ALERT_TO = "jdj123.1997@gmail.com";
const ALERT_FROM = "Wedding Alert <alerts@jamesandsharon.wedding>";

export type AlertReason = "api_rate_limit" | "repeated_form_submit" | "hotlink_attempt";

const REASON_LABELS: Record<AlertReason, string> = {
  api_rate_limit:       "API Rate Limit Hit",
  repeated_form_submit: "Repeated Form Submission",
  hotlink_attempt:      "Direct Image URL Access (session killed)",
};

export async function sendBreachAlert(opts: {
  reason: AlertReason;
  device_uuid: string;
  ip: string | null;
  extra?: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // silently skip if not configured

  const label = REASON_LABELS[opts.reason] ?? opts.reason;
  const now = new Date().toUTCString();

  const html = `
    <h2 style="color:#8B4A6B;margin:0 0 16px">⚠️ Wedding Website Alert</h2>
    <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse;width:100%">
      <tr><td style="padding:6px 12px;color:#888;width:140px">Type</td><td style="padding:6px 12px;font-weight:600">${label}</td></tr>
      <tr style="background:#f9f5f1"><td style="padding:6px 12px;color:#888">Device UUID</td><td style="padding:6px 12px;font-family:monospace">${opts.device_uuid}</td></tr>
      <tr><td style="padding:6px 12px;color:#888">IP Address</td><td style="padding:6px 12px">${opts.ip ?? "unknown"}</td></tr>
      <tr style="background:#f9f5f1"><td style="padding:6px 12px;color:#888">Time (UTC)</td><td style="padding:6px 12px">${now}</td></tr>
      ${opts.extra ? `<tr><td style="padding:6px 12px;color:#888">Note</td><td style="padding:6px 12px">${opts.extra}</td></tr>` : ""}
    </table>
    <p style="margin-top:20px;font-size:12px;color:#bbb">James &amp; Sharon Wedding Website — automated security alert</p>
  `;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: ALERT_FROM,
        to: [ALERT_TO],
        subject: `WEBSITE ALERT — ${label}`,
        html,
      }),
    });
  } catch {
    // Never let alerting break a request
  }
}
