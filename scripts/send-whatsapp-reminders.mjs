#!/usr/bin/env node
/**
 * WhatsApp Reminder Script — James & Sharon's Wedding
 *
 * Reads guests with a mobile number from Supabase and sends personalised
 * WhatsApp messages via whatsapp-web.js (local session / QR scan).
 *
 * REQUIREMENTS
 *   npm install whatsapp-web.js qrcode-terminal
 *   (or: npm install --no-save whatsapp-web.js qrcode-terminal)
 *
 * USAGE
 *   # Dry run — shows which messages would be sent, sends nothing
 *   node scripts/send-whatsapp-reminders.mjs --dry-run
 *
 *   # Live run — opens Chromium, scan QR once, then sends
 *   node scripts/send-whatsapp-reminders.mjs
 *
 *   # Target a single guest by name (substring match, case-insensitive)
 *   node scripts/send-whatsapp-reminders.mjs --only "Priya"
 *
 *   # Skip guests who have already RSVP'd (attending or maybe)
 *   node scripts/send-whatsapp-reminders.mjs --skip-rsvpd
 *
 *   # Change delay between messages (default: 3000 ms)
 *   node scripts/send-whatsapp-reminders.mjs --delay 5000
 *
 * RUN FROM THE PROJECT ROOT (needed to resolve .env.local):
 *   cd /path/to/wedding-website
 *   node scripts/send-whatsapp-reminders.mjs --dry-run
 *
 * NOTES
 * - India numbers must be stored as 91XXXXXXXXXX (or +91…). The script
 *   normalises "+91…" → "91…" automatically.
 * - Chromium data is persisted to .ww-session/ so you only need to scan
 *   the QR once. Delete that folder to force re-authentication.
 * - WhatsApp limits bulk sending — use delays ≥3s, keep batches ≤100/day
 *   to avoid soft bans.
 * - This script CANNOT run on Vercel/serverless — it needs a persistent
 *   Chromium process and a WhatsApp Web session.
 */

import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const DRY_RUN     = args.includes("--dry-run");
const SKIP_RSVPD  = args.includes("--skip-rsvpd");
const onlyIdx     = args.indexOf("--only");
const ONLY_FILTER = onlyIdx !== -1 ? args[onlyIdx + 1]?.toLowerCase() : null;
const delayIdx    = args.indexOf("--delay");
const SEND_DELAY  = delayIdx !== -1 ? parseInt(args[delayIdx + 1], 10) || 3000 : 3000;

// ---------------------------------------------------------------------------
// Env + Supabase
// ---------------------------------------------------------------------------
import { loadEnv, supabaseREST } from "./lib/supabase-util.mjs";

const { url: SUPABASE_URL, key: SUPABASE_KEY } = loadEnv();
const db = supabaseREST({ url: SUPABASE_URL, key: SUPABASE_KEY });

// ---------------------------------------------------------------------------
// Message template
// ---------------------------------------------------------------------------
function buildMessage(guest, rsvp) {
  const name = guest.name.split(" ")[0]; // first name only
  const weddingDate = "8th October 2026";
  const venue = "Chennai";

  if (rsvp && (rsvp.response === "attending" || rsvp.response === "maybe")) {
    // Already RSVP'd — send a "we're excited to see you" nudge
    const eventLabel =
      rsvp.attending_events === "both"
        ? "the ceremony and reception"
        : rsvp.attending_events === "ceremony"
        ? "the church ceremony"
        : "the reception";
    return (
      `Hi ${name}! 🎊\n\n` +
      `Just a warm reminder — James & Sharon's wedding is on *${weddingDate}* in *${venue}*.\n\n` +
      `We have you confirmed for ${eventLabel}. Can't wait to celebrate with you! 🥂\n\n` +
      `If anything changes, just visit the website to update your RSVP: jameswedssharon.site`
    );
  }

  // No RSVP yet
  return (
    `Hi ${name}! 💌\n\n` +
    `James & Sharon's wedding is almost here — *${weddingDate}* in *${venue}*!\n\n` +
    `We'd love to know if you can make it. Please fill in your RSVP on the website so we can plan seating and meals:\n` +
    `👉 jameswedssharon.site\n\n` +
    `Looking forward to celebrating with you! 🎉`
  );
}

