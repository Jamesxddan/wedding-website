import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdmin, isSuperAdmin } from "@/lib/admin-auth";
import { auditLog } from "@/lib/admin-audit";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const guestFilter = req.nextUrl.searchParams.get("guest");
  const typeFilter = req.nextUrl.searchParams.get("type");

  const fetchLimit = guestFilter ? 2000 : 200;

  let query = supabase
    .from("access_logs")
    .select(`id, guest_id, device_uuid, event_type, event_data, ip, created_at, guests ( name )`)
    .order("created_at", { ascending: false })
    .limit(fetchLimit);

  if (typeFilter) query = query.eq("event_type", typeFilter);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = guestFilter
    ? (data ?? []).filter((r) => {
        const g = (r.guests as unknown) as { name: string } | null;
        return g?.name?.toLowerCase().includes(guestFilter.toLowerCase());
      })
    : (data ?? []);

  return NextResponse.json(rows);
}

// Super-admin: delete all logs for a specific guest_id, or all logs if { all: true }
export async function DELETE(req: NextRequest) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  if (body.all === true) {
    const { error } = await supabase
      .from("access_logs")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    void auditLog("clear_all_logs");
    return NextResponse.json({ ok: true });
  }

  const { guest_id } = body;
  if (!guest_id) return NextResponse.json({ error: "missing guest_id or all flag" }, { status: 400 });

  const { data: guestRow } = await supabase.from("guests").select("name").eq("id", guest_id).maybeSingle();
  const { error } = await supabase.from("access_logs").delete().eq("guest_id", guest_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  void auditLog("clear_guest_logs", { guest_id, name: guestRow?.name });
  return NextResponse.json({ ok: true });
}
