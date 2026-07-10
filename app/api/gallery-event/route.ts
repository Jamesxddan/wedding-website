import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validateSession } from "@/lib/session-check";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    type?: string;
    metadata?: Record<string, unknown>;
  };

  if (!body.type) {
    return NextResponse.json({ error: "missing type" }, { status: 400 });
  }

  const session = await validateSession(req, "gallery_event", { event_type: body.type });

  if (session instanceof NextResponse) return session;

  await supabase.from("gallery_events").insert({
    guest_id:    session.guest_id,
    device_uuid: session.device_uuid,
    event_type:  body.type,
    metadata:    body.metadata ?? null,
  });

  // Also surface gallery_open in the main phase_view event_data so it appears
  // alongside FIRST_VISIT / RETURN_VISIT in the access_logs row for this device.
  if (body.type === "gallery_open") {
    const { logEvent } = await import("@/lib/breach");
    await logEvent(
      session.device_uuid,
      "phase_view",
      { GALLERY: new Date().toISOString() },
      null,
      session.guest_id,
    );
  }

  return NextResponse.json({ ok: true });
}
