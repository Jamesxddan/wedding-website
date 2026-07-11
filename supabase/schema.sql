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
  ('announcement',           '')
on conflict (key) do nothing;
