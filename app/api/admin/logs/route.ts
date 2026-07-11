import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const guestFilter = req.nextUrl.searchParams.get("guest");
  const typeFilter = req.nextUrl.searchParams.get("type");

  const fetchLimit = guestFilter ? 2000 : 200;

  let query = supabase
    .from("access_logs")
    .select(`id, device_uuid, event_type, event_data, ip, created_at, guests ( name )`)
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
