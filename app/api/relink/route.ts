import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logEvent } from "@/lib/breach";

// Relinks an existing guest to a new device after session reset.
// Does NOT create new guests — only matches name+city to an existing row.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { name, city, device_uuid, browser_signals_hash, user_agent } = body as {
    name?: string;
    city?: string;
    device_uuid?: string;
    browser_signals_hash?: string;
    user_agent?: string;
  };

  if (!name || !city || !device_uuid) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  // Check if device already has an active session
  const { data: existingFp } = await supabase
    .from("device_fingerprints")
    .select("session_token, guests ( name, city, invitation_seen )")
    .eq("device_uuid", device_uuid)
    .maybeSingle();

  if (existingFp) {
    const g = existingFp.guests as unknown as { name: string; city: string; invitation_seen: boolean } | null;
    return NextResponse.json({
      session_token: existingFp.session_token,
      name: g?.name,
      city: g?.city,
      invitation_seen: g?.invitation_seen ?? false,
    });
  }

  // Look up existing guest by name + city (case-insensitive)
  const { data: guest } = await supabase
    .from("guests")
    .select("id, name, city, invitation_seen")
    .ilike("name", name.trim())
    .ilike("city", city.trim())
    .maybeSingle();

  if (!guest) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    void logEvent(device_uuid, "relink_failed", { attempted_name: name.trim(), attempted_city: city.trim() }, ip, null);
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Create a new fingerprint for this device
  const { data: fp, error: fpError } = await supabase
    .from("device_fingerprints")
    .insert({
      guest_id: guest.id,
      device_uuid,
      browser_signals_hash: browser_signals_hash ?? "",
      user_agent: user_agent ?? null,
    })
    .select("session_token")
    .single();

  if (fpError || !fp) {
    return NextResponse.json({ error: "failed to relink" }, { status: 500 });
  }

  return NextResponse.json({
    session_token: fp.session_token,
    name: guest.name,
    city: guest.city,
    invitation_seen: guest.invitation_seen,
  });
}
