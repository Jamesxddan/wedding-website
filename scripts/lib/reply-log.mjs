// Logs every matched incoming WhatsApp message to whatsapp_replies —
// unconditionally, regardless of classification outcome. This is the full
// audit trail; applied_to_rsvp distinguishes "this changed the RSVP" from
// "this was just logged".
export async function logWhatsAppReply(db, { guestId, fromNumber, messageBody, intent, applied }) {
  await db.post("/whatsapp_replies", {
    guest_id: guestId,
    from_number: fromNumber,
    message_body: messageBody,
    classified_intent: intent,
    applied_to_rsvp: applied,
  });
}
