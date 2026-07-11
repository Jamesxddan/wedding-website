import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { hashPassword, isSuperAdmin } from "@/lib/admin-auth";

export async function GET() {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("admins")
    .select("id, email, is_super, added_by, created_at")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { email, password, is_super, added_by } = await req.json().catch(() => ({}));
  if (!email || !password) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const pass_hash = hashPassword(password as string);
  const { error } = await supabase.from("admins").insert({
    email: (email as string).toLowerCase().trim(),
    pass_hash,
    is_super: !!is_super,
    added_by: (added_by as string) ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id, is_super } = await req.json().catch(() => ({}));
  if (!id || typeof is_super !== "boolean") {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  if (!is_super) {
    const { count } = await supabase
      .from("admins")
      .select("id", { count: "exact", head: true })
      .eq("is_super", true);
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: "Cannot demote the last super admin" }, { status: 400 });
    }
  }

  const { error } = await supabase.from("admins").update({ is_super }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const { data: target } = await supabase
    .from("admins")
    .select("is_super")
    .eq("id", id)
    .maybeSingle();

  if (target?.is_super) {
    const { count } = await supabase
      .from("admins")
      .select("id", { count: "exact", head: true })
      .eq("is_super", true);
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: "Cannot remove the last super admin" }, { status: 400 });
    }
  }

  // Cascade on admins → admin_sessions ensures immediate session invalidation
  const { error } = await supabase.from("admins").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
