import "server-only";

const FROM = "James & Sharon <rsvp@jameswedssharon.site>";
const SITE = "https://jameswedssharon.site";

// Ceremony: Oct 8, 2026 4:30 PM IST = 11:00 UTC
// Reception: Oct 8, 2026 7:00 PM IST = 13:30 UTC
const CEREMONY_START_UTC = "20261008T110000Z";
const CEREMONY_END_UTC   = "20261008T130000Z"; // ~90 min
const RECEPTION_START_UTC = "20261008T133000Z";
const RECEPTION_END_UTC   = "20261008T163000Z"; // ~3 hrs

// ---------------------------------------------------------------------------
// ICS calendar invite builder
// ---------------------------------------------------------------------------
function buildIcs(events: Array<{ summary: string; location: string; start: string; end: string; description: string }>) {
  const vevents = events.map(e => [
    "BEGIN:VEVENT",
    `DTSTART:${e.start}`,
    `DTEND:${e.end}`,
    `SUMMARY:${e.summary}`,
    `LOCATION:${e.location}`,
    `DESCRIPTION:${e.description}`,
    `STATUS:CONFIRMED`,
    "END:VEVENT",
  ].join("\r\n")).join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//James & Sharon Wedding//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    vevents,
    "END:VCALENDAR",
  ].join("\r\n");
}

function icsForGuest(attending_events: "ceremony" | "reception" | "both" | null) {
  const events = [];
  if (!attending_events || attending_events === "ceremony" || attending_events === "both") {
    events.push({
      summary: "James & Sharon — Holy Matrimony ⛪",
      location: "St Andrews Kirk, Poonamallee High Rd, Vepery, Chennai 600 007",
      start: CEREMONY_START_UTC,
      end: CEREMONY_END_UTC,
      description: "Wedding ceremony of James Daniel & Sharon. Please arrive by 4:15 PM. Site: https://jameswedssharon.site",
    });
  }
  if (attending_events === "reception" || attending_events === "both") {
    events.push({
      summary: "James & Sharon — Wedding Reception 🥂",
      location: "BKN Auditorium, Ritherdon Road, Vepery, Chennai",
      start: RECEPTION_START_UTC,
      end: RECEPTION_END_UTC,
      description: "Wedding reception of James Daniel & Sharon. Site: https://jameswedssharon.site",
    });
  }
  return events.length ? buildIcs(events) : null;
}

function icsAttachment(attending_events: "ceremony" | "reception" | "both" | null) {
  const content = icsForGuest(attending_events);
  if (!content) return null;
  return [{
    filename: "james-sharon-wedding.ics",
    content: Buffer.from(content).toString("base64"),
  }];
}

