import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdmin, isSuperAdmin } from "@/lib/admin-auth";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("guests")
    .select(`id, name, city, invitation_seen, is_owner, created_at, last_seen_at,
      device_fingerprints ( id ),
      gallery_events ( event_type )`)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    (data ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      city: g.city,
      invitation_seen: g.invitation_seen,
      is_owner: g.is_owner,
      created_at: g.created_at,
      last_seen_at: g.last_seen_at,
      device_count: (g.device_fingerprints as { id: string }[] | null ?? []).length,
      photo_downloads: (g.gallery_events as { event_type: string }[] | null ?? [])
        .filter((e) => e.event_type === "photo_download").length,
    }))
  );
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id, is_owner } = await req.json().catch(() => ({}));
  if (!id || typeof is_owner !== "boolean") {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const { error } = await supabase.from("guests").update({ is_owner }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  // ── FACTORY RESET ── wipe ALL guest data, leave admins/settings intact
  if (body.factory_reset === true) {
    const FAKE = "00000000-0000-0000-0000-000000000000";
    await supabase.from("access_logs").delete().neq("id", FAKE);
    await supabase.from("gallery_events").delete().neq("id", FAKE);
    await supabase.from("breach_flags").delete().neq("id", FAKE);
    await supabase.from("device_fingerprints").delete().neq("id", FAKE);
    await supabase.from("guests").delete().neq("id", FAKE);
    return NextResponse.json({ ok: true });
  }

  // ── RESET ALL SESSIONS ── soft kick: remove fingerprints only
  if (body.all === true) {
    const { error } = await supabase
      .from("device_fingerprints")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // ── DELETE GUEST ── full wipe for one guest (treated as brand new device)
  const { id } = body;
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  // Get device_uuids so we can wipe breach_flags (linked by device_uuid, not guest_id)
  const { data: fps } = await supabase
    .from("device_fingerprints")
    .select("device_uuid")
    .eq("guest_id", id);

  const deviceUuids = (fps ?? []).map((f) => f.device_uuid);

  // Delete in dependency order
  if (deviceUuids.length > 0) {
    await supabase.from("breach_flags").delete().in("device_uuid", deviceUuids);
    await supabase.from("access_logs").delete().in("device_uuid", deviceUuids);
  }
  await supabase.from("access_logs").delete().eq("guest_id", id);
  await supabase.from("gallery_events").delete().eq("guest_id", id);
  await supabase.from("device_fingerprints").delete().eq("guest_id", id);
  await supabase.from("guests").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}
