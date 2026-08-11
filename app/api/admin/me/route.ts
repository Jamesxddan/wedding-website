import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { getAdminSession, verifyPassword, hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/admin-auth";
import { auditLog } from "@/lib/admin-audit";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ email: session.email, is_super: session.isSuper });
}

// Change your own password. Requires the current password; on success, any
// other sessions for this admin are signed out (the current one stays live).
export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { current_password, new_password } = await req.json().catch(() => ({}));
  if (!current_password || !new_password) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  if (typeof new_password !== "string" || new_password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` }, { status: 400 });
  }

  const { data: admin } = await supabase
    .from("admins")
    .select("pass_hash")
    .eq("id", session.adminId)
    .maybeSingle();
  if (!admin || !verifyPassword(current_password as string, admin.pass_hash)) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  const pass_hash = hashPassword(new_password as string);
  const { error: updateError } = await supabase
    .from("admins")
    .update({ pass_hash })
    .eq("id", session.adminId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // Sign out other devices that were authenticated with the old password, but
  // keep this one — the admin just proved they know the current password.
  const store = await cookies();
  const token = store.get("admin_session")?.value;
  if (token) {
    await supabase.from("admin_sessions").delete().eq("admin_id", session.adminId).neq("token", token);
  }

  await auditLog("admin_password_changed");
  return NextResponse.json({ ok: true });
}