// ---------------------------------------------------------------------------
// Normalise phone number → WhatsApp chat ID
// ---------------------------------------------------------------------------
function toWhatsAppId(mobile) {
  // Strip spaces, dashes, parentheses
  let num = mobile.replace(/[\s\-().]/g, "");
  // Strip leading +
  if (num.startsWith("+")) num = num.slice(1);
  // If it looks like a bare 10-digit India number, prepend country code
  if (/^[6-9]\d{9}$/.test(num)) num = "91" + num;
  return `${num}@c.us`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("┌─────────────────────────────────────────────────────────┐");
  console.log("│  James & Sharon — WhatsApp Reminder Script               │");
  console.log(`│  Mode: ${DRY_RUN ? "DRY RUN (nothing will be sent)          " : "LIVE — messages WILL be sent             "}  │`);
  console.log("└─────────────────────────────────────────────────────────┘\n");

  // Fetch guests with mobile numbers
  const guests = await db.get(
    "/guests?select=id,name,city,mobile&mobile=not.is.null&order=name.asc"
  );

  if (!Array.isArray(guests) || guests.length === 0) {
    console.log("No guests with mobile numbers found in the database.");
    return;
  }

  // Fetch RSVPs
  const rsvps = await db.get("/rsvps?select=guest_id,response,attending_events");
  const rsvpByGuest = Object.fromEntries(rsvps.map((r) => [r.guest_id, r]));

  // Build send list
  let targets = guests.filter((g) => g.mobile);

  if (ONLY_FILTER) {
    targets = targets.filter((g) => g.name.toLowerCase().includes(ONLY_FILTER));
    if (targets.length === 0) {
      console.log(`No guests matching "--only ${ONLY_FILTER}".`);
      return;
    }
  }

  if (SKIP_RSVPD) {
    targets = targets.filter((g) => {
      const r = rsvpByGuest[g.id];
      return !r || (r.response !== "attending" && r.response !== "maybe");
    });
  }

  console.log(`Found ${guests.length} guest(s) total with mobile numbers.`);
  console.log(`Sending to: ${targets.length} guest(s)${SKIP_RSVPD ? " (non-RSVP'd)" : ""}\n`);

  if (targets.length === 0) {
    console.log("Nothing to send.");
    return;
  }

  // Preview all messages in dry-run
  if (DRY_RUN) {
    console.log("── DRY RUN PREVIEW ──────────────────────────────────────\n");
    for (const g of targets) {
      const rsvp = rsvpByGuest[g.id] ?? null;
      const waId = toWhatsAppId(g.mobile);
      const msg = buildMessage(g, rsvp);
      console.log(`TO: ${g.name} (${g.mobile} → ${waId})`);
      console.log(`RSVP: ${rsvp ? rsvp.response : "none"}`);
      console.log("─".repeat(50));
      console.log(msg);
      console.log("─".repeat(50) + "\n");
    }
    console.log(`Dry run complete. ${targets.length} message(s) would be sent.`);
    console.log("Run without --dry-run to send for real.\n");
    return;
  }

  // --- LIVE RUN ---
  // Dynamic import so missing package gives a clear error before Supabase calls
  let Client, LocalAuth, qrTerminal;
  try {
    ({ Client, LocalAuth } = require("whatsapp-web.js"));
    qrTerminal = require("qrcode-terminal");
  } catch (e) {
    console.error(
      "\n❌  whatsapp-web.js is not installed.\n" +
        "    Run: npm install --no-save whatsapp-web.js qrcode-terminal\n" +
        "    Then try again.\n"
    );
    process.exit(1);
  }

  const sessionPath = path.join(__dirname, "..", ".ww-session");

  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: sessionPath }),
    puppeteer: {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    },
  });

  let qrShown = false;
  client.on("qr", (qr) => {
    if (!qrShown) {
      console.log("\nScan this QR code with WhatsApp on your phone:");
      console.log("  (WhatsApp → Linked Devices → Link a Device)\n");
      qrShown = true;
    }
    qrTerminal.generate(qr, { small: true });
  });

  client.on("authenticated", () => {
    console.log("\n✓ Authenticated. Session saved to .ww-session/");
    console.log("  (You won't need to scan again next time)\n");
  });

  client.on("auth_failure", (msg) => {
    console.error("❌ Authentication failed:", msg);
    process.exit(1);
  });

  await new Promise((resolve, reject) => {
    client.on("ready", resolve);
    client.on("disconnected", () => reject(new Error("WhatsApp client disconnected")));
    client.initialize().catch(reject);
  });

  console.log("✓ WhatsApp ready. Starting sends...\n");

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const g = targets[i];
    const rsvp = rsvpByGuest[g.id] ?? null;
    const waId = toWhatsAppId(g.mobile);
    const msg = buildMessage(g, rsvp);
    const progress = `[${i + 1}/${targets.length}]`;

    try {
      // Verify number is registered on WhatsApp before sending
      const isRegistered = await client.isRegisteredUser(waId);
      if (!isRegistered) {
        console.log(`${progress} SKIP  ${g.name} — ${g.mobile} not on WhatsApp`);
        continue;
      }

      await client.sendMessage(waId, msg);
      sent++;
      console.log(`${progress} ✓ SENT  ${g.name} (${g.mobile})`);
    } catch (err) {
      failed++;
      console.error(`${progress} ✗ FAIL  ${g.name} (${g.mobile}): ${err.message}`);
    }

    // Polite delay to avoid rate limiting
    if (i < targets.length - 1) {
      await new Promise((r) => setTimeout(r, SEND_DELAY));
    }
  }

  await client.destroy();
  await db.close();

  console.log(`\n── Summary ${"─".repeat(40)}`);
  console.log(`  Sent:    ${sent}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`  Skipped: ${targets.length - sent - failed} (not on WhatsApp)`);
  console.log("─".repeat(52) + "\n");
}

main().catch((err) => {
  console.error("\n❌ Unhandled error:", err.message);
  process.exit(1);
});
