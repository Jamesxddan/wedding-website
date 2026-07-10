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
  reason        text not null check (reason in ('api_rate_limit','repeated_form_submit')),
  blocked_until timestamptz not null,
  created_at    timestamptz not null default now()
);

create index if not exists breach_flags_device_uuid_idx on breach_flags(device_uuid);
create index if not exists breach_flags_blocked_until_idx on breach_flags(blocked_until);
