import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { name, city, email, device_uuid, browser_signals_hash } = body as {
    name?: string;
    city?: string;
    email?: string;
    device_uuid?: string;
    browser_signals_hash?: string;
  };

  if (!name || !city || !device_uuid) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  // Return existing token if this device already registered
  const { data: existing } = await supabase
    .from("device_fingerprints")
    .select("session_token")
    .eq("device_uuid", device_uuid)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ session_token: existing.session_token });
  }

  let guestId: string;

  if (email) {
    const { data: existingGuest, error: existingGuestError } = await supabase
      .from("guests")
      .select("id, name, city")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (existingGuestError) {
      console.error("[register] existing guest lookup error:", existingGuestError);
      return NextResponse.json({ error: "failed to verify guest" }, { status: 500 });
    }

    if (existingGuest) {
      guestId = existingGuest.id;
      // If same email is put again with a different name or city, update that in the guest list
      if (existingGuest.name !== name || existingGuest.city !== city) {
        const { error: updateError } = await supabase
          .from("guests")
          .update({ name, city })
          .eq("id", guestId);

        if (updateError) {
          console.error("[register] existing guest update error:", updateError);
        }
      }
    } else {
      // Create new guest with email
      const { data: guest, error: guestError } = await supabase
        .from("guests")
        .insert({ name, city, email: email.trim().toLowerCase() })
        .select("id")
        .single();

      if (guestError || !guest) {
        console.error("[register] guest insert error:", guestError);
        return NextResponse.json({ error: "failed to create guest" }, { status: 500 });
      }
      guestId = guest.id;
    }
  } else {
    // Create new guest without email (legacy fallback)
    const { data: guest, error: guestError } = await supabase
      .from("guests")
      .insert({ name, city })
      .select("id")
      .single();

    if (guestError || !guest) {
      console.error("[register] guest insert error:", guestError);
      return NextResponse.json({ error: "failed to create guest" }, { status: 500 });
    }
    guestId = guest.id;
  }

  const { data: fp, error: fpError } = await supabase
    .from("device_fingerprints")
    .insert({
      guest_id: guestId,
      device_uuid,
      browser_signals_hash: browser_signals_hash ?? "",
    })
    .select("session_token")
    .single();

  if (fpError || !fp) {
    console.error("[register] fingerprint insert error:", fpError);
    return NextResponse.json({ error: "failed to create device" }, { status: 500 });
  }

  return NextResponse.json({ session_token: fp.session_token });
}
