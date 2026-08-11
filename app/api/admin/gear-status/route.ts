import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getAdminSession } from "@/lib/admin-auth";

// Lightweight affordance check for the sub-owner gear: does the person viewing
// the main site also hold admin access? Returns booleans only — /admin and
// every /api/admin route are still gated by getAdminSession, so this leaks no
// credentials and grants no privilege.
export async function GET(req: NextRequest) {
  // 1. An active admin-session cookie means they're an admin, period.
  const session = await getAdminSession();
  if (session) {
    return NextResponse.json({ isAdmin: true, isSuper: session.isSuper });
  }

  // 2. Dev/staging are open test environments (see CLAUDE.md) — surface the
  //    affordance so it can be verified there without real credentials.
  if (process.env.VERCEL_ENV !== "production") {
    return NextResponse.json({ isAdmin: true, isSuper: true });
  }

  // 3. Production: match the guest's email (from their device session) against
  //    the admins table — the same person is often both a sub-owner guest and
  //    an admin, and this is how the gear can offer them the admin panel.
  const token = req.headers.get("x-session-token");
  if (token) {
    const { data } = await supabase
      .from("device_fingerprints")
      .select("guest_id, guests ( email )")
      .eq("session_token", token)
      .maybeSingle();
    // The nested "guests ( email )" relation is typed loosely by supabase-js —
    // it can come back as an object (to-one) or an array depending on the
    // relationship inference. Normalize both shapes before reading the email.
    const raw = data?.guests as unknown;
    const email = Array.isArray(raw)
      ? (raw[0] as { email?: string | null } | null)?.email ?? null
      : (raw as { email?: string | null } | null)?.email ?? null;
    if (email) {
      const { data: admin } = await supabase
        .from("admins")
        .select("is_super")
        .eq("email", email)
        .maybeSingle();
      if (admin) {
        return NextResponse.json({ isAdmin: true, isSuper: (admin.is_super as boolean) ?? false });
      }
    }
  }

  return NextResponse.json({ isAdmin: false });
}
