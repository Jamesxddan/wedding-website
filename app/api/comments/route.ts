import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { checkSession } from "@/lib/session-check";

const EDIT_WINDOW_MS = 2 * 60 * 1000;

function isBad(text: string): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Filter = require("bad-words");
    return new Filter().isProfane(text);
  } catch {
    return false;
  }
}

export async function GET() {
  const { data, error } = await supabase
    .from("comments")
    .select("id, guest_id, guest_name, message, created_at, updated_at")
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const session = await checkSession(req);
  if (!session.ok || !session.guest_id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { message } = await req.json().catch(() => ({}));
  if (!message?.trim()) return NextResponse.json({ error: "empty" }, { status: 400 });

  // Check if guest is blocked from commenting
  const { data: block } = await supabase
    .from("comment_blocks")
    .select("id")
    .eq("guest_id", session.guest_id)
    .is("released_at", null)
    .maybeSingle();

  if (block) {
    return NextResponse.json({ error: "blocked" }, { status: 403 });
  }

  const { data: guest } = await supabase
    .from("guests")
    .select("name")
    .eq("id", session.guest_id)
    .maybeSingle();

  const guestName = guest?.name ?? "Guest";

  if (isBad(message)) {
    // Save to flagged queue and block the guest — don't publish
    await supabase.from("flagged_comments").insert({
      guest_id: session.guest_id,
      guest_name: guestName,
      message: message.trim(),
      flag_reason: "profanity",
    });
    await supabase.from("comment_blocks").insert({
      guest_id: session.guest_id,
    });
    return NextResponse.json({ error: "flagged" }, { status: 422 });
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({ guest_id: session.guest_id, guest_name: guestName, message: message.trim() })
    .select("id, guest_id, guest_name, message, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const session = await checkSession(req);
  if (!session.ok || !session.guest_id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id, message } = await req.json().catch(() => ({}));
  if (!id || !message?.trim()) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const { data: existing } = await supabase
    .from("comments")
    .select("guest_id, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!existing || existing.guest_id !== session.guest_id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const age = Date.now() - new Date(existing.created_at).getTime();
  if (age > EDIT_WINDOW_MS) {
    return NextResponse.json({ error: "edit_expired" }, { status: 403 });
  }

  if (isBad(message)) {
    await supabase.from("flagged_comments").insert({
      guest_id: session.guest_id,
      guest_name: "edit",
      message: message.trim(),
      flag_reason: "profanity_edit",
    });
    await supabase.from("comment_blocks").insert({ guest_id: session.guest_id });
    await supabase.from("comments").delete().eq("id", id);
    return NextResponse.json({ error: "flagged" }, { status: 422 });
  }

  const { data, error } = await supabase
    .from("comments")
    .update({ message: message.trim(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, guest_id, guest_name, message, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const session = await checkSession(req);
  if (!session.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  // Only owners or the comment's own author (within edit window) can delete
  if (!session.is_owner) {
    const { data: existing } = await supabase
      .from("comments")
      .select("guest_id, created_at")
      .eq("id", id)
      .maybeSingle();
    if (!existing || existing.guest_id !== session.guest_id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  await supabase.from("comments").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