// ---------------------------------------------------------------------------
// Shared email shell
// ---------------------------------------------------------------------------
function shell(headerBg: string, tagline: string, body: string) {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:24px 0;background:#f5ede0;font-family:Georgia,'Times New Roman',serif">
  <div style="max-width:560px;margin:0 auto;background:#fffdf9;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(90,31,46,0.10)">
    <!-- Header -->
    <div style="background:${headerBg};padding:36px 32px;text-align:center">
      <p style="color:#D4AF37;font-size:11px;letter-spacing:4px;text-transform:uppercase;margin:0 0 6px;font-family:-apple-system,sans-serif">James &amp; Sharon</p>
      <p style="color:rgba(253,246,236,0.55);font-size:10px;letter-spacing:2.5px;text-transform:uppercase;margin:0;font-family:-apple-system,sans-serif">${tagline}</p>
    </div>
    <!-- Body -->
    ${body}
    <!-- Footer -->
    <div style="padding:20px 32px 28px;border-top:1px solid #f0e4d0;text-align:center">
      <p style="font-size:11px;color:#c4a882;margin:0 0 4px">With love &amp; joy</p>
      <p style="font-size:13px;color:#8B4A6B;font-style:italic;margin:0">James Daniel &amp; Sharon</p>
      <p style="margin:12px 0 0"><a href="${SITE}" style="font-size:11px;color:#c4a882;font-family:-apple-system,sans-serif;letter-spacing:1px">${SITE}</a></p>
    </div>
  </div>
</body>
</html>`;
}

function detailBox(rows: Array<[string, string]>) {
  return `
  <div style="background:#fff8ed;border:1px solid #f0e4d0;border-radius:12px;padding:18px 22px;margin:0 0 22px">
    <p style="font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:#c4a882;margin:0 0 12px;font-family:-apple-system,sans-serif">Details</p>
    <table style="font-size:13px;border-collapse:collapse;width:100%">
      ${rows.map(([label, val]) => `
      <tr>
        <td style="padding:5px 0;color:#a07840;width:130px;vertical-align:top">${label}</td>
        <td style="padding:5px 0;color:#3a1a10;font-weight:600">${val}</td>
      </tr>`).join("")}
    </table>
  </div>`;
}

// ---------------------------------------------------------------------------
// 1. Immediate confirmation email
// ---------------------------------------------------------------------------
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
  const peopleLabel = guest_count === 1 ? "just yourself" : `${guest_count} people (including yourself)`;
  const mealLabel = meal_pref === "veg" ? "🌿 Vegetarian" : meal_pref === "non_veg" ? "🍖 Non-Vegetarian" : null;
  const eventLabel =
    attending_events === "both" ? "Church Ceremony &amp; Reception"
    : attending_events === "ceremony" ? "Church Ceremony"
    : attending_events === "reception" ? "Reception" : null;

  let subject: string;
  let bodyHtml: string;

  if (response === "not_attending") {
    subject = "We'll miss you — RSVP received";
    bodyHtml = shell("#5a1f2e", "October 8, 2026 · Chennai", `
      <div style="padding:36px 32px">
        <p style="font-size:17px;color:#5a1f2e;margin:0 0 16px">Dear ${firstName},</p>
        <p style="font-size:15px;line-height:1.75;color:#3a1a10;margin:0 0 16px">We're so sorry you won't be able to join us on our special day. We completely understand, and we'll be thinking of you as we celebrate.</p>
        <p style="font-size:15px;line-height:1.75;color:#3a1a10;margin:0 0 24px">You'll always have a special place in our hearts — we hope to celebrate with you soon. 💕</p>
        <p style="font-size:13px;color:#a07840;font-style:italic;margin:0">If your plans change, you can update your RSVP anytime at <a href="${SITE}" style="color:#8B4A6B">${SITE}</a>.</p>
      </div>`);
  } else {
    subject = response === "maybe" ? "Tentative RSVP received 🤞" : "Your RSVP is confirmed! 🎉";
    const intro = response === "maybe"
      ? `Thank you for letting us know — we've noted your tentative RSVP and we truly hope you'll be able to make it! 🤞`
      : `We're so thrilled you'll be joining us to celebrate! Your RSVP is confirmed and we can't wait to see you. 🎊`;

    const summaryRows: Array<[string, string]> = [
      ["Date", "Thursday, October 8, 2026"],
      ["Guests", peopleLabel],
      ...(mealLabel ? [["Meal", mealLabel] as [string, string]] : []),
      ...(eventLabel ? [["Attending", eventLabel] as [string, string]] : []),
    ];

    bodyHtml = shell("#5a1f2e", "October 8, 2026 · Chennai", `
      <div style="padding:36px 32px">
        <p style="font-size:17px;color:#5a1f2e;margin:0 0 16px">Dear ${firstName},</p>
        <p style="font-size:15px;line-height:1.75;color:#3a1a10;margin:0 0 24px">${intro}</p>
        ${detailBox([
          ...summaryRows,
          ...(attending_events !== "reception" ? [["Ceremony", "St Andrews Kirk, Vepery, Chennai — 4:30 PM"] as [string, string]] : []),
          ...(attending_events !== "ceremony" ? [["Reception", "BKN Auditorium, Ritherdon Rd, Vepery — 7:00 PM"] as [string, string]] : []),
        ])}
        <p style="font-size:13px;color:#a07840;font-style:italic;margin:0 0 6px">📎 A calendar invite (.ics) is attached — add it to your calendar with one click.</p>
        <p style="font-size:13px;color:#a07840;font-style:italic;margin:0">You can update your RSVP anytime at <a href="${SITE}" style="color:#8B4A6B">${SITE}</a>.</p>
      </div>`);
  }

  const attachments = response !== "not_attending" ? icsAttachment(attending_events) : null;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM, to: [email], subject, html: bodyHtml,
        ...(attachments ? { attachments } : {}),
      }),
    });
  } catch { /* never block the RSVP save */ }
}

// ---------------------------------------------------------------------------
// 2. Reminder emails (2-days-before, day-before, wedding-day)
// ---------------------------------------------------------------------------
export type ReminderType = "two_days_before" | "day_before" | "wedding_day";

interface ReminderGuest {
  name: string;
  email: string;
  guest_count: number;
  meal_pref: "veg" | "non_veg" | null;
  attending_events: "ceremony" | "reception" | "both" | null;
}

