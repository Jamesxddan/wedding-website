import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logEvent } from "@/lib/breach";
import { randomBytes } from "crypto";

// Token store (in-memory for this process)
const tokenMap = new Map<string, { guest_id: string; newDeviceUuid: string; confirmed: boolean; session_token?: string; }>();
const SECRET = process.env.RELINK_TOKEN_SECRET || "fallback-secret-change-in-production";
const TOKEN_EXPIRY_MINUTES = 15;

function signToken(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload));
  const key = Buffer.from(SECRET);
  return require("crypto")
    .createHmac("sha256", key)
    .update(data)
    .digest("base64url");
}

function verifyToken(token: string): { valid: boolean; payload?: any } {
  try {
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return { valid: false };

    const data = Buffer.from(payloadB64, "base64url");
    const key = Buffer.from(SECRET);
    const expected = require("crypto")
      .createHmac("sha256", key)
      .update(data)
      .digest("base64url");

    if (expected !== signature) return { valid: false };

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());

    if (payload.exp && Date.now() > payload.exp * 1000) {
      return { valid: false };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false };
  }
}

export async function POST(req: NextRequest) {
  const { pathname } = new URL(req.url);

  if (pathname.endsWith("/request-token")) {
    return handleRequestToken(req);
  }

  if (pathname.endsWith("/confirm")) {
    return handleConfirmToken(req);
  }

  return handleOriginalRelink(req);
}

async function handleRequestToken(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { guest_id, guest_name, guest_city, device_uuid: newDeviceUuid, browser_signals_hash, user_agent } = body as {
    guest_id?: string;
    guest_name?: string;
    guest_city?: string;
    device_uuid?: string;
    browser_signals_hash?: string;
    user_agent?: string;
  };

  // Look up the guest to find their trusted device
  let trustedDeviceUuid: string | null = null;

  if (guest_id) {
    const { data: fp } = await supabase
      .from("device_fingerprints")
      .select("device_uuid")
      .eq("guest_id", guest_id)
      .order("last_seen_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    trustedDeviceUuid = fp?.device_uuid ?? null;
  } else if (guest_name && guest_city) {
    const { data: guest } = await supabase
      .from("guests")
      .select("id")
      .ilike("name", guest_name.trim())
      .ilike("city", guest_city.trim())
      .maybeSingle();
    if (guest) {
      const { data: fp } = await supabase
        .from("device_fingerprints")
        .select("device_uuid")
        .eq("guest_id", guest.id)
        .order("last_seen_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      trustedDeviceUuid = fp?.device_uuid ?? null;
    }
  }

  if (!trustedDeviceUuid) {
    return NextResponse.json({ error: "no trusted device found for guest" }, { status: 404 });
  }

  // Create a one-time nonce
  const nonce = randomBytes(16).toString("hex");
  const expires = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_MINUTES * 60;

  const payload = {
    device_uuid: trustedDeviceUuid, // The TRUSTED device's UUID (for verification)
    nonce,
    exp: expires,
    guest_id,
    guest_name,
    guest_city,
    // Include browser signals for additional binding (optional)
    browser_signals_hash: browser_signals_hash || "",
    user_agent: user_agent || ""
  };

  const token = signToken(payload);

  // Store mapping: token -> {guest_id, newDeviceUuid, confirmed, session_token}
  tokenMap.set(token, {
    guest_id: guest_id!,
    newDeviceUuid: newDeviceUuid!,
    confirmed: false
  });

  return NextResponse.json({
    token,
    expires_at: new Date(expires * 1000).toISOString()
  });
}

async function handleConfirmToken(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { token, device_uuid, browser_signals_hash, user_agent } = body as {
    token?: string;
    device_uuid?: string;
    browser_signals_hash?: string;
    user_agent?: string;
  };

  if (!token || !device_uuid) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const tokenData = tokenMap.get(token);
  if (!tokenData) {
    // No stored token or already consumed
    return NextResponse.json({ error: "invalid or expired token" }, { status: 403 });
  }

  if (tokenData.confirmed) {
    // Token already used
    return NextResponse.json({ error: "token already consumed" }, { status: 403 });
  }

  const tokenResult = verifyToken(token);
  if (!tokenResult.valid) {
    tokenMap.delete(token);
    return NextResponse.json({ error: "invalid or expired token" }, { status: 403 });
  }

  const payload = tokenResult.payload;

  // Optional: additional binding checks
  if (payload.browser_signals_hash &&
      payload.browser_signals_hash !== browser_signals_hash) {
    // Log but don't fail - browser signals can change slightly
    console.warn("Browser signals hash mismatch during relink confirmation");
  }

  // Look up guest by the device_uuid from the token (the "trusted" device)
  const { data: fp } = await supabase
    .from("device_fingerprints")
    .select(`session_token, guest_id, guests ( id, name, city, invitation_seen, is_owner )`)
    .eq("device_uuid", payload.device_uuid)
    .maybeSingle();

  if (!fp) {
    tokenMap.delete(token);
    return NextResponse.json({ error: "device not found" }, { status: 404 });
  }

  const guest = fp.guests as unknown as {
    id: string; name: string; city: string; invitation_seen: boolean; is_owner: boolean;
  } | null;

  if (!guest) {
    tokenMap.delete(token);
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

    // Mark token as consumed and store session_token
    tokenData.confirmed = true;
    tokenData.session_token = existingFp.session_token;

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
      device_uuid: device_uuid,
      browser_signals_hash: browser_signals_hash ?? "",
      user_agent: user_agent ?? null,
    })
    .select("session_token")
    .single();

  if (fpError || !newFp) {
    tokenMap.delete(token);
    return NextResponse.json({ error: "failed to create device fingerprint" }, { status: 500 });
  }

  // Mark invitation as seen
  await supabase.from("guests").update({ invitation_seen: true }).eq("id", guest.id);

  // Mark token as consumed and store session_token
  tokenData.confirmed = true;
  tokenData.session_token = newFp.session_token;

  return NextResponse.json({
    session_token: newFp.session_token,
    name: guest.name,
    city: guest.city,
    invitation_seen: true,
  });
}

// Keep original relink function for email/phone verification path
async function handleOriginalRelink(req: NextRequest) {
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

  // For verifyMethod === "none" case, require the signed token flow
  const method = guest.mobile ? "phone" : guest.email ? "email" : "none";
  if (method === "none") {
    // Require token-based verification for security
    return NextResponse.json({
      error: "token_required",
      message: "Please verify your identity using the secure link sent to your original device"
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