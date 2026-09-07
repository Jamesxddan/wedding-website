import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { normalizeEmail, hashOtpCode, OTP_MAX_ATTEMPTS } from "@/lib/email-otp";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { email, code, device_uuid, user_agent, browser_signals_hash } = body as {
    email?: string;
    code?: string;
    device_uuid?: string;
    user_agent?: string;
    browser_signals_hash?: string;
  };

  if (!email || !code || !device_uuid) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const normalizedEmail = normalizeEmail(email);

  const { data: otpRow } = await supabase
    .from("email_otps")
    .select("code_hash, attempts, expires_at")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (!otpRow || new Date(otpRow.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "expired_or_missing" }, { status: 410 });
  }

  const submittedHash = hashOtpCode(normalizedEmail, code.trim());
  if (submittedHash !== otpRow.code_hash) {
    const attempts = otpRow.attempts + 1;
    await supabase.from("email_otps").update({ attempts }).eq("email", normalizedEmail);

    if (attempts >= OTP_MAX_ATTEMPTS) {
      return NextResponse.json({ error: "max_attempts", must_resend: true }, { status: 403 });
    }
    return NextResponse.json(
      { error: "invalid_code", attempts_remaining: OTP_MAX_ATTEMPTS - attempts },
      { status: 403 }
    );
  }

  await supabase
    .from("email_otps")
    .update({ verified_at: new Date().toISOString() })
    .eq("email", normalizedEmail);

  const { data: guest } = await supabase
    .from("guests")
    .select("id, name, city")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (!guest) {
    return NextResponse.json({ status: "register", email: normalizedEmail });
  }

  const { data: existingFp } = await supabase
    .from("device_fingerprints")
    .select("session_token")
    .eq("device_uuid", device_uuid)
    .maybeSingle();

  let sessionToken: string;
  if (existingFp) {
    sessionToken = existingFp.session_token;
    await supabase
      .from("device_fingerprints")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("device_uuid", device_uuid);
  } else {
    const { data: newFp, error: fpError } = await supabase
      .from("device_fingerprints")
      .insert({
        guest_id: guest.id,
        device_uuid,
        browser_signals_hash: browser_signals_hash ?? "",
        user_agent: user_agent ?? null,
      })
      .select("session_token")
      .single();

    if (fpError || !newFp) {
      return NextResponse.json({ error: "failed to create device fingerprint" }, { status: 500 });
    }
    sessionToken = newFp.session_token;
  }

  await supabase.from("guests").update({ invitation_seen: true }).eq("id", guest.id);

  return NextResponse.json({
    status: "relinked",
    session_token: sessionToken,
    name: guest.name,
    city: guest.city,
  });
}
