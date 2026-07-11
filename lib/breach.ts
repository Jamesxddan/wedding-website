import { supabase } from "@/lib/supabase";
import { sendBreachAlert } from "@/lib/alert";

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
  if (!process.env.VERCEL_ENV) return null;

  // Owners are exempt — only check when guest_id is known
  if (guest_id) {
    const { data: guest } = await supabase
      .from("guests")
      .select("is_owner")
      .eq("id", guest_id)
      .maybeSingle();
    if (guest?.is_owner) return null;
  }

  // API rate limit: 30 calls / 60 seconds
  const rateWindow = new Date(Date.now() - API_RATE_WINDOW_S * 1000).toISOString();
  const { count: recentCalls } = await supabase
    .from("access_logs")
    .select("id", { count: "exact", head: true })
    .eq("device_uuid", device_uuid)
    .gt("created_at", rateWindow)
    .single();

  if ((recentCalls ?? 0) > API_RATE_LIMIT) {
    await supabase.from("breach_flags").insert({
      device_uuid,
      ip,
      reason: "api_rate_limit",
      blocked_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    void sendBreachAlert({ reason: "api_rate_limit", device_uuid, ip });
    return {
      message: "We're just catching our breath — please give it a moment and try again.",
      status: 429,
    };
  }

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

  // Repeated form submits: 10 / 2 hours
  const formWindow = new Date(Date.now() - FORM_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const { count: recentForms } = await supabase
    .from("access_logs")
    .select("id", { count: "exact", head: true })
    .eq("device_uuid", device_uuid)
    .eq("event_type", "form_submit")
    .gt("created_at", formWindow)
    .single();

  if ((recentForms ?? 0) > FORM_LIMIT) {
    await supabase.from("breach_flags").insert({
      device_uuid,
      ip,
      reason: "repeated_form_submit",
      blocked_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    void sendBreachAlert({ reason: "repeated_form_submit", device_uuid, ip });
    return {
      message: "It looks like you've visited a few times already — please check back in a little while. We can't wait to celebrate with you! 🌸",
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
    if (event_type === "phase_view" && event_data) {
      const { data: existing } = await supabase
        .from("access_logs")
        .select("id, event_data, guest_id")
        .eq("device_uuid", device_uuid)
        .eq("event_type", "phase_view")
        .maybeSingle();

      if (existing) {
        const merged_data = {
          ...(existing.event_data as Record<string, unknown> || {}),
          ...event_data,
        };
        await supabase
          .from("access_logs")
          .update({
            event_data: merged_data,
            created_at: new Date().toISOString(),
            ip: ip ?? undefined,
            guest_id: guest_id || existing.guest_id || null,
          })
          .eq("id", existing.id);
        console.log(`[logEvent] Updated existing phase_view in DB for device ${device_uuid}:`, merged_data);
        return;
      }
    }

    await supabase.from("access_logs").insert({
      device_uuid,
      guest_id: guest_id ?? null,
      event_type,
      event_data,
      ip,
    });
    console.log(`[logEvent] Inserted new ${event_type} in DB for device ${device_uuid}:`, event_data);
  } catch (err) {
    // Never let logging break a request
    console.error("[logEvent] Failed to log event in DB:", err);
  }
}
