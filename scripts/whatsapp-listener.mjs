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
// Node's native TypeScript type-stripping (Node 22.6+/24 default) lets this
// plain .mjs script import a .ts file directly with no build step — same
// pattern already used in scripts/lib/phone-match.mjs.
import { normalizeForStorage } from "../lib/phone.ts";

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
// from the real message.from it receives). Routed through normalizeForStorage
// (same as the rest of the codebase) so a bare 10-digit guest mobile with no
// country code still resolves to a real WhatsApp chat id.
function guestMobileToWaId(mobile) {
  const e164 = normalizeForStorage(mobile);
  return e164.replace(/^\+/, "") + "@c.us";
}

// Current WhatsApp Web sometimes delivers a sender id as "<id>@lid" instead
// of "<phone>@c.us" (phone-match's matching expects digits before an
// "@c.us"-shaped id). Resolve the real phone number via the message's
// contact when that happens; if resolution fails or yields nothing, the
// caller must skip the message rather than pass a garbage id downstream —
// and this at least makes that skip visible in the logs instead of silent.
async function resolveWaId(msg) {
  const rawId = msg.from;
  if (typeof rawId === "string" && rawId.endsWith("@c.us")) {
    return rawId;
  }
  try {
    const contact = await msg.getContact();
    const resolvedId = contact?.number ? `${contact.number}@c.us` : null;
    if (resolvedId) return resolvedId;
  } catch (err) {
    console.error(`Failed to resolve contact for non-c.us sender ${rawId}:`, err);
  }
  console.log(`Skipping message from unresolved non-c.us sender: ${rawId}`);
  return null;
}

// Stickers, media, calls, and system notifications would otherwise get
// logged as empty-body "unclear" rows — and if body is ever undefined
// rather than "", the message_body not-null constraint would reject the
// insert outright. Skip anything that isn't a real text message entirely.
function isProcessableMessage(msg) {
  if (msg.type !== "chat") return false;
  const body = typeof msg.body === "string" ? msg.body.trim() : "";
  return body.length > 0;
}

async function catchUp() {
  console.log("Running startup catch-up pass...");
  const guests = await fetchGuestsWithMobile();

  for (const guest of guests) {
    try {
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

      // Only process guest messages that came after the last message JD
      // himself sent in this chat. Without this anchor, a guest with no
      // prior whatsapp_replies row (sinceMs = 0) would have their last 25
      // messages in JD's *existing personal chat* with them (friends/family
      // he already talks to) auto-classified and auto-applied to their
      // RSVP — an old unrelated "yes" or "sure" could silently overwrite a
      // guest's real RSVP. If there's no fromMe message in this batch at
      // all, there's nothing to safely anchor against, so skip this guest's
      // catch-up entirely for this run rather than falling back to
      // processing all of them.
      let lastFromMeMs = -1;
      for (const msg of messages) {
        if (msg.fromMe) {
          const ts = msg.timestamp * 1000;
          if (ts > lastFromMeMs) lastFromMeMs = ts;
        }
      }
      if (lastFromMeMs === -1) {
        console.log(
          `[catch-up] No outgoing message found for guest ${guest.id} in the last ${CATCH_UP_MESSAGE_LIMIT} messages — skipping (nothing to safely anchor against).`
        );
        continue;
      }

      // A message must be newer than BOTH cutoffs — the fromMe anchor and
      // the existing per-guest watermark — to be processed.
      const effectiveSinceMs = Math.max(sinceMs, lastFromMeMs);

      for (const msg of messages) {
        if (msg.fromMe) continue;
        if (msg.timestamp * 1000 <= effectiveSinceMs) continue;
        if (!isProcessableMessage(msg)) continue;

        const resolvedId = await resolveWaId(msg);
        if (!resolvedId) continue;

        try {
          await handleIncomingMessage(db, guests, resolvedId, msg.body);
        } catch (err) {
          console.error(
            `[catch-up] Failed to process message from ${resolvedId} (guest ${guest.id}):`,
            err
          );
        }
      }
    } catch (err) {
      // A single bad guest (a flaky fetchMessages call, a Supabase GET
      // failure, etc.) must never abort the whole catch-up pass.
      console.error(`[catch-up] Failed processing guest ${guest.id}, skipping:`, err);
      continue;
    }
  }
  console.log("Catch-up pass complete.");
}

client.on("qr", (qr) => {
  console.log("\nThis should already be authenticated via .ww-session/.");
  console.log("If you're seeing a QR code, delete .ww-session/ was likely removed — scan with WhatsApp → Linked Devices.\n");
});

// Registered once, at module scope, independent of "ready" — "ready" refires
// after every reconnect (client.initialize() following a "disconnected"
// event), and registering this listener inside that handler would attach a
// duplicate "message" listener on every reconnect, processing a single live
// message N+1 times after N reconnects (duplicate whatsapp_replies rows,
// duplicate RSVP writes).
client.on("message", async (msg) => {
  if (msg.fromMe) return;
  if (!isProcessableMessage(msg)) return;

  const resolvedId = await resolveWaId(msg);
  if (!resolvedId) return;

  const guests = await fetchGuestsWithMobile();
  let result;
  try {
    result = await handleIncomingMessage(db, guests, resolvedId, msg.body);
  } catch (err) {
    console.error(`[live] Failed to process message from ${resolvedId}:`, err);
    return;
  }
  if (result.matched) {
    console.log(`[${new Date().toISOString()}] ${resolvedId} -> ${result.intent} (applied: ${result.applied})`);
  }
});

client.on("ready", async () => {
  console.log("✓ WhatsApp listener ready.");
  // The live listener (registered above, at module scope) is already
  // attached at this point regardless of what catchUp() does below — a
  // catch-up-level failure must never prevent it from being active.
  console.log("Listening for replies...");

  try {
    await catchUp();
  } catch (err) {
    console.error("Catch-up pass failed (live listener remains attached and unaffected):", err);
  }
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
