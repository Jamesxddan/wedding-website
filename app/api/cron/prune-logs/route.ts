import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Keeps the Supabase free-tier database well under its 0.5GB quota by
// trimming high-volume, low-value-over-time log tables. Admin audit logs are
// deliberately never pruned here — they're a small, low-volume accountability
// trail, not a growth risk.
const RETENTION_DAYS = {
  access_logs: 90,
  chat_logs: 180,
  gallery_events: 90,
  breach_flags: 30, // only ones already expired (blocked_until in the past)
};

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results: Record<string, number> = {};

  for (const [table, days] of Object.entries(RETENTION_DAYS)) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const dateColumn = table === "breach_flags" ? "blocked_until" : "created_at";
    const { count, error } = await supabase
      .from(table)
      .delete({ count: "exact" })
      .lt(dateColumn, cutoff);
    if (error) {
      console.error(`[prune-logs] ${table} error:`, error);
      results[table] = -1;
    } else {
      results[table] = count ?? 0;
    }
  }

  return NextResponse.json({ ok: true, deleted: results });
}
