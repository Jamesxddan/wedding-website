export interface Guest {
  id: string;
  name: string;
  city: string;
  invitation_seen: boolean;
  is_owner: boolean;
  created_at: string;
  last_seen_at: string;
}

export interface DeviceFingerprint {
  id: string;
  guest_id: string;
  device_uuid: string;
  browser_signals_hash: string;
  session_token: string;
  created_at: string;
  last_seen_at: string;
}

export interface AccessLog {
  id: string;
  guest_id: string | null;
  device_uuid: string;
  event_type: "phase_view" | "photo_api" | "form_submit" | "session_restore" | "breach_flag" | "relink_failed";
  event_data: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
}

export interface BreachFlag {
  id: string;
  device_uuid: string;
  ip: string | null;
  reason: "api_rate_limit" | "repeated_form_submit" | "hotlink_attempt";
  blocked_until: string;
  created_at: string;
}
