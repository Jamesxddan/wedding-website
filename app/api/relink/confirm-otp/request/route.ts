import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  isDisposableEmail,
  generateOtpCode,
  hashOtpCode,
  OTP_EXPIRY_MS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_MAX_SENDS_PER_HOUR,
} from "@/lib/email-otp";
import { sendOtpEmail } from "@/lib/email-otp-send";

const HOUR_MS = 60 * 60 * 1000;

// Sends an OTP to a specific, already-matched guest's OWN registered email —
// never an address the visitor types. Used by the "Are you <Name>?" identity
// gate on an auto-guessed relink match: confirming "yes" must prove the
// visitor actually controls that guest's inbox, not just that they clicked a
// button. If the guest has no email on file, the client falls back to the
// existing phone-verification step instead (needs_phone: true).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { guest_id, device_uuid } = body as { guest_id?: string; device_uuid?: string };

  if (!guest_id || !device_uuid) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const { data: guest } = await supabase
    .from("guests")
    .select("id, email")
    .eq("id", guest_id)
    .maybeSingle();

  if (!guest) {
    return NextResponse.json({ error: "guest not found" }, { status: 404 });
  }

  if (!guest.email) {
    return NextResponse.json({ needs_phone: true });
  }

  const email = guest.email;

  if (isDisposableEmail(email)) {
    // A guest record shouldn't have a disposable email, but if one slipped
    // in historically, don't get stuck — fall back to phone verification.
    return NextResponse.json({ needs_phone: true });
  }

  const { data: existing } = await supabase
    .from("email_otps")
    .select("send_count, last_sent_at, window_started_at")
    .eq("email", email)
    .maybeSingle();

  const now = Date.now();
  let sendCount = 1;
  let windowStartedAt = new Date(now).toISOString();

  if (existing) {
    const lastSentMs = new Date(existing.last_sent_at).getTime();
    if (now - lastSentMs < OTP_RESEND_COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - lastSentMs)) / 1000);
      return NextResponse.json({ error: "rate_limited", retry_after_seconds: retryAfterSeconds }, { status: 429 });
    }

    const windowStartMs = new Date(existing.window_started_at).getTime();
    const windowStillOpen = now - windowStartMs < HOUR_MS;

    if (windowStillOpen) {
      if (existing.send_count >= OTP_MAX_SENDS_PER_HOUR) {
        const retryAfterSeconds = Math.ceil((HOUR_MS - (now - windowStartMs)) / 1000);
        return NextResponse.json({ error: "rate_limited", retry_after_seconds: retryAfterSeconds }, { status: 429 });
      }
      sendCount = existing.send_count + 1;
      windowStartedAt = existing.window_started_at;
    }
  }

  const code = generateOtpCode();
  const code_hash = hashOtpCode(email, code);
  const expires_at = new Date(now + OTP_EXPIRY_MS).toISOString();

  const { error } = await supabase.from("email_otps").upsert(
    {
      email,
      code_hash,
      device_uuid,
      attempts: 0,
      send_count: sendCount,
      window_started_at: windowStartedAt,
      last_sent_at: new Date(now).toISOString(),
      expires_at,
      verified_at: null,
    },
    { onConflict: "email" }
  );

  if (error) {
    return NextResponse.json({ error: "failed to generate code" }, { status: 500 });
  }

  await sendOtpEmail(email, code);

  const isNonProduction = process.env.VERCEL_ENV !== "production";
  return NextResponse.json({
    ok: true,
    email_hint: email.slice(0, 2) + "***" + (email.includes("@") ? "@" + email.split("@")[1] : ""),
    ...(isNonProduction ? { debug_code: code } : {}),
  });
}
