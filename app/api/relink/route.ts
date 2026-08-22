import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { normalizeForStorage } from "@/lib/phone";
import { logEvent } from "@/lib/breach";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const {
    token,
    device_uuid,
    browser_signals_hash,
    user_agent,
    name,
    city,
    email,
    phone,
    lookup,
    device_uuid: newDeviceUuid,
  } = body as {
    token?: string;
    device_uuid?: string;
    browser_signals_hash?: string;
    user_agent?: string;
    name?: string;
    city?: string;
    email?: string;
    phone?: string;
    lookup?: boolean;
    device_uuid: string;
    browser_signals_hash?: string;
    user_agent?: string;
  };

  // Handle token verification flow
  if (token) {
    // Verify token and get payload
    const { verifyRelinkToken } = await import("@/lib/relink-token");
    const tokenResult = verifyRelinkToken(token);
    if (!tokenResult.valid) {
      return NextResponse.json(
        { error: "invalid or expired token" },
        { status: 403 }
      );
    }

    const payload = tokenResult.payload;

    // Look up guest by the device_uuid from the token (the "trusted" device)
    const { data: fp } = await supabase
      .from("device_fingerprints")
      .select(`session_token, guest_id, guests ( id, name, city, invitation_seen, is_owner )`)
      .eq("device_uuid", payload.device_uuid)
      .maybeSingle();

    if (!fp) {
      return NextResponse.json({ error: "device not found" }, { status: 404 });
    }

    const guest = fp.guests as unknown as {
      id: string; name: string; city: string; invitation_seen: boolean; is_owner: boolean;
    } | null;

    if (!guest) {
      return NextResponse.json({ error: "guest not found" }, { status: 404 });
    }

    // Check if this device already has a session
    const { data: existingFp } = await supabase
      .from("device_fingerprints")
      .select("session_token")
      .eq("device_uuid", device_uuid)
      .maybeSingle();

    if (existingFp) {
      // Device already linked, just return session and update
      await supabase.from("guests").update({ invitation_seen: true }).eq("id", guest.id);
      await supabase
        .from("device_fingerprints")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("device_uuid", device_uuid);

      return NextResponse.json({
        session_token: existingFp.session_token,
        name: guest.name,
        city: guest.city,
        invitation_seen: true,
      });
    }

    // Create new fingerprint binding the new device to the existing guest
    const { data: newFp, error: fpError } = await supabase
      .from("device_fingerprints")
      .insert({
        guest_id: guest.id,
        device_uuid: newDeviceUuid ?? crypto.randomUUID(),
        browser_signals_hash: browser_signals_hash ?? "",
        user_agent: user_agent ?? null,
      })
      .select("session_token")
      .single();

    if (fpError || !newFp) {
      return NextResponse.json({ error: "failed to create device fingerprint" }, { status: 500 });
    }

    // Mark invitation as seen
    await supabase.from("guests").update({ invitation_seen: true }).eq("id", guest.id);

    return NextResponse.json({
      session_token: newFp.session_token,
      name: guest.name,
      city: guest.city,
      invitation_seen: true,
    });
  }

  // Handle original relink flow (name+city lookup)
  if (name && city) {
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
      const normalizedPhone = normalizeForStorage(guest.mobile);
      const inputPhone = normalizeForStorage(phone);
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

    // For verifyMethod === "none" case, require the signed token flow
    const method = guest.mobile ? "phone" : guest.email ? "email" : "none";
    if (method === "none") {
      // Token-based verification is required
      return NextResponse.json({
        error: "token_required",
        message: "Please verify your identity using the secure link sent to your original device",
      }, { status: 403 });
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
        device_uuid: device_uuid,
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

  // Invalid request
  return NextResponse.json({ error: "missing required fields" }, { status: 400 });
}