import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin-auth";
import { auditLog } from "@/lib/admin-audit";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const guest_id = req.nextUrl.searchParams.get("guest_id");
  if (!guest_id) return NextResponse.json({ error: "missing guest_id" }, { status: 400 });

  const { data, error } = await supabase
    .from("device_fingerprints")
    .select("id, device_uuid, user_agent, created_at, last_seen_at")
    .eq("guest_id", guest_id)
    .order("last_seen_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { fingerprint_id, guest_name } = await req.json().catch(() => ({}));
  if (!fingerprint_id) return NextResponse.json({ error: "missing fingerprint_id" }, { status: 400 });

  const { data: fp } = await supabase
    .from("device_fingerprints")
    .select("device_uuid")
    .eq("id", fingerprint_id)
    .maybeSingle();

  if (fp?.device_uuid) {
    await supabase.from("breach_flags").delete().eq("device_uuid", fp.device_uuid);
    await supabase.from("access_logs").delete().eq("device_uuid", fp.device_uuid);
  }

  const { error } = await supabase.from("device_fingerprints").delete().eq("id", fingerprint_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void auditLog("reset_device", { fingerprint_id, device_uuid: fp?.device_uuid, guest_name });
  return NextResponse.json({ ok: true });
}
