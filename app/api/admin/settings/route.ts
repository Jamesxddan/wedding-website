import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin-auth";
import { auditLog, AuditAction } from "@/lib/admin-audit";

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
  const allowed = ["phase_override", "youtube_live_url", "youtube_ceremony_url", "youtube_reception_url", "announcement", "site_content"];
  if (!allowed.includes(key)) return NextResponse.json({ error: "unknown key" }, { status: 400 });
  const { error } = await supabase
    .from("settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const actionMap: Record<string, AuditAction> = {
    phase_override: "phase_override",
    announcement: "announcement_set",
    youtube_live_url: "youtube_url_set",
    youtube_ceremony_url: "youtube_url_set",
    youtube_reception_url: "youtube_url_set",
    site_content: "content_update",
  };
  if (actionMap[key]) void auditLog(actionMap[key], { key, value });
  return NextResponse.json({ ok: true });
}
