import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validateSession } from "@/lib/session-check";
import { askWeddingChatbot, CHAT_MAX_QUESTION_LEN } from "@/lib/chatbot";
import { sendBreachAlert } from "@/lib/alert";

const CHAT_RATE_LIMIT = 15; // messages per device per hour — LLM calls cost money
const CHAT_RATE_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const session = await validateSession(req, "chat_message", {});
  if (session instanceof NextResponse) return session;

  const { data: settingsRow } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "chatbot_enabled")
    .maybeSingle();
  if (settingsRow?.value !== "true") {
    return NextResponse.json({ error: "chatbot_disabled" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) return NextResponse.json({ error: "missing question" }, { status: 400 });
  if (question.length > CHAT_MAX_QUESTION_LEN) {
    return NextResponse.json({ error: "question too long" }, { status: 400 });
  }

  // Dedicated, tighter rate limit than the general API throttle — LLM calls
  // cost real money, so this is capped separately from validateSession's
  // generic 30/60s API limit.
  const windowStart = new Date(Date.now() - CHAT_RATE_WINDOW_MS).toISOString();
  const { count: recentChats } = await supabase
    .from("chat_logs")
    .select("id", { count: "exact", head: true })
    .eq("device_uuid", session.device_uuid)
    .gt("created_at", windowStart);

  if ((recentChats ?? 0) >= CHAT_RATE_LIMIT) {
    return NextResponse.json(
      { error: "rate_limited", answer: "You've asked quite a few questions! Please wait a bit before asking more. 🌸" },
      { status: 429 }
    );
  }

  const { answer, flagged } = await askWeddingChatbot(question);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  await supabase.from("chat_logs").insert({
    guest_id: session.guest_id,
    device_uuid: session.device_uuid,
    question,
    answer,
    flagged,
    ip,
  });

  if (flagged) {
    void sendBreachAlert({
      reason: "chatbot_flagged",
      device_uuid: session.device_uuid,
      ip,
      extra: `Question: "${question}"`,
    });
  }

  return NextResponse.json({ answer });
}
