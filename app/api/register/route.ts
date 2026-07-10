import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { name, city, email, mobile, device_uuid, browser_signals_hash } = body as {
    name?: string;
    city?: string;
    email?: string;
    mobile?: string;
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
  const normalizedEmail = email?.trim().toLowerCase() || null;
  const normalizedMobile = mobile?.trim() || null;

  let existingGuest: { id: string; name: string; city: string; email: string | null; mobile: string | null } | null = null;

  // 1. Query by Mobile (Highest Precedence)
  if (normalizedMobile) {
    const { data, error } = await supabase
      .from("guests")
      .select("id, name, city, email, mobile")
      .eq("mobile", normalizedMobile)
      .maybeSingle();

    if (error) {
      console.error("[register] existing guest mobile lookup error:", error);
      return NextResponse.json({ error: "failed to verify guest" }, { status: 500 });
    }
    if (data) {
      existingGuest = data;
    }
  }

  // 2. Query by Email (Secondary Precedence, if not resolved by mobile yet)
  if (!existingGuest && normalizedEmail) {
    const { data, error } = await supabase
      .from("guests")
      .select("id, name, city, email, mobile")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error("[register] existing guest email lookup error:", error);
      return NextResponse.json({ error: "failed to verify guest" }, { status: 500 });
    }
    if (data) {
      existingGuest = data;
    }
  }

  // 3. Handle reuse & updates vs. insert new guest
  if (existingGuest) {
    guestId = existingGuest.id;

    // Check what needs to be updated
    const updates: Record<string, unknown> = {};
    if (existingGuest.name !== name) updates.name = name;
    if (existingGuest.city !== city) updates.city = city;

    // Mobile Precedence updates Email
    if (normalizedEmail && existingGuest.email !== normalizedEmail) {
      updates.email = normalizedEmail;
    }
    // Email lookup adds/updates Mobile
    if (normalizedMobile && existingGuest.mobile !== normalizedMobile) {
      updates.mobile = normalizedMobile;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("guests")
        .update(updates)
        .eq("id", guestId);

      if (updateError) {
        console.error("[register] existing guest update error:", updateError);
      }
    }
  } else {
    // Create new guest
    const insertObj: Record<string, unknown> = { name, city };
    if (normalizedEmail) insertObj.email = normalizedEmail;
    if (normalizedMobile) insertObj.mobile = normalizedMobile;

    const { data: guest, error: guestError } = await supabase
      .from("guests")
      .insert(insertObj)
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
