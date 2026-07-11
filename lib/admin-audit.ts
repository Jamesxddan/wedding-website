import "server-only";
import { supabase } from "@/lib/supabase";
import { getAdminSession } from "@/lib/admin-auth";

export type AuditAction =
  | "delete_guest"
  | "factory_reset"
  | "reset_all_sessions"
  | "fresh_start"
  | "clear_guest_logs"
  | "clear_all_logs"
  | "phase_override"
  | "announcement_set"
  | "unblock_flag"
  | "youtube_url_set"
  | "toggle_owner"
  | "content_update";

export async function auditLog(action: AuditAction, details?: Record<string, unknown>): Promise<void> {
  try {
    const session = await getAdminSession();
    if (!session) return;
    await supabase.from("admin_audit_logs").insert({
      admin_email: session.email,
      action,
      details: details ?? null,
    });
  } catch {
    // Never let audit logging break a request
  }
}
