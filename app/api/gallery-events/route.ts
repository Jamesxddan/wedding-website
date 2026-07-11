import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { device_uuid, event_type, metadata } = await req.json().catch(() => ({}));

  if (!device_uuid || !event_type) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const { data: fp } = await supabase
    .from("device_fingerprints")
    .select("guest_id")
    .eq("device_uuid", device_uuid)
    .maybeSingle();

  await supabase.from("gallery_events").insert({
    guest_id: fp?.guest_id ?? null,
    device_uuid,
    event_type,
    metadata: metadata ?? null,
  });

  return NextResponse.json({ ok: true });
}
