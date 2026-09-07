import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { device_uuid, browser_signals_hash, page, user_agent } = body as {
    device_uuid?: string;
    browser_signals_hash?: string;
    page?: string;
    user_agent?: string;
  };

  if (!device_uuid) return NextResponse.json({ status: "new" });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  // Primary lookup: device_uuid
  const { data: fp } = await supabase
    .from("device_fingerprints")
    .select(`session_token, guest_id, guests ( id, name, city, invitation_seen, is_owner )`)
    .eq("device_uuid", device_uuid)
    .maybeSingle();

  if (page) {
    const { logEvent } = await import("@/lib/breach");
    await logEvent(device_uuid, "phase_view", { [page]: new Date().toISOString() }, ip, fp?.guest_id ?? null);
  }

  if (fp) {
    const fpUpdate: Record<string, unknown> = { last_seen_at: new Date().toISOString() };
    if (user_agent) fpUpdate.user_agent = user_agent;
    // Keep browser_signals_hash fresh on every visit — self-heals rows whose
    // hash was never captured (e.g. registered before this field existed, or
    // a failed capture at registration time) so incognito/relink matching on
    // this browser profile works going forward.
    if (browser_signals_hash) fpUpdate.browser_signals_hash = browser_signals_hash;
    await supabase
      .from("device_fingerprints")
      .update(fpUpdate)
      .eq("device_uuid", device_uuid);

    const guest = fp.guests as unknown as {
      id: string; name: string; city: string; invitation_seen: boolean; is_owner: boolean;
    } | null;
    if (!guest) return NextResponse.json({ status: "new" });

    return NextResponse.json({
      status: "known",
      name: guest.name,
      city: guest.city,
      invitation_seen: guest.invitation_seen,
      is_owner: guest.is_owner,
      guest_id: guest.id,
      session_token: fp.session_token,
    });
  }

  // Fallback: check by browser_signals_hash — catches incognito users whose
  // device UUID was cleared but browser profile (userAgent, timezone, screen) matches.
  //
  // This hash is low-entropy by nature (it has to match across a cookie
  // clear on the SAME device), so it can collide across two different
  // guests with similar-enough devices. Disclosing one guest's name/city to
  // another guest's browser based on a collision is a privacy bug, so if the
  // hash isn't unique to a single guest we refuse to guess and fall through
  // to "new" instead.
  if (browser_signals_hash) {
    const { data: fpRowsByHash } = await supabase
      .from("device_fingerprints")
      .select(`guest_id, guests ( id, name, city, invitation_seen, is_owner )`)
      .eq("browser_signals_hash", browser_signals_hash)
      .order("last_seen_at", { ascending: false });

    const distinctGuestIds = new Set((fpRowsByHash ?? []).map((r) => r.guest_id).filter(Boolean));
    const fpByHash = fpRowsByHash?.[0];

    if (distinctGuestIds.size === 1 && fpByHash?.guests) {
      const guest = fpByHash.guests as unknown as {
        id: string; name: string; city: string; invitation_seen: boolean; is_owner: boolean;
      };
      return NextResponse.json({
        status: "relink_required",
        name: guest.name,
        city: guest.city,
        guest_id: guest.id,
      });
    }
  }

  return NextResponse.json({ status: "new" });
}
