import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { checkAndBlock, logEvent } from "@/lib/breach";

export interface SessionInfo {
  ok: true;
  guest_id: string | null;
  device_uuid: string;
  is_owner: boolean;
}

export async function validateSession(
  req: NextRequest,
  eventType: string,
  eventData: Record<string, unknown>
): Promise<SessionInfo | NextResponse> {
  // In non-production, skip all checks
  if (process.env.VERCEL_ENV !== "production") {
    return { ok: true, guest_id: null, device_uuid: "dev", is_owner: true };
  }

  const token = req.headers.get("x-session-token");
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("device_fingerprints")
    .select("device_uuid, guest_id, guests ( is_owner )")
    .eq("session_token", token)
    .maybeSingle();

  const fp = data as { device_uuid: string; guest_id: string | null; guests: { is_owner: boolean } | null } | null;

  if (!fp) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const guest = fp.guests as { is_owner: boolean } | null;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const block = await checkAndBlock(fp.device_uuid, ip, fp.guest_id);
  if (block) {
    return NextResponse.json({ error: "blocked", message: block.message }, { status: 429 });
  }

  await logEvent(fp.device_uuid, eventType, eventData, ip, fp.guest_id);

  return {
    ok: true,
    guest_id: fp.guest_id,
    device_uuid: fp.device_uuid,
    is_owner: guest?.is_owner ?? false,
  };
}
