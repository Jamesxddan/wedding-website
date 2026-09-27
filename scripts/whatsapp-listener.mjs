#!/usr/bin/env node
/**
 * WhatsApp Reply Listener — James & Sharon's Wedding
 *
 * Persistent process: listens for incoming WhatsApp messages from guests
 * JD has messaged, logs every one, and auto-applies unambiguous
 * attending/not_attending/maybe replies to their RSVP.
 *
 * REQUIREMENTS
 *   Same as scripts/send-whatsapp-reminders.mjs — whatsapp-web.js and
 *   qrcode-terminal already installed, reuses the same .ww-session/.
 *
 * USAGE
 *   node scripts/whatsapp-listener.mjs
 *   (leave it running — see the pm2 note in Step 4 below for keeping it
 *   alive across terminal closes)
 *
 *   # Dry run — logs what WOULD be written to whatsapp_replies/rsvps,
 *   # writes nothing. Reads (guest lookups, existing-rsvp checks) are
 *   # still real, so the preview accurately shows insert-vs-update.
 *   node scripts/whatsapp-listener.mjs --dry-run
 *
 * RUN FROM THE PROJECT ROOT (needed to resolve .env.local and .ww-session):
 *   cd /path/to/wedding-website
 *   node scripts/whatsapp-listener.mjs
 */

import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

import { loadEnv, supabaseREST } from "./lib/supabase-util.mjs";
import { handleIncomingMessage } from "./lib/handle-incoming-message.mjs";

const DRY_RUN = process.argv.includes("--dry-run");

const { url: SUPABASE_URL, key: SUPABASE_KEY } = loadEnv();
const realDb = supabaseREST({ url: SUPABASE_URL, key: SUPABASE_KEY });

// In dry-run mode, reads stay real (so the preview correctly shows
// insert-vs-update for an existing rsvp) but writes just print instead of
// touching the database — same shape the reminder script's --dry-run uses
// conceptually, adapted for a long-running listener instead of a one-shot loop.
const db = DRY_RUN
  ? {
      get: realDb.get,
      post: async (restPath, body) => {
        console.log(`[DRY RUN] would POST ${restPath}`, body);
        return {};
      },
      patch: async (restPath, body) => {
        console.log(`[DRY RUN] would PATCH ${restPath}`, body);
        return {};
      },
    }
  : realDb;

if (DRY_RUN) console.log("Running in --dry-run mode: nothing will be written.\n");

const CATCH_UP_MESSAGE_LIMIT = 25;
const RECONNECT_DELAY_MS = 10_000;

let Client, LocalAuth;
try {
  ({ Client, LocalAuth } = require("whatsapp-web.js"));
} catch {
  console.error(
    "\n❌  whatsapp-web.js is not installed.\n" +
      "    Run: npm install --no-save whatsapp-web.js qrcode-terminal\n" +
      "    (and npm approve-scripts, if prompted) then try again.\n"
  );
  process.exit(1);
}

const sessionPath = path.join(__dirname, "..", ".ww-session");

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: sessionPath }),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  },
});

async function fetchGuestsWithMobile() {
  return db.get("/guests?select=id,mobile&mobile=not.is.null");
}

async function latestReplyTimestamp(guestId) {
  const rows = await db.get(
    `/whatsapp_replies?guest_id=eq.${guestId}&select=created_at&order=created_at.desc&limit=1`
  );
  return rows.length > 0 ? new Date(rows[0].created_at).getTime() : 0;
}

// Best-effort inverse of phone-match's waIdToE164 — good enough to build a
// chat id to look up a known guest's chat, not used for the actual
// guest-matching decision (handleIncomingMessage re-derives that itself
// from the real message.from it receives).
function guestMobileToWaId(mobile) {
  const digits = String(mobile).replace(/\D/g, "");
  return `${digits}@c.us`;
}

async function catchUp() {
  console.log("Running startup catch-up pass...");
  const guests = await fetchGuestsWithMobile();

  for (const guest of guests) {
    const waId = guestMobileToWaId(guest.mobile);
    let chat;
    try {
      chat = await client.getChatById(waId);
    } catch {
      continue; // no chat with this guest yet — nothing to catch up on
    }
    if (!chat) continue;

    const sinceMs = await latestReplyTimestamp(guest.id);
    const messages = await chat.fetchMessages({ limit: CATCH_UP_MESSAGE_LIMIT });

    for (const msg of messages) {
      if (msg.fromMe) continue;
      if (msg.timestamp * 1000 <= sinceMs) continue;
      try {
        await handleIncomingMessage(db, guests, msg.from, msg.body);
      } catch (err) {
        console.error(
          `[catch-up] Failed to process message from ${msg.from} (guest ${guest.id}):`,
          err
        );
      }
    }
  }
  console.log("Catch-up pass complete.");
}

client.on("qr", (qr) => {
  console.log("\nThis should already be authenticated via .ww-session/.");
  console.log("If you're seeing a QR code, delete .ww-session/ was likely removed — scan with WhatsApp → Linked Devices.\n");
});

client.on("ready", async () => {
  console.log("✓ WhatsApp listener ready.");
  await catchUp();

  client.on("message", async (msg) => {
    if (msg.fromMe) return;
    const guests = await fetchGuestsWithMobile();
    let result;
    try {
      result = await handleIncomingMessage(db, guests, msg.from, msg.body);
    } catch (err) {
      console.error(`[live] Failed to process message from ${msg.from}:`, err);
      return;
    }
    if (result.matched) {
      console.log(`[${new Date().toISOString()}] ${msg.from} -> ${result.intent} (applied: ${result.applied})`);
    }
  });

  console.log("Listening for replies...");
});

client.on("disconnected", (reason) => {
  console.error(`Disconnected (${reason}), reconnecting in ${RECONNECT_DELAY_MS / 1000}s...`);
  setTimeout(() => {
    client.initialize().catch((err) => {
      console.error("Reconnect failed:", err.message);
    });
  }, RECONNECT_DELAY_MS);
});

client.on("auth_failure", (msg) => {
  console.error("❌ Authentication failed:", msg);
  process.exit(1);
});

client.initialize();
