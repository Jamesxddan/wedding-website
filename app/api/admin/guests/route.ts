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

// Super-admin only: clear a guest's device fingerprints so they must re-register.
// The guest row, logs, and gallery events are never deleted.
export async function DELETE(req: NextRequest) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const { error } = await supabase
    .from("device_fingerprints")
    .delete()
    .eq("guest_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
