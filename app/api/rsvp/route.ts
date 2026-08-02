import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validateSession } from "@/lib/session-check";

const VALID_RESPONSES = ["attending", "not_attending", "maybe"] as const;
const VALID_MEAL_PREFS = ["veg", "non_veg"] as const;
const VALID_EVENTS = ["ceremony", "reception", "both"] as const;

type RsvpResponse = (typeof VALID_RESPONSES)[number];

export async function GET(req: NextRequest) {
  const session = await validateSession(req, "rsvp_get", {});
  if (session instanceof NextResponse) return session;
  if (!session.guest_id) return NextResponse.json({ rsvp: null });

  const { data } = await supabase
    .from("rsvps")
    .select("response, guest_count, meal_pref, attending_events, updated_at")
    .eq("guest_id", session.guest_id)
    .maybeSingle();

  return NextResponse.json({ rsvp: data ?? null });
}

export async function POST(req: NextRequest) {
  const session = await validateSession(req, "rsvp_submit", {});
  if (session instanceof NextResponse) return session;
  if (!session.guest_id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { response, guest_count, meal_pref, attending_events } = body as {
    response?: string;
    guest_count?: number;
    meal_pref?: string;
    attending_events?: string;
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
  return NextResponse.json({ rsvp: data });
}
