-- Wedding website Supabase schema
-- Run this in the Supabase SQL editor: https://supabase.com/dashboard/project/sadikezxiwyntwutntnp/sql

-- Guests
create table if not exists guests (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  city          text not null,
  email         text unique,
  mobile        text unique,
  invitation_seen boolean not null default false,
  is_owner      boolean not null default false,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

-- Device fingerprints (one or more per guest)
create table if not exists device_fingerprints (
  id                   uuid primary key default gen_random_uuid(),
  guest_id             uuid not null references guests(id) on delete cascade,
  device_uuid          text not null unique,
  browser_signals_hash text not null default '',
  session_token        uuid not null default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  last_seen_at         timestamptz not null default now()
);

create index if not exists device_fingerprints_device_uuid_idx on device_fingerprints(device_uuid);
create index if not exists device_fingerprints_session_token_idx on device_fingerprints(session_token);

-- Access logs
create table if not exists access_logs (
  id          uuid primary key default gen_random_uuid(),
  guest_id    uuid references guests(id) on delete set null,
  device_uuid text not null,
  event_type  text not null check (event_type in ('phase_view','photo_api','form_submit','session_restore','breach_flag')),
  event_data  jsonb,
  ip          text,
  created_at  timestamptz not null default now()
);

create index if not exists access_logs_device_uuid_idx on access_logs(device_uuid);
create index if not exists access_logs_guest_id_idx on access_logs(guest_id);
create index if not exists access_logs_event_type_idx on access_logs(event_type);
create index if not exists access_logs_created_at_idx on access_logs(created_at desc);

-- Breach flags
create table if not exists breach_flags (
  id            uuid primary key default gen_random_uuid(),
  device_uuid   text not null,
  ip            text,
  reason        text not null check (reason in ('api_rate_limit','repeated_form_submit','hotlink_attempt')),
  blocked_until timestamptz not null,
  created_at    timestamptz not null default now()
);

create index if not exists breach_flags_device_uuid_idx on breach_flags(device_uuid);
create index if not exists breach_flags_blocked_until_idx on breach_flags(blocked_until);

-- Gallery events (screenshot / print logging)
create table if not exists gallery_events (
  id          uuid primary key default gen_random_uuid(),
  guest_id    uuid references guests(id) on delete set null,
  device_uuid text,
  event_type  text not null,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists gallery_events_guest_id_idx   on gallery_events(guest_id);
create index if not exists gallery_events_event_type_idx on gallery_events(event_type);
create index if not exists gallery_events_created_at_idx on gallery_events(created_at desc);

-- Multi-admin authentication
create table if not exists admins (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  pass_hash  text not null,
  is_super   boolean not null default false,
  added_by   text,
  created_at timestamptz not null default now()
);

create table if not exists admin_sessions (
  token      text primary key,
  admin_id   uuid not null references admins(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '8 hours'),
  created_at timestamptz not null default now()
);

create index if not exists admin_sessions_admin_id_idx on admin_sessions(admin_id);
create index if not exists admin_sessions_expires_at_idx on admin_sessions(expires_at);

-- Admin-controlled site settings
create table if not exists settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

-- Seed defaults so the main site always gets a value
insert into settings (key, value) values
  ('phase_override',         'auto'),
  ('youtube_live_url',       ''),
  ('youtube_ceremony_url',   ''),
  ('youtube_reception_url',  ''),
  ('youtube_comment_video_id',''),
  ('announcement',           '')
on conflict (key) do nothing;

-- RSVPs (one per guest, upserted)
create table if not exists rsvps (
  id               uuid primary key default gen_random_uuid(),
  guest_id         uuid not null unique references guests(id) on delete cascade,
  response         text not null check (response in ('attending', 'not_attending', 'maybe')),
  guest_count      integer not null default 1 check (guest_count >= 1 and guest_count <= 20),
  meal_pref        text check (meal_pref in ('veg', 'non_veg')),
  attending_events text check (attending_events in ('ceremony', 'reception', 'both')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists rsvps_guest_id_idx       on rsvps(guest_id);
create index if not exists rsvps_response_idx        on rsvps(response);
create index if not exists rsvps_attending_events_idx on rsvps(attending_events);

-- Live ticker (wedding-day updates posted by admin)
create table if not exists ticker_updates (
  id          uuid primary key default gen_random_uuid(),
  message     text not null check (char_length(message) <= 160),
  icon        text not null default '✨',
  created_at  timestamptz not null default now()
);

create index if not exists ticker_updates_created_at_idx on ticker_updates(created_at desc);

-- Emoji reactions on ticker updates (toggle: one per emoji per guest per update)
create table if not exists ticker_reactions (
  update_id   uuid not null references ticker_updates(id) on delete cascade,
  guest_id    uuid not null references guests(id) on delete cascade,
  emoji       text not null,
  created_at  timestamptz not null default now(),
  primary key (update_id, guest_id, emoji)
);

create index if not exists ticker_reactions_update_id_idx on ticker_reactions(update_id);

-- Admin audit log (immutable append-only; written by lib/admin-audit.ts)
create table if not exists admin_audit_logs (
  id          uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action      text not null,
  details     jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists admin_audit_logs_admin_email_idx on admin_audit_logs(admin_email);
create index if not exists admin_audit_logs_created_at_idx  on admin_audit_logs(created_at desc);

-- Wedding FAQ chatbot — every free-text question + answer is logged here for
-- admin visibility and abuse monitoring. flagged=true means the model refused
-- an off-topic/jailbreak attempt (an alert email is also sent in that case).
create table if not exists chat_logs (
  id          uuid primary key default gen_random_uuid(),
  guest_id    uuid references guests(id) on delete set null,
  device_uuid text not null,
  question    text not null,
  answer      text not null,
  flagged     boolean not null default false,
  ip          text,
  created_at  timestamptz not null default now()
);

create index if not exists chat_logs_device_uuid_idx on chat_logs(device_uuid);
create index if not exists chat_logs_created_at_idx   on chat_logs(created_at desc);
