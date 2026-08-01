import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validateSession } from "@/lib/session-check";

const VALID_RESPONSES = ["attending", "not_attending", "maybe"] as const;
type RsvpResponse = (typeof VALID_RESPONSES)[number];

export async function GET(req: NextRequest) {
  const session = await validateSession(req, "rsvp_get", {});
  if (session instanceof NextResponse) return session;
  if (!session.guest_id) return NextResponse.json({ rsvp: null });

  const { data } = await supabase
    .from("rsvps")
    .select("response, plus_one, plus_one_name, dietary_notes, updated_at")
    .eq("guest_id", session.guest_id)
    .maybeSingle();

  return NextResponse.json({ rsvp: data ?? null });
}

export async function POST(req: NextRequest) {
  const session = await validateSession(req, "rsvp_submit", {});
  if (session instanceof NextResponse) return session;
  if (!session.guest_id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { response, plus_one, plus_one_name, dietary_notes } = body as {
    response?: string;
    plus_one?: boolean;
    plus_one_name?: string;
    dietary_notes?: string;
  };

  if (!response || !VALID_RESPONSES.includes(response as RsvpResponse)) {
    return NextResponse.json({ error: "invalid_response" }, { status: 400 });
  }

  const isAttending = response === "attending" || response === "maybe";
  const hasPlusOne = isAttending && plus_one === true;
  const cleanPlusOneName = hasPlusOne ? (plus_one_name?.trim() ?? null) : null;
  const cleanNotes = dietary_notes?.trim() || null;

  const { data, error } = await supabase
    .from("rsvps")
    .upsert(
      {
        guest_id: session.guest_id,
        response,
        plus_one: hasPlusOne,
        plus_one_name: cleanPlusOneName,
        dietary_notes: cleanNotes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "guest_id" }
    )
    .select("response, plus_one, plus_one_name, dietary_notes, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rsvp: data });
}
