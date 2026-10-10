import { describe, it, expect, vi } from "vitest";
import { logWhatsAppReply } from "../scripts/lib/reply-log.mjs";

describe("logWhatsAppReply", () => {
  it("inserts a row with all fields mapped correctly", async () => {
    const post = vi.fn().mockResolvedValue({});
    const db = { post };

    await logWhatsAppReply(db, {
      guestId: "guest-1",
      fromNumber: "+917995781657",
      messageBody: "Yes we'll be there!",
      intent: "attending",
      applied: true,
    });

    expect(post).toHaveBeenCalledWith("/whatsapp_replies", {
      guest_id: "guest-1",
      from_number: "+917995781657",
      message_body: "Yes we'll be there!",
      classified_intent: "attending",
      applied_to_rsvp: true,
    });
  });

  it("logs an unclear/unapplied message the same way, just with applied_to_rsvp: false", async () => {
    const post = vi.fn().mockResolvedValue({});
    const db = { post };

    await logWhatsAppReply(db, {
      guestId: "guest-2",
      fromNumber: "+919444390573",
      messageBody: "Congrats!",
      intent: "unclear",
      applied: false,
    });

    expect(post).toHaveBeenCalledWith("/whatsapp_replies", expect.objectContaining({
      classified_intent: "unclear",
      applied_to_rsvp: false,
    }));
  });
});
