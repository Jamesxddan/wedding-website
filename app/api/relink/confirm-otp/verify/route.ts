import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { hashOtpCode, OTP_MAX_ATTEMPTS } from "@/lib/email-otp";

// Verifies an OTP sent to a specific, already-matched guest's own registered
// email (see confirm-otp/request). Unlike /api/relink/email-otp/verify (which
// searches for ANY guest matching a visitor-typed email), this is scoped to
// one already-known guest_id — a correct code binds this device directly to
// that guest, no separate guest lookup needed.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { guest_id, code, device_uuid, user_agent, browser_signals_hash } = body as {
    guest_id?: string;
    code?: string;
    device_uuid?: string;
    user_agent?: string;
    browser_signals_hash?: string;
  };

  if (!guest_id || !code || !device_uuid) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const { data: guest } = await supabase
    .from("guests")
    .select("id, name, city, email")
    .eq("id", guest_id)
    .maybeSingle();

  if (!guest || !guest.email) {
    return NextResponse.json({ error: "guest not found" }, { status: 404 });
  }

  const { data: otpRow } = await supabase
    .from("email_otps")
    .select("code_hash, attempts, expires_at")
    .eq("email", guest.email)
    .maybeSingle();

  if (!otpRow || new Date(otpRow.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "expired_or_missing" }, { status: 410 });
  }

  const submittedHash = hashOtpCode(guest.email, code.trim());
  if (submittedHash !== otpRow.code_hash) {
    const attempts = otpRow.attempts + 1;
    await supabase.from("email_otps").update({ attempts }).eq("email", guest.email);

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
    .eq("email", guest.email);

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
