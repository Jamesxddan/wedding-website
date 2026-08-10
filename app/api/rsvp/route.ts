import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validateSession } from "@/lib/session-check";
import { sendRsvpConfirmation } from "@/lib/rsvp-email";

const VALID_RESPONSES = ["attending", "not_attending", "maybe"] as const;
const VALID_MEAL_PREFS = ["veg", "non_veg"] as const;
const VALID_EVENTS = ["ceremony", "reception", "both"] as const;

type RsvpResponse = (typeof VALID_RESPONSES)[number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(req: NextRequest) {
  const session = await validateSession(req, "rsvp_get", {});
  if (session instanceof NextResponse) return session;
  if (!session.guest_id) return NextResponse.json({ rsvp: null, has_email: false });

  const [rsvpResult, guestResult] = await Promise.all([
    supabase
      .from("rsvps")
      .select("response, guest_count, meal_pref, attending_events, updated_at")
      .eq("guest_id", session.guest_id)
      .maybeSingle(),
    supabase
      .from("guests")
      .select("email")
      .eq("id", session.guest_id)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    rsvp: rsvpResult.data ?? null,
    has_email: !!guestResult.data?.email,
  });
}

export async function POST(req: NextRequest) {
  const session = await validateSession(req, "rsvp_submit", {});
  if (session instanceof NextResponse) return session;
  if (!session.guest_id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { response, guest_count, meal_pref, attending_events, email } = body as {
    response?: string;
    guest_count?: number;
    meal_pref?: string;
    attending_events?: string;
    email?: string;
  };

  if (!response || !VALID_RESPONSES.includes(response as RsvpResponse)) {
    return NextResponse.json({ error: "invalid_response" }, { status: 400 });
  }

  const isAttending = response === "attending" || response === "maybe";

  if (isAttending) {
    if (!meal_pref || !VALID_MEAL_PREFS.includes(meal_pref as typeof VALID_MEAL_PREFS[number])) {
      return NextResponse.json({ error: "meal_pref_required" }, { status: 400 });
    }
    if (!attending_events || !VALID_EVENTS.includes(attending_events as typeof VALID_EVENTS[number])) {
      return NextResponse.json({ error: "attending_events_required" }, { status: 400 });
    }
  }

  const count = isAttending ? Math.max(1, Math.min(20, Number(guest_count) || 1)) : 1;

  // Save email if provided and valid (best-effort — ignore unique constraint conflicts)
  let savedEmail: string | null = null;
  if (email && typeof email === "string" && EMAIL_RE.test(email.trim())) {
    const cleanEmail = email.trim().toLowerCase();
    const { data: existingGuest } = await supabase
      .from("guests")
      .select("email")
      .eq("id", session.guest_id)
      .maybeSingle();

    if (!existingGuest?.email) {
      // Only update if they don't already have one (avoid clobbering)
      const { error: emailErr } = await supabase
        .from("guests")
        .update({ email: cleanEmail })
        .eq("id", session.guest_id);
      if (!emailErr) savedEmail = cleanEmail;
    } else {
      savedEmail = existingGuest.email;
    }
  } else {
    // Fetch existing email for confirmation send
    const { data: g } = await supabase
      .from("guests")
      .select("email")
      .eq("id", session.guest_id)
      .maybeSingle();
    savedEmail = g?.email ?? null;
  }

  const { data, error } = await supabase
    .from("rsvps")
    .upsert(
      {
        guest_id: session.guest_id,
        response,
        guest_count: count,
        meal_pref: isAttending ? meal_pref : null,
        attending_events: isAttending ? attending_events : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "guest_id" }
    )
    .select("response, guest_count, meal_pref, attending_events, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send confirmation email (fire-and-forget)
  if (savedEmail) {
    const { data: guest } = await supabase
      .from("guests")
      .select("name")
      .eq("id", session.guest_id)
      .maybeSingle();

    if (guest?.name) {
      void sendRsvpConfirmation({
        name: guest.name,
        email: savedEmail,
        response: data.response as "attending" | "not_attending" | "maybe",
        guest_count: data.guest_count,
        meal_pref: data.meal_pref as "veg" | "non_veg" | null,
        attending_events: data.attending_events as "ceremony" | "reception" | "both" | null,
      });
    }
  }

  return NextResponse.json({ rsvp: data, has_email: !!savedEmail });
}
