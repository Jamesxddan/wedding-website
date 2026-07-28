import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logEvent } from "@/lib/breach";

// Relinks an existing guest to a new device after session reset.
// Does NOT create new guests — only matches name+city to an existing row.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { name, city, email, phone, lookup, device_uuid, browser_signals_hash, user_agent } = body as {
    name?: string;
    city?: string;
    email?: string;
    phone?: string;
    lookup?: boolean;
    device_uuid?: string;
    browser_signals_hash?: string;
    user_agent?: string;
  };

  if (!name || !city) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  if (/miz/i.test(name.trim().split(/\s+/)[0])) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Look up existing guest by name + city (case-insensitive)
  const { data: guest } = await supabase
    .from("guests")
    .select("id, name, city, email, mobile, invitation_seen")
    .ilike("name", name.trim())
    .ilike("city", city.trim())
    .maybeSingle();

  if (!guest) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    void logEvent(device_uuid ?? "unknown", "relink_failed", { attempted_name: name.trim(), attempted_city: city.trim() }, ip, null);
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Step 1: Lookup phase — just return what verification method is needed
  if (lookup) {
    const method = guest.mobile ? "phone" : guest.email ? "email" : "none";
    return NextResponse.json({
      ok: true,
      method,
      hint: method === "phone"
        ? guest.mobile.slice(-4)
        : method === "email"
          ? guest.email.slice(0, 3) + "***" + (guest.email.includes("@") ? "@" + guest.email.split("@")[1] : "")
          : undefined,
    });
  }

  // Step 2: Verification phase — validate email or phone before creating fingerprint

  // If guest has a phone on file, require phone match
  if (guest.mobile) {
    if (!phone) {
      return NextResponse.json({ error: "phone_required" }, { status: 400 });
    }
    const normalizedPhone = guest.mobile.replace(/\s+/g, "").toLowerCase();
    const inputPhone = phone.trim().replace(/\s+/g, "").toLowerCase();
    if (normalizedPhone !== inputPhone) {
      return NextResponse.json({ error: "phone_mismatch" }, { status: 403 });
    }
  }

  // If guest has an email on file (and no phone), require email match
  if (!guest.mobile && guest.email) {
    if (!email) {
      return NextResponse.json({ error: "email_required" }, { status: 400 });
    }
    if (guest.email.toLowerCase() !== email.trim().toLowerCase()) {
      return NextResponse.json({ error: "email_mismatch" }, { status: 403 });
    }
  }

  // Check if device already has an active session
  if (device_uuid) {
    const { data: existingFp } = await supabase
      .from("device_fingerprints")
      .select("session_token")
      .eq("device_uuid", device_uuid)
      .maybeSingle();

    if (existingFp) {
      // Mark invitation as seen — relinking user already saw it on their original device
      await supabase.from("guests").update({ invitation_seen: true }).eq("id", guest.id);
      return NextResponse.json({
        session_token: existingFp.session_token,
        name: guest.name,
        city: guest.city,
        invitation_seen: true,
      });
    }
  }

  // Create a new fingerprint for this device
  const { data: fp, error: fpError } = await supabase
    .from("device_fingerprints")
    .insert({
      guest_id: guest.id,
      device_uuid: device_uuid ?? crypto.randomUUID(),
      browser_signals_hash: browser_signals_hash ?? "",
      user_agent: user_agent ?? null,
    })
    .select("session_token")
    .single();

  if (fpError || !fp) {
    return NextResponse.json({ error: "failed to relink" }, { status: 500 });
  }

  // Mark invitation as seen — relinking user already saw it on their original device
  await supabase.from("guests").update({ invitation_seen: true }).eq("id", guest.id);

  return NextResponse.json({
    session_token: fp.session_token,
    name: guest.name,
    city: guest.city,
    invitation_seen: true,
  });
}
