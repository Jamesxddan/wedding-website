import { findGuestByWhatsAppId, waIdToE164 } from "./phone-match.mjs";
import { classifyIntent } from "./whatsapp-intent.mjs";
import { applyRsvpFromIntent } from "./rsvp-apply.mjs";
import { logWhatsAppReply } from "./reply-log.mjs";

// Single entry point for processing one inbound WhatsApp message, used by
// both the live listener and the startup catch-up pass (Task 8). Fully
// testable without a real WhatsApp connection — db and guests are plain
// data/objects, no whatsapp-web.js types involved.
export async function handleIncomingMessage(db, guests, fromWaId, messageBody) {
  const guest = findGuestByWhatsAppId(guests, fromWaId);
  if (!guest) return { matched: false };

  const intent = classifyIntent(messageBody);

  // A failed RSVP apply (e.g. a transient Supabase error) must never
  // prevent the message from being logged — that's the entire audit trail
  // for this reply, and the catch-up watermark will move past it once a
  // later message succeeds, permanently losing it otherwise.
  let applied = false;
  try {
    ({ applied } = await applyRsvpFromIntent(db, guest.id, intent));
  } catch (err) {
    console.error(`Failed to apply RSVP from WhatsApp reply for guest ${guest.id}:`, err);
    applied = false;
  }

  await logWhatsAppReply(db, {
    guestId: guest.id,
    // Store the normalized E.164 number, not the raw WhatsApp id
    // (e.g. "917995781657@c.us"), so from_number matches how phone
    // numbers are stored everywhere else.
    fromNumber: waIdToE164(fromWaId),
    messageBody,
    intent,
    applied,
  });

  return { matched: true, intent, applied };
}
