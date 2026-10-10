import { describe, it, expect, vi } from "vitest";
import { applyRsvpFromIntent } from "../scripts/lib/rsvp-apply.mjs";

function fakeDb(overrides = {}) {
  return {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

describe("applyRsvpFromIntent", () => {
  it("does nothing and returns applied:false for 'unclear'", async () => {
    const db = fakeDb();
    const result = await applyRsvpFromIntent(db, "guest-1", "unclear");
    expect(result).toEqual({ applied: false });
    expect(db.get).not.toHaveBeenCalled();
    expect(db.post).not.toHaveBeenCalled();
    expect(db.patch).not.toHaveBeenCalled();
  });

  it("inserts a new rsvp row (guest_count: 1) when none exists yet", async () => {
    const db = fakeDb({ get: vi.fn().mockResolvedValue([]) });
    const result = await applyRsvpFromIntent(db, "guest-1", "attending");
    expect(result).toEqual({ applied: true });
    expect(db.post).toHaveBeenCalledWith("/rsvps", {
      guest_id: "guest-1",
      response: "attending",
      guest_count: 1,
    });
    expect(db.patch).not.toHaveBeenCalled();
  });

  it("patches only the response field when a rsvp row already exists", async () => {
    const db = fakeDb({ get: vi.fn().mockResolvedValue([{ id: "rsvp-1" }]) });
    const result = await applyRsvpFromIntent(db, "guest-1", "not_attending");
    expect(result).toEqual({ applied: true });
    expect(db.post).not.toHaveBeenCalled();
    const [path, body] = db.patch.mock.calls[0];
    expect(path).toBe("/rsvps?id=eq.rsvp-1");
    expect(body.response).toBe("not_attending");
    expect(body).not.toHaveProperty("guest_count");
    expect(body).not.toHaveProperty("meal_pref");
    expect(body).not.toHaveProperty("attending_events");
  });

  it("applies a 'maybe' downgrade over an existing rsvp the same way as any other classification", async () => {
    const db = fakeDb({ get: vi.fn().mockResolvedValue([{ id: "rsvp-1" }]) });
    const result = await applyRsvpFromIntent(db, "guest-1", "maybe");
    expect(result).toEqual({ applied: true });
    expect(db.patch).toHaveBeenCalled();
  });
});
