import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  normalizeEmail,
  isDisposableEmail,
  generateOtpCode,
  hashOtpCode,
  OTP_EXPIRY_MS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_MAX_SENDS_PER_HOUR,
} from "@/lib/email-otp";
import { sendOtpEmail } from "@/lib/email-otp-send";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOUR_MS = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { email, device_uuid } = body as { email?: string; device_uuid?: string };

  if (!email || !device_uuid) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const normalizedEmail = normalizeEmail(email);
  if (!EMAIL_RE.test(normalizedEmail)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (isDisposableEmail(normalizedEmail)) {
    return NextResponse.json({ error: "disposable_email" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("email_otps")
    .select("send_count, last_sent_at, window_started_at")
    .eq("email", normalizedEmail)
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
    // else: window rolled over — sendCount/windowStartedAt keep their fresh-window defaults
  }

  const code = generateOtpCode();
  const code_hash = hashOtpCode(normalizedEmail, code);
  const expires_at = new Date(now + OTP_EXPIRY_MS).toISOString();

  const { error } = await supabase.from("email_otps").upsert(
    {
      email: normalizedEmail,
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

  await sendOtpEmail(normalizedEmail, code);

  const isNonProduction = process.env.VERCEL_ENV !== "production";
  return NextResponse.json({ ok: true, ...(isNonProduction ? { debug_code: code } : {}) });
}
