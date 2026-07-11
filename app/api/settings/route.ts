import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Public read-only endpoint — site polls this for phase override, YouTube URL, announcement
export async function GET() {
  const { data, error } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["phase_override", "youtube_live_url", "youtube_ceremony_url", "youtube_reception_url", "announcement", "families"]);

  if (error) return NextResponse.json({}, { status: 500 });

  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.key] = row.value;
  return NextResponse.json(map, {
    headers: { "Cache-Control": "no-store" },
  });
}
