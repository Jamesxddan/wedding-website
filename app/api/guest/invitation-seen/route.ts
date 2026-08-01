import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { guest_id } = body as { guest_id?: string };

  if (!guest_id) {
    return NextResponse.json({ error: "missing guest_id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("guests")
    .update({ invitation_seen: true })
    .eq("id", guest_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
