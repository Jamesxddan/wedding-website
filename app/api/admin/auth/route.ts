import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { supabase } from "@/lib/supabase";
import { verifyPassword } from "@/lib/admin-auth";

const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const { data: admin } = await supabase
    .from("admins")
    .select("id, pass_hash, is_super")
    .eq("email", (email as string).toLowerCase().trim())
    .maybeSingle();

  if (!admin || !verifyPassword(password as string, admin.pass_hash)) {
    return NextResponse.json({ error: "wrong email or password" }, { status: 401 });
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + COOKIE_MAX_AGE * 1000).toISOString();

  await supabase
    .from("admin_sessions")
    .insert({ token, admin_id: admin.id, expires_at: expiresAt });

  const store = await cookies();
  store.set("admin_session", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return NextResponse.json({ ok: true, email: (email as string).toLowerCase().trim(), is_super: admin.is_super });
}

export async function DELETE() {
  const store = await cookies();
  const token = store.get("admin_session")?.value;
  if (token) {
    await supabase.from("admin_sessions").delete().eq("token", token);
    store.delete("admin_session");
  }
  return NextResponse.json({ ok: true });
}
