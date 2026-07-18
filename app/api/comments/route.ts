import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validateSession } from "@/lib/session-check";

const EDIT_WINDOW_MS = 2 * 60 * 1000;
const SILENT_DROP_LIMIT = 15;
const SILENT_DROP_WINDOW_MS = 10 * 60 * 1000;

function deobfuscate(text: string): string {
  // 1. Unicode normalization strips combining accents: à→a, é→e, ü→u, ë→e, etc.
  let t = text.normalize("NFD").replace(/[̀-ͯ]/g, "");
  // 2. Phonetic: ph before a letter → f  (phiz→fiz, phazi→fazi)
  t = t.replace(/ph(?=[a-zA-Z])/gi, "f");
  // 3. Leet-speak digit/symbol substitutions
  t = t
    .toLowerCase()
    .replace(/4/g, "a")
    .replace(/3/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o");
  // 4. Collapse ANY non-alpha chars between letters — 6 passes for deeply nested patterns.
  //    Catches: spaces, dots, dashes, emoji, zero-width chars, symbols, etc.
  for (let i = 0; i < 6; i++) {
    t = t.replace(/([a-z])([^a-z]+)([a-z])/g, "$1$3");
  }
  return t;
}

function isSilentDrop(text: string): boolean {
  const check = (t: string) => {
    const patterns = [/aarthi/,/\bfiz\b/,/fazi/,/fazela/,/fazeela/,/athu\s*baby/,/\bammu\b/,/\bex\b/];
    return patterns.some((p) => p.test(t));
  };
  return check(text.toLowerCase()) || check(deobfuscate(text));
}

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
  const session = await validateSession(req, "comment_post", {});
  if (session instanceof NextResponse) return session;
  if (!session.guest_id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { message } = await req.json().catch(() => ({}));
  if (!message?.trim()) return NextResponse.json({ error: "empty" }, { status: 400 });

  if (isSilentDrop(message)) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const cutoff = new Date(Date.now() - SILENT_DROP_WINDOW_MS).toISOString();
    const { count } = await supabase
      .from("access_logs")
      .select("id", { count: "exact", head: true })
      .eq("device_uuid", session.device_uuid)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq("event_type", "comment_attempt" as any)
      .gte("created_at", cutoff);
    if ((count ?? 0) >= SILENT_DROP_LIMIT - 1) {
      await supabase.from("breach_flags").insert({
        device_uuid: session.device_uuid,
        ip,
        reason: "hotlink_attempt",
        blocked_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
      return NextResponse.json(
        { error: "blocked_peace", message: "You have tried to disturb this couple's peace by using unnecessary words so you are blocked for 60 min" },
        { status: 429 }
      );
    }
    await supabase.from("access_logs").insert({
      device_uuid: session.device_uuid,
      guest_id: session.guest_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      event_type: "comment_attempt" as any,
      event_data: null,
      ip,
    });
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }

  if (/miz/.test(deobfuscate(message))) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await supabase.from("breach_flags").insert({
      device_uuid: session.device_uuid,
      ip,
      reason: "hotlink_attempt",
      blocked_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }

  const { data: block } = await supabase
    .from("comment_blocks")
    .select("id")
    .eq("guest_id", session.guest_id)
    .is("released_at", null)
    .maybeSingle();

  if (block) return NextResponse.json({ error: "blocked" }, { status: 403 });

  const { data: guest } = await supabase
    .from("guests")
    .select("name")
    .eq("id", session.guest_id)
    .maybeSingle();

  const guestName = guest?.name ?? "Guest";

  if (isBad(message)) {
    await supabase.from("flagged_comments").insert({
      guest_id: session.guest_id,
      guest_name: guestName,
      message: message.trim(),
      flag_reason: "profanity",
    });
    await supabase.from("comment_blocks").insert({ guest_id: session.guest_id });
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
  const session = await validateSession(req, "comment_edit", {});
  if (session instanceof NextResponse) return session;
  if (!session.guest_id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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

  if (Date.now() - new Date(existing.created_at).getTime() > EDIT_WINDOW_MS) {
    return NextResponse.json({ error: "edit_expired" }, { status: 403 });
  }

  if (isSilentDrop(message)) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const cutoff = new Date(Date.now() - SILENT_DROP_WINDOW_MS).toISOString();
    const { count } = await supabase
      .from("access_logs")
      .select("id", { count: "exact", head: true })
      .eq("device_uuid", session.device_uuid)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq("event_type", "comment_attempt" as any)
      .gte("created_at", cutoff);
    if ((count ?? 0) >= SILENT_DROP_LIMIT - 1) {
      await supabase.from("breach_flags").insert({
        device_uuid: session.device_uuid,
        ip,
        reason: "hotlink_attempt",
        blocked_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
      return NextResponse.json(
        { error: "blocked_peace", message: "You have tried to disturb this couple's peace by using unnecessary words so you are blocked for 60 min" },
        { status: 429 }
      );
    }
    await supabase.from("access_logs").insert({
      device_uuid: session.device_uuid,
      guest_id: session.guest_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      event_type: "comment_attempt" as any,
      event_data: null,
      ip,
    });
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }

  if (/miz/.test(deobfuscate(message))) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await supabase.from("breach_flags").insert({
      device_uuid: session.device_uuid,
      ip,
      reason: "hotlink_attempt",
      blocked_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    return NextResponse.json({ error: "failed" }, { status: 500 });
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
  const session = await validateSession(req, "comment_delete", {});
  if (session instanceof NextResponse) return session;

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  if (!session.is_owner) {
    const { data: existing } = await supabase
      .from("comments")
      .select("guest_id")
      .eq("id", id)
      .maybeSingle();
    if (!existing || existing.guest_id !== session.guest_id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  await supabase.from("comments").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
