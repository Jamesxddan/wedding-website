// Upserts a guest's RSVP response from a classified WhatsApp intent. Only
// ever writes the `response` field — an existing row's guest_count,
// meal_pref, and attending_events (set via the website form, which can
// capture more than a one-line text reply can) are never touched.
export async function applyRsvpFromIntent(db, guestId, intent) {
  if (intent !== "attending" && intent !== "not_attending" && intent !== "maybe") {
    return { applied: false };
  }

  const existing = await db.get(`/rsvps?guest_id=eq.${guestId}&select=id`);

  if (existing.length > 0) {
    await db.patch(`/rsvps?id=eq.${existing[0].id}`, {
      response: intent,
      updated_at: new Date().toISOString(),
    });
  } else {
    await db.post("/rsvps", {
      guest_id: guestId,
      response: intent,
      guest_count: 1,
    });
  }

  return { applied: true };
}
