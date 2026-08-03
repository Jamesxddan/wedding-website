import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const REACTION_EMOJIS = ["❤️", "🎊", "😭", "🥂", "🙏", "✨"];

export async function GET(req: NextRequest) {
  // Resolve guest from session token if present (best-effort — no 401 on missing)
  let guestId: string | null = null;
  const token = req.headers.get("x-session-token");
  if (token) {
    const { data: fp } = await supabase
      .from("device_fingerprints")
      .select("guest_id")
      .eq("session_token", token)
      .maybeSingle();
    guestId = fp?.guest_id ?? null;
  }

  const { data: updates, error } = await supabase
    .from("ticker_updates")
    .select("id, message, icon, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updates?.length) return NextResponse.json({ updates: [] });

  const updateIds = updates.map(u => u.id);

  // Aggregate reaction counts
  const { data: reactions } = await supabase
    .from("ticker_reactions")
    .select("update_id, emoji")
    .in("update_id", updateIds);

  // My reactions
  let myReactions: { update_id: string; emoji: string }[] = [];
  if (guestId) {
    const { data } = await supabase
      .from("ticker_reactions")
      .select("update_id, emoji")
      .in("update_id", updateIds)
      .eq("guest_id", guestId);
    myReactions = data ?? [];
  }

  const counts: Record<string, Record<string, number>> = {};
  for (const r of reactions ?? []) {
    if (!counts[r.update_id]) counts[r.update_id] = {};
    counts[r.update_id][r.emoji] = (counts[r.update_id][r.emoji] ?? 0) + 1;
  }

  const mine: Record<string, string[]> = {};
  for (const r of myReactions) {
    if (!mine[r.update_id]) mine[r.update_id] = [];
    mine[r.update_id].push(r.emoji);
  }

  const result = updates.map(u => ({
    ...u,
    reactions: REACTION_EMOJIS.reduce<Record<string, number>>((acc, e) => {
      acc[e] = counts[u.id]?.[e] ?? 0;
      return acc;
    }, {}),
    my_reactions: mine[u.id] ?? [],
  }));

  return NextResponse.json({ updates: result });
}