export async function sendReminderEmail(type: ReminderType, guest: ReminderGuest): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const firstName = guest.name.split(" ")[0];
  const { attending_events } = guest;

  const hasChurch = !attending_events || attending_events === "ceremony" || attending_events === "both";
  const hasReception = attending_events === "reception" || attending_events === "both";

  let subject: string;
  let bodyHtml: string;
  const attachments = icsAttachment(attending_events);

  if (type === "two_days_before") {
    subject = "See you in 2 days! 📅 James & Sharon's Wedding";
    bodyHtml = shell(
      "linear-gradient(135deg,#5a1f2e 0%,#7a3048 100%)",
      "2 Days to Go · October 8, 2026",
      `<div style="padding:36px 32px">
        <div style="text-align:center;margin-bottom:28px">
          <div style="font-size:40px;line-height:1;margin-bottom:8px">🗓️</div>
          <h1 style="font-size:22px;color:#5a1f2e;margin:0 0 6px">Just 2 days to go!</h1>
          <p style="font-size:14px;color:#a07840;font-style:italic;margin:0">We're counting the moments, ${firstName}</p>
        </div>
        <p style="font-size:15px;line-height:1.75;color:#3a1a10;margin:0 0 22px">
          The big day is almost here! We're so excited to celebrate with you on <strong>Thursday, October 8th in Chennai</strong>. Here's everything you need to be ready:
        </p>
        ${detailBox([
          ...(hasChurch ? [
            ["⛪ Ceremony", "St Andrews Kirk"],
            ["", "Poonamallee High Rd, Vepery, Chennai"],
            ["", "<strong>4:30 PM</strong> — please arrive by 4:15"],
          ] as Array<[string, string]> : []),
          ...(hasReception ? [
            ["🥂 Reception", "BKN Auditorium"],
            ["", "Ritherdon Road, Vepery, Chennai"],
            ["", "<strong>7:00 PM</strong>"],
          ] as Array<[string, string]> : []),
        ])}
        <div style="background:#fdf6ec;border-left:3px solid #D4AF37;padding:14px 18px;border-radius:0 8px 8px 0;margin:0 0 22px">
          <p style="font-size:12px;font-weight:600;color:#a07840;letter-spacing:1px;text-transform:uppercase;margin:0 0 6px;font-family:-apple-system,sans-serif">A few things to keep in mind</p>
          <ul style="font-size:13px;color:#3a1a10;line-height:1.7;margin:0;padding-left:18px">
            <li>Dress code: <strong>Semi-formal / Smart casual</strong></li>
            <li>Parking is available near the venue</li>
            <li>Photography will be permitted after the ceremony</li>
            <li>A gift of your presence is our greatest blessing 🙏</li>
          </ul>
        </div>
        <p style="font-size:13px;color:#a07840;font-style:italic;margin:0">📎 Calendar invite attached — if you haven't added it yet, you can import it now. Or <a href="${SITE}" style="color:#8B4A6B">visit the website</a> for the venue map.</p>
      </div>`
    );
  } else if (type === "day_before") {
    subject = "Tomorrow is the big day! 🌹 James & Sharon's Wedding";
    bodyHtml = shell(
      "linear-gradient(135deg,#3d1020 0%,#5a1f2e 60%,#7a3048 100%)",
      "Tomorrow · October 8, 2026",
      `<div style="padding:36px 32px">
        <div style="text-align:center;margin-bottom:28px">
          <div style="font-size:40px;line-height:1;margin-bottom:8px">🌹</div>
          <h1 style="font-size:22px;color:#5a1f2e;margin:0 0 6px">Tomorrow's the big day!</h1>
          <p style="font-size:14px;color:#a07840;font-style:italic;margin:0">We can't wait to see you, ${firstName}</p>
        </div>
        <p style="font-size:15px;line-height:1.75;color:#3a1a10;margin:0 0 22px">
          James &amp; Sharon's wedding is <strong>tomorrow, October 8th!</strong> We've been so looking forward to celebrating with you. Here's your final reminder:
        </p>
        ${detailBox([
          ...(hasChurch ? [
            ["⛪ Ceremony", "St Andrews Kirk, Vepery · <strong>4:30 PM</strong>"],
            ["", "<a href='https://maps.google.com/?q=St+Andrews+Kirk+Chennai' style='color:#8B4A6B;font-size:12px'>Open in Google Maps →</a>"],
          ] as Array<[string, string]> : []),
          ...(hasReception ? [
            ["🥂 Reception", "BKN Auditorium, Vepery · <strong>7:00 PM</strong>"],
            ["", "<a href='https://maps.google.com/?q=BKN+Auditorium+Chennai' style='color:#8B4A6B;font-size:12px'>Open in Google Maps →</a>"],
          ] as Array<[string, string]> : []),
          ["👥 Your RSVP", `${guest.guest_count} ${guest.guest_count === 1 ? "person" : "people"}`],
          ...(guest.meal_pref ? [["🍽️ Meal", guest.meal_pref === "veg" ? "🌿 Vegetarian" : "🍖 Non-Vegetarian"] as [string, string]] : []),
        ])}
        <div style="background:linear-gradient(135deg,#fff8ed,#fdf6ec);border:1px solid #f0e4d0;border-radius:12px;padding:18px 22px;margin:0 0 22px;text-align:center">
          <p style="font-size:13px;color:#5a1f2e;font-style:italic;line-height:1.7;margin:0">
            "He has made everything beautiful in His time."<br/>
            <span style="font-size:11px;color:#a07840;font-style:normal;letter-spacing:1px">— Ecclesiastes 3:11</span>
          </p>
        </div>
        <p style="font-size:13px;color:#a07840;font-style:italic;margin:0">See you tomorrow! 🎊 <a href="${SITE}" style="color:#8B4A6B">${SITE}</a></p>
      </div>`
    );
  } else {
    // wedding_day
    subject = "Today is the day! 🎊 James & Sharon's Wedding — See you soon!";
    bodyHtml = shell(
      "linear-gradient(135deg,#2a0a14 0%,#5a1f2e 50%,#D4AF37 100%)",
      "October 8, 2026 · The Wedding Day",
      `<div style="padding:36px 32px">
        <div style="text-align:center;margin-bottom:28px">
          <div style="font-size:48px;line-height:1;margin-bottom:8px">🎊</div>
          <h1 style="font-size:24px;color:#5a1f2e;margin:0 0 6px">Today is finally here!</h1>
          <p style="font-size:15px;color:#a07840;font-style:italic;margin:0">James &amp; Sharon are getting married today</p>
        </div>
        <p style="font-size:15px;line-height:1.75;color:#3a1a10;margin:0 0 22px">
          Good morning, <strong>${firstName}!</strong> The day we've all been waiting for is here. Thank you for being a part of this beautiful journey — we are so grateful you'll be celebrating with us. 💕
        </p>
        <div style="background:linear-gradient(135deg,#5a1f2e,#7a3048);border-radius:14px;padding:24px;margin:0 0 22px;text-align:center">
          <p style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#D4AF37;margin:0 0 16px;font-family:-apple-system,sans-serif">Today's Schedule</p>
          ${hasChurch ? `
          <div style="background:rgba(255,255,255,0.1);border-radius:10px;padding:14px 18px;margin-bottom:10px;text-align:left">
            <p style="color:#D4AF37;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px;font-family:-apple-system,sans-serif">⛪ Holy Matrimony</p>
            <p style="color:#fff;font-size:15px;font-weight:bold;margin:0 0 2px">4:30 PM — please arrive by 4:15</p>
            <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0">St Andrews Kirk, Vepery, Chennai</p>
          </div>` : ""}
          ${hasReception ? `
          <div style="background:rgba(255,255,255,0.1);border-radius:10px;padding:14px 18px;text-align:left">
            <p style="color:#D4AF37;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px;font-family:-apple-system,sans-serif">🥂 Wedding Reception</p>
            <p style="color:#fff;font-size:15px;font-weight:bold;margin:0 0 2px">7:00 PM</p>
            <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0">BKN Auditorium, Ritherdon Rd, Vepery</p>
          </div>` : ""}
        </div>
        <div style="background:#fdf6ec;border-radius:12px;padding:18px 22px;margin:0 0 22px;text-align:center">
          <p style="font-size:13px;color:#5a1f2e;font-style:italic;line-height:1.7;margin:0 0 6px">
            "Two are better than one, because they have a good return for their labor —<br/>a cord of three strands is not quickly broken."
          </p>
          <p style="font-size:11px;color:#a07840;letter-spacing:1px;margin:0;font-family:-apple-system,sans-serif">— Ecclesiastes 4:9–12</p>
        </div>
        <p style="font-size:13px;color:#a07840;font-style:italic;text-align:center;margin:0">
          See you there! 🙏 Follow along on <a href="${SITE}" style="color:#8B4A6B">jameswedssharon.site</a>
        </p>
      </div>`
    );
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM, to: [guest.email], subject, html: bodyHtml,
        ...(attachments ? { attachments } : {}),
      }),
    });
  } catch { /* never throw */ }
}
