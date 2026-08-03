import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin-auth";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await supabase
    .from("ticker_updates")
    .select("id, message, icon, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { message, icon } = await req.json().catch(() => ({})) as { message?: string; icon?: string };
  if (!message?.trim()) return NextResponse.json({ error: "empty" }, { status: 400 });
  if (message.trim().length > 160) return NextResponse.json({ error: "too_long" }, { status: 400 });

  const { data, error } = await supabase
    .from("ticker_updates")
    .insert({ message: message.trim(), icon: icon?.trim() || "✨" })
    .select("id, message, icon, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await req.json().catch(() => ({})) as { id?: string };
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  await supabase.from("ticker_updates").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
