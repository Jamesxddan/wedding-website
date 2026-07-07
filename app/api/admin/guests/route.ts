import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";

async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return store.get("admin_session")?.value === "1";
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("guests")
    .select(`id, name, city, invitation_seen, is_owner, created_at, last_seen_at, device_fingerprints ( id )`)
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
