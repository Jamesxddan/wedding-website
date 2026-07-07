import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";

async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return store.get("admin_session")?.value === "1";
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const guestFilter = req.nextUrl.searchParams.get("guest");
  const typeFilter = req.nextUrl.searchParams.get("type");

  let query = supabase
    .from("access_logs")
    .select(`id, device_uuid, event_type, event_data, ip, created_at, guests ( name )`)
    .order("created_at", { ascending: false })
    .limit(200);

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
