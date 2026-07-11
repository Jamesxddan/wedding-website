import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isSuperAdmin } from "@/lib/admin-auth";

export async function GET() {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [{ data: flagged }, { data: blocked }, { data: comments }] = await Promise.all([
    supabase
      .from("flagged_comments")
      .select("id, guest_id, guest_name, message, flag_reason, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("comment_blocks")
      .select("id, guest_id, blocked_at, released_at, guests ( name, city )")
      .is("released_at", null)
      .order("blocked_at", { ascending: false }),
    supabase
      .from("comments")
      .select("id, guest_id, guest_name, message, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return NextResponse.json({
    flagged: flagged ?? [],
    blocked: blocked ?? [],
    comments: comments ?? [],
  });
}

// Release a flagged comment → publish it + unblock guest
export async function POST(req: NextRequest) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { flagged_id } = await req.json().catch(() => ({}));
  if (!flagged_id) return NextResponse.json({ error: "missing flagged_id" }, { status: 400 });

  const { data: flag } = await supabase
    .from("flagged_comments")
    .select("*")
    .eq("id", flagged_id)
    .maybeSingle();

  if (!flag) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Publish the comment
  await supabase.from("comments").insert({
    guest_id: flag.guest_id,
    guest_name: flag.guest_name,
    message: flag.message,
  });

  // Remove from flagged queue
  await supabase.from("flagged_comments").delete().eq("id", flagged_id);

  // Unblock the guest
  await supabase
    .from("comment_blocks")
    .update({ released_at: new Date().toISOString() })
    .eq("guest_id", flag.guest_id)
    .is("released_at", null);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { flagged_id, comment_id, block_id } = await req.json().catch(() => ({}));

  if (flagged_id) {
    const { data: flag } = await supabase
      .from("flagged_comments")
      .select("guest_id")
      .eq("id", flagged_id)
      .maybeSingle();
    await supabase.from("flagged_comments").delete().eq("id", flagged_id);
    // Also unblock the guest
    if (flag?.guest_id) {
      await supabase
        .from("comment_blocks")
        .update({ released_at: new Date().toISOString() })
        .eq("guest_id", flag.guest_id)
        .is("released_at", null);
    }
    return NextResponse.json({ ok: true });
  }

  if (comment_id) {
    await supabase.from("comments").delete().eq("id", comment_id);
    return NextResponse.json({ ok: true });
  }

  if (block_id) {
    await supabase
      .from("comment_blocks")
      .update({ released_at: new Date().toISOString() })
      .eq("id", block_id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "missing target" }, { status: 400 });
}
