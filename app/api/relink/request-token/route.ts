import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateRelinkToken } from "@/lib/relink-token";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const {
    guest_id,
    browser_signals_hash,
    user_agent,
  } = body as {
    guest_id?: string;
    browser_signals_hash?: string;
    user_agent?: string;
  };

  if (!guest_id) {
    return NextResponse.json(
      { error: "no trusted device found for guest" },
      { status: 404 }
    );
  }

  // Look up the trusted device for this guest
  const { data: fp, error } = await supabase
    .from("device_fingerprints")
    .select("device_uuid")
    .eq("guest_id", guest_id)
    .order("last_seen_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !fp) {
    return NextResponse.json(
      { error: "no trusted device found for guest" },
      { status: 404 }
    );
  }

  const token = await generateRelinkToken({
    device_uuid: fp.device_uuid,
    guest_id,
  });

  // Token expires in 15 minutes
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  return NextResponse.json({ token, expires_at: expiresAt });
}