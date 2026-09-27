import { describe, it, expect, vi } from "vitest";
import { handleIncomingMessage } from "../scripts/lib/handle-incoming-message.mjs";

const GUESTS = [
  { id: "guest-1", mobile: "7995781657" },
  { id: "guest-2", mobile: "+919444390573" },
];

function fakeDb() {
  return {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
  };
}

describe("handleIncomingMessage", () => {
  it("ignores a message from a number matching no known guest", async () => {
    const db = fakeDb();
    const result = await handleIncomingMessage(db, GUESTS, "911111111111@c.us", "Yes!");
    expect(result).toEqual({ matched: false });
    expect(db.post).not.toHaveBeenCalled();
  });

  it("logs and applies an unambiguous 'attending' reply from a known guest", async () => {
    const db = fakeDb();
    const result = await handleIncomingMessage(db, GUESTS, "917995781657@c.us", "Yes we'll be there!");
    expect(result).toEqual({ matched: true, intent: "attending", applied: true });

    // logged
    expect(db.post).toHaveBeenCalledWith("/whatsapp_replies", expect.objectContaining({
      guest_id: "guest-1",
      classified_intent: "attending",
      applied_to_rsvp: true,
    }));
    // applied (new rsvp row inserted, since db.get returns [] by default)
    expect(db.post).toHaveBeenCalledWith("/rsvps", expect.objectContaining({
      guest_id: "guest-1",
      response: "attending",
    }));
  });

  it("logs but does not apply an unclear reply from a known guest", async () => {
    const db = fakeDb();
    const result = await handleIncomingMessage(db, GUESTS, "919444390573@c.us", "Congratulations!");
    expect(result).toEqual({ matched: true, intent: "unclear", applied: false });

    expect(db.post).toHaveBeenCalledWith("/whatsapp_replies", expect.objectContaining({
      guest_id: "guest-2",
      classified_intent: "unclear",
      applied_to_rsvp: false,
    }));
    expect(db.post).not.toHaveBeenCalledWith("/rsvps", expect.anything());
  });
});
