import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyRelinkToken } from "@/lib/relink-token";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const {
    token,
    device_uuid,
    browser_signals_hash,
    user_agent,
  } = body as {
    token?: string;
    device_uuid?: string;
    browser_signals_hash?: string;
    user_agent?: string;
  };

  if (!token || !device_uuid) {
    return NextResponse.json(
      { error: "missing required fields" },
      { status: 400 }
    );
  }

  const tokenResult = verifyRelinkToken(token);
  if (!tokenResult.valid) {
    return NextResponse.json(
      { error: "invalid or expired token" },
      { status: 403 }
    );
  }

  const payload = tokenResult.payload;

  // Check if this device already has a session
  const { data: existingFp } = await supabase
    .from("device_fingerprints")
    .select("session_token")
    .eq("device_uuid", device_uuid)
    .maybeSingle();

  if (existingFp) {
    // Device already linked, just return session and update
    await supabase
      .from("guests")
      .update({ invitation_seen: true })
      .eq("id", payload.guest_id);
    await supabase
      .from("device_fingerprints")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("device_uuid", device_uuid);

    // Get guest name and city
    const { data: guest } = await supabase
      .from("guests")
      .select("name, city")
      .eq("id", payload.guest_id)
      .single();

    return NextResponse.json({
      session_token: existingFp.session_token,
      name: guest?.name,
      city: guest?.city,
      invitation_seen: true,
    });
  }

  // Create new fingerprint binding the new device to the existing guest
  const { data: newFp, error: fpError } = await supabase
    .from("device_fingerprints")
    .insert({
      guest_id: payload.guest_id,
      device_uuid,
      browser_signals_hash: browser_signals_hash ?? "",
      user_agent: user_agent ?? null,
    })
    .select("session_token")
    .single();

  if (fpError || !newFp) {
    return NextResponse.json(
      { error: "failed to create device fingerprint" },
      { status: 500 }
    );
  }

  // Mark invitation as seen
  await supabase
    .from("guests")
    .update({ invitation_seen: true })
    .eq("id", payload.guest_id);

  // Get guest name and city
  const { data: guest } = await supabase
    .from("guests")
    .select("name, city")
    .eq("id", payload.guest_id)
    .single();

  return NextResponse.json({
    session_token: newFp.session_token,
    name: guest?.name,
    city: guest?.city,
    invitation_seen: true,
  });
}