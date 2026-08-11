import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { hashPassword, isSuperAdmin, MIN_PASSWORD_LENGTH } from "@/lib/admin-auth";
import { auditLog } from "@/lib/admin-audit";

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
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 400 });
  }

  const pass_hash = hashPassword(password);
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

  const { id, is_super, password } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  // Super admin sets/rotates another admin's password (e.g. a temporary one the
  // admin then changes themselves from the header "Change password" form).
  if (password !== undefined) {
    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 400 });
    }
    const pass_hash = hashPassword(password);
    // Sign every live session out so stale cookies can't keep the old password alive.
    const { error: sessError } = await supabase.from("admin_sessions").delete().eq("admin_id", id);
    if (sessError) return NextResponse.json({ error: sessError.message }, { status: 500 });
    const { error } = await supabase.from("admins").update({ pass_hash }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await auditLog("admin_password_reset", { admin_id: id });
    return NextResponse.json({ ok: true });
  }

  if (typeof is_super !== "boolean") {
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
