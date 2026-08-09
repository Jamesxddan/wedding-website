import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validateSession } from "@/lib/session-check";

const VALID = ["auto", "FIRST_VISIT", "INVITATION", "RETURN_VISIT", "WEDDING_DAY", "POST_WEDDING"] as const;

export async function POST(req: NextRequest) {
  const session = await validateSession(req, "owner_phase_switch", {});
  if (session instanceof NextResponse) return session;
  if (!session.is_owner) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { phase } = await req.json().catch(() => ({}));
  if (!phase || !VALID.includes(phase as typeof VALID[number])) {
    return NextResponse.json({ error: "invalid phase" }, { status: 400 });
  }

  const { error } = await supabase
    .from("settings")
    .upsert({ key: "phase_override", value: phase, updated_at: new Date().toISOString() }, { onConflict: "key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, phase });
}
