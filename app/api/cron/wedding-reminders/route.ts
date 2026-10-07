import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendReminderEmail, type ReminderType } from "@/lib/rsvp-email";

// Wedding date in IST (UTC+5:30)
const WEDDING_DATE_IST = new Date("2026-10-08T00:00:00+05:30");

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Whole-day number on the IST calendar. Both "today" and the wedding date must be shifted into IST
// *before* truncating to a day - otherwise 2026-10-08T00:00+05:30 (= Oct 7 18:30 UTC) lands on Oct 7
// and every reminder fires one day early.
function istDayNumber(d: Date): number {
  return Math.floor((d.getTime() + IST_OFFSET_MS) / DAY_MS);
}

function daysUntilWedding(): number {
  return istDayNumber(WEDDING_DATE_IST) - istDayNumber(new Date());
}

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const days = daysUntilWedding();

  const typeMap: Record<number, ReminderType> = {
    2: "two_days_before",
    1: "day_before",
    0: "wedding_day",
  };

  // ?type=one_hour_before is fired by its own one-off cron entry on the wedding afternoon (see vercel.json).
  // It only ever runs on the wedding day itself, whatever else calls it.
  const wantsHourBefore = req.nextUrl.searchParams.get("type") === "one_hour_before";
  if (wantsHourBefore && days !== 0) {
    return NextResponse.json({ skipped: true, reason: "one_hour_before only runs on the wedding day", days_until_wedding: days });
  }
  const reminderType: ReminderType | undefined = wantsHourBefore ? "one_hour_before" : typeMap[days];
  if (!reminderType) {
    return NextResponse.json({ skipped: true, days_until_wedding: days });
  }

  // Fetch all attending guests with emails
  const { data: rsvps, error } = await supabase
    .from("rsvps")
    .select(`
      guest_count,
      meal_pref,
      attending_events,
      guests!inner(id, name, email)
    `)
    .in("response", ["attending", "maybe"])
    .not("guests.email", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = { sent: 0, failed: 0, skipped: 0 };

  for (const row of rsvps ?? []) {
    // Supabase returns the joined relation as an array when using !inner
    const guestRaw = (row as unknown as { guests: { name: string; email: string } | { name: string; email: string }[] }).guests;
    const guest = Array.isArray(guestRaw) ? guestRaw[0] : guestRaw;
    if (!guest?.email) { results.skipped++; continue; }
    // reception-only guests aren't at the 4:30 ceremony, so the "about an hour" email is not for them
    if (reminderType === "one_hour_before" && row.attending_events === "reception") { results.skipped++; continue; }

    try {
      await sendReminderEmail(reminderType, {
        name: guest.name,
        email: guest.email,
        guest_count: row.guest_count,
        meal_pref: row.meal_pref as "veg" | "non_veg" | null,
        attending_events: row.attending_events as "ceremony" | "reception" | "both" | null,
      });
      results.sent++;
    } catch {
      results.failed++;
    }
  }

  return NextResponse.json({ type: reminderType, days_until_wedding: days, ...results });
}
