// Matches an incoming WhatsApp sender id to a known guest by phone number.
// Reuses lib/phone.ts's normalizeForStorage — Node's native TypeScript
// type-stripping (Node 22.6+/24 default) lets a plain .mjs script import a
// .ts file directly with no build step, confirmed working in this repo.
import { normalizeForStorage, parsePhone } from "../../lib/phone.ts";

// Convert a whatsapp-web.js message.from / message.author (e.g.
// "917995781657@c.us", or occasionally without the suffix) into the same
// E.164 form guests.mobile is normalized to for comparison.
export function waIdToE164(waId) {
  const digits = String(waId).split("@")[0];
  return normalizeForStorage(digits);
}

// Find the guest whose stored mobile normalizes to the same E.164 value as
// this WhatsApp sender id. Guest mobile data is known to be messy
// (malformed/placeholder numbers) — a guest with no mobile, or one that
// fails to normalize sensibly, simply never matches; this never throws.
export function findGuestByWhatsAppId(guests, waId) {
  const digits = String(waId).split("@")[0];
  const targetParsed = parsePhone(digits);

  // If the incoming WhatsApp ID doesn't parse to a valid number, no match
  if (!targetParsed || !targetParsed.isValid) {
    return null;
  }

  const target = normalizeForStorage(digits);
  return guests.find((g) => {
    if (!g.mobile) return false;

    // Only match if the guest mobile also parses to a valid number
    const guestParsed = parsePhone(g.mobile);
    if (!guestParsed || !guestParsed.isValid) return false;

    return normalizeForStorage(g.mobile) === target;
  }) ?? null;
}
