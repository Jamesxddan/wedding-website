import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { device_uuid, browser_signals_hash } = body as {
    device_uuid?: string;
    browser_signals_hash?: string;
  };

  if (!device_uuid) return NextResponse.json({ status: "new" });

  // Primary lookup: device_uuid
  const { data: fp } = await supabase
    .from("device_fingerprints")
    .select(`session_token, guest_id, guests ( name, city, invitation_seen, is_owner )`)
    .eq("device_uuid", device_uuid)
    .maybeSingle();

  if (fp) {
    await supabase
      .from("device_fingerprints")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("device_uuid", device_uuid);

    const guest = fp.guests as unknown as {
      name: string; city: string; invitation_seen: boolean; is_owner: boolean;
    } | null;
    if (!guest) return NextResponse.json({ status: "new" });

    return NextResponse.json({
      status: "known",
      name: guest.name,
      city: guest.city,
      invitation_seen: guest.invitation_seen,
      session_token: fp.session_token,
    });
  }

  return NextResponse.json({ status: "new" });
}
