import { describe, it, expect } from "vitest";
import { waIdToE164, findGuestByWhatsAppId } from "../scripts/lib/phone-match.mjs";

describe("waIdToE164", () => {
  it("converts a WhatsApp chat id with country code to E.164", () => {
    expect(waIdToE164("917995781657@c.us")).toBe("+917995781657");
  });

  it("converts a bare-digit id (no @c.us suffix present) the same way", () => {
    expect(waIdToE164("917995781657")).toBe("+917995781657");
  });
});

describe("findGuestByWhatsAppId", () => {
  const guests = [
    { id: "g1", mobile: "7995781657" },        // bare 10-digit, no country code
    { id: "g2", mobile: "+919444390573" },     // full E.164 already
    { id: "g3", mobile: "7995781" },           // malformed (too short) — must never match, never throw
    { id: "g4", mobile: null },                // no mobile on file
  ];

  it("matches a bare-10-digit stored number against a WhatsApp id with country code", () => {
    const found = findGuestByWhatsAppId(guests, "917995781657@c.us");
    expect(found?.id).toBe("g1");
  });

  it("matches a full-E.164 stored number", () => {
    const found = findGuestByWhatsAppId(guests, "919444390573@c.us");
    expect(found?.id).toBe("g2");
  });

  it("returns null for a WhatsApp id with no matching guest", () => {
    const found = findGuestByWhatsAppId(guests, "911111111111@c.us");
    expect(found).toBeNull();
  });

  it("never throws on a malformed stored mobile, just doesn't match it", () => {
    expect(() => findGuestByWhatsAppId(guests, "917995781@c.us")).not.toThrow();
    expect(findGuestByWhatsAppId(guests, "917995781@c.us")).toBeNull();
  });
});
