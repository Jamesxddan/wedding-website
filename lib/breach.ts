import { supabase } from "@/lib/supabase";

const API_RATE_WINDOW_S = 60;
const API_RATE_LIMIT = 30;
const FORM_WINDOW_HOURS = 2;
const FORM_LIMIT = 10;

export interface BreachBlock {
  message: string;
  status: 429;
}

export async function checkAndBlock(
  device_uuid: string,
  ip: string | null,
  guest_id: string | null
): Promise<BreachBlock | null> {
  if (process.env.VERCEL_ENV !== "production") return null;

  // Owner check — always run so mocks align; non-owners and unknown devices continue
  const { data: guest } = await supabase
    .from("guests")
    .select("is_owner")
    .eq("id", guest_id ?? "")
    .maybeSingle();
  if (guest?.is_owner) return null;

  // Check active block
  const { data: flag } = await supabase
    .from("breach_flags")
    .select("id, blocked_until, reason")
    .eq("device_uuid", device_uuid)
    .gt("blocked_until", new Date().toISOString())
    .maybeSingle();

  if (flag) {
    return {
      message:
        flag.reason === "repeated_form_submit"
          ? "It looks like you've visited a few times already — please check back in a little while. We can't wait to celebrate with you! 🌸"
          : "We're just catching our breath — please give it a moment and try again.",
      status: 429,
    };
  }

  // API rate limit: 30 calls / 60 seconds
  const rateWindow = new Date(Date.now() - API_RATE_WINDOW_S * 1000).toISOString();
  const { count: recentCalls } = await supabase
    .from("access_logs")
    .select("id", { count: "exact", head: true })
    .eq("device_uuid", device_uuid)
    .gt("created_at", rateWindow);

  if ((recentCalls ?? 0) > API_RATE_LIMIT) {
    await supabase.from("breach_flags").insert({
      device_uuid,
      ip,
      reason: "api_rate_limit",
      blocked_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    return {
      message: "We're just catching our breath — please give it a moment and try again.",
      status: 429,
    };
  }

  return null;
}

export async function logEvent(
  device_uuid: string,
  event_type: string,
  event_data: Record<string, unknown> | null,
  ip: string | null,
  guest_id?: string | null
): Promise<void> {
  try {
    await supabase.from("access_logs").insert({
      device_uuid,
      guest_id: guest_id ?? null,
      event_type,
      event_data,
      ip,
    });
  } catch {
    // Never let logging break a request
  }
}
