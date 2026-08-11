import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const onlyFlagged = req.nextUrl.searchParams.get("flagged") === "true";

  let query = supabase
    .from("chat_logs")
    .select("id, question, answer, flagged, ip, created_at, guest_id, guests ( name )")
    .order("created_at", { ascending: false })
    .limit(200);

  if (onlyFlagged) query = query.eq("flagged", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
