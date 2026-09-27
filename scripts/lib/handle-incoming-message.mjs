import { findGuestByWhatsAppId } from "./phone-match.mjs";
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
  const { applied } = await applyRsvpFromIntent(db, guest.id, intent);

  await logWhatsAppReply(db, {
    guestId: guest.id,
    fromNumber: fromWaId,
    messageBody,
    intent,
    applied,
  });

  return { matched: true, intent, applied };
}
