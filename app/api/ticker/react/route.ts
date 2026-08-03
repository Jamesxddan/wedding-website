import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validateSession } from "@/lib/session-check";

const ALLOWED_EMOJIS = new Set(["❤️", "🎊", "😭", "🥂", "🙏", "✨"]);

export async function POST(req: NextRequest) {
  const session = await validateSession(req, "ticker_react", {});
  if (session instanceof NextResponse) return session;
  if (!session.guest_id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { update_id, emoji } = await req.json().catch(() => ({})) as { update_id?: string; emoji?: string };
  if (!update_id || !emoji || !ALLOWED_EMOJIS.has(emoji)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  // Verify update exists
  const { data: update } = await supabase
    .from("ticker_updates")
    .select("id")
    .eq("id", update_id)
    .maybeSingle();
  if (!update) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Toggle: check if reaction already exists
  const { data: existing } = await supabase
    .from("ticker_reactions")
    .select("update_id")
    .eq("update_id", update_id)
    .eq("guest_id", session.guest_id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("ticker_reactions")
      .delete()
      .eq("update_id", update_id)
      .eq("guest_id", session.guest_id)
      .eq("emoji", emoji);
    return NextResponse.json({ toggled: "removed" });
  } else {
    await supabase
      .from("ticker_reactions")
      .insert({ update_id, guest_id: session.guest_id, emoji });
    return NextResponse.json({ toggled: "added" });
  }
}
