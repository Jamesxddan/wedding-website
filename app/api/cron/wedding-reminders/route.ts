import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendReminderEmail, type ReminderType } from "@/lib/rsvp-email";

// Wedding date in IST (UTC+5:30)
const WEDDING_DATE_IST = new Date("2026-10-08T00:00:00+05:30");

function todayIst(): Date {
  const now = new Date();
  // Shift to IST
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  ist.setUTCHours(0, 0, 0, 0);
  return ist;
}

function daysUntilWedding(): number {
  const today = todayIst();
  const wedding = new Date(WEDDING_DATE_IST);
  wedding.setUTCHours(0, 0, 0, 0);
  return Math.round((wedding.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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

  const reminderType = typeMap[days];
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
