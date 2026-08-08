import "server-only";

const FROM = "James & Sharon <rsvp@jamesandsharon.wedding>";

export async function sendRsvpConfirmation(opts: {
  name: string;
  email: string;
  response: "attending" | "not_attending" | "maybe";
  guest_count: number;
  meal_pref: "veg" | "non_veg" | null;
  attending_events: "ceremony" | "reception" | "both" | null;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const { name, email, response, guest_count, meal_pref, attending_events } = opts;
  const firstName = name.split(" ")[0];

  const eventLabel =
    attending_events === "both"
      ? "both the church ceremony and the reception"
      : attending_events === "ceremony"
      ? "the church ceremony"
      : attending_events === "reception"
      ? "the reception"
      : null;

  const mealLabel =
    meal_pref === "veg" ? "🌿 Vegetarian" : meal_pref === "non_veg" ? "🍖 Non-Vegetarian" : null;

  const peopleLabel =
    guest_count === 1 ? "just yourself" : `${guest_count} people (including yourself)`;

  let subject: string;
  let bodyHtml: string;

  if (response === "not_attending") {
    subject = "We'll miss you — RSVP received";
    bodyHtml = `
      <div style="font-family:Georgia,'Times New Roman',serif;max-width:560px;margin:0 auto;color:#2a1010;background:#fdf9f3;border:1px solid #e8d9c0;border-radius:12px;overflow:hidden">
        <div style="background:#5a1f2e;padding:32px;text-align:center">
          <p style="color:#D4AF37;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px">James &amp; Sharon</p>
          <p style="color:rgba(253,246,236,0.6);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0">October 8, 2026 · Chennai</p>
        </div>
        <div style="padding:36px 32px">
          <p style="font-size:17px;color:#5a1f2e;margin:0 0 16px">Dear ${firstName},</p>
          <p style="font-size:15px;line-height:1.7;margin:0 0 16px">We&apos;re so sorry you won&apos;t be able to join us on our special day. We completely understand, and we&apos;ll be thinking of you as we celebrate.</p>
          <p style="font-size:15px;line-height:1.7;margin:0 0 24px">You&apos;ll always have a special place in our hearts, and we hope to celebrate with you soon. 💕</p>
          <p style="font-size:13px;color:#888;font-style:italic;margin:0">If your plans change, you can update your RSVP anytime at <a href="https://jameswedssharon.site" style="color:#8B4A6B">jameswedssharon.site</a>.</p>
        </div>
        <div style="padding:20px 32px;border-top:1px solid #e8d9c0;text-align:center">
          <p style="font-size:12px;color:#bbb;margin:0">With love, James &amp; Sharon</p>
        </div>
      </div>
    `;
  } else {
    subject = "Your RSVP is confirmed! 🎉";
    bodyHtml = `
      <div style="font-family:Georgia,'Times New Roman',serif;max-width:560px;margin:0 auto;color:#2a1010;background:#fdf9f3;border:1px solid #e8d9c0;border-radius:12px;overflow:hidden">
        <div style="background:#5a1f2e;padding:32px;text-align:center">
          <p style="color:#D4AF37;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px">James &amp; Sharon</p>
          <p style="color:rgba(253,246,236,0.6);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0">October 8, 2026 · Chennai</p>
        </div>
        <div style="padding:36px 32px">
          <p style="font-size:17px;color:#5a1f2e;margin:0 0 16px">Dear ${firstName},</p>
          <p style="font-size:15px;line-height:1.7;margin:0 0 24px">
            ${response === "maybe"
              ? "Thank you for letting us know — we&apos;ve noted your tentative RSVP and we truly hope you&apos;ll be able to make it! 🤞"
              : "We&apos;re so thrilled you&apos;ll be joining us! We&apos;ve confirmed your RSVP and can&apos;t wait to celebrate with you. 🎊"}
          </p>

          <div style="background:#fff8ed;border:1px solid #e8d9c0;border-radius:10px;padding:20px 24px;margin-bottom:24px">
            <p style="font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#bba060;margin:0 0 14px">Your RSVP details</p>
            <table style="font-size:14px;border-collapse:collapse;width:100%">
              <tr>
                <td style="padding:5px 0;color:#888;width:140px">Attending</td>
                <td style="padding:5px 0;font-weight:600">${peopleLabel}</td>
              </tr>
              ${mealLabel ? `<tr><td style="padding:5px 0;color:#888">Meal preference</td><td style="padding:5px 0;font-weight:600">${mealLabel}</td></tr>` : ""}
              ${eventLabel ? `<tr><td style="padding:5px 0;color:#888">Joining for</td><td style="padding:5px 0;font-weight:600;text-transform:capitalize">${eventLabel}</td></tr>` : ""}
            </table>
          </div>

          <p style="font-size:13px;color:#888;font-style:italic;margin:0 0 8px">📅 <strong style="color:#5a1f2e">October 8, 2026</strong> — save the date!</p>
          <p style="font-size:13px;color:#888;font-style:italic;margin:0">You can view venue details and update your RSVP anytime at <a href="https://jameswedssharon.site" style="color:#8B4A6B">jameswedssharon.site</a>.</p>
        </div>
        <div style="padding:20px 32px;border-top:1px solid #e8d9c0;text-align:center">
          <p style="font-size:12px;color:#bbb;margin:0">With love, James &amp; Sharon ✨</p>
        </div>
      </div>
    `;
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: [email], subject, html: bodyHtml }),
    });
  } catch {
    // Never let email break the RSVP save
  }
}
