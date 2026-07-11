import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";

async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return store.get("admin_session")?.value === "1";
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await supabase.from("settings").select("key, value, updated_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.key] = row.value;
  return NextResponse.json(map);
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { key, value } = await req.json().catch(() => ({}));
  if (!key || typeof value !== "string") return NextResponse.json({ error: "missing fields" }, { status: 400 });
  const allowed = ["phase_override", "youtube_live_url", "announcement"];
  if (!allowed.includes(key)) return NextResponse.json({ error: "unknown key" }, { status: 400 });
  const { error } = await supabase
    .from("settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
