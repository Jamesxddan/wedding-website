# 5. Backend Schema — Data Model

> Project: James & Sharon — Wedding Website · Canonical SQL: `supabase/schema.sql` (run in Supabase SQL editor).

## Overview
- **Database:** Supabase (Postgres), project `sadikezxiwyntwutntnp`.
- **Design:** guest registry + device identity + audit + breach control + admin auth + settings. Media (photos) live in Google Drive, referenced only at request time — no photo blobs in the DB.

## Tables

### `guests`
One row per registered guest (one per device — no cross-device linking).
| Column | Type | Default | Notes |
|---|---|---|---|
| id | uuid | gen_random_uuid() | PK |
| name | text | — | from opening form |
| city | text | — | from opening form |
| email | text | — | unique, nullable |
| mobile | text | — | unique, nullable, Indian format |
| invitation_seen | boolean | false | invitation gate |
| is_owner | boolean | false | promoted by admin |
| created_at | timestamptz | now() | |
| last_seen_at | timestamptz | now() | |

### `device_fingerprints`
One or more per guest.
| Column | Type | Default | Notes |
|---|---|---|---|
| id | uuid | gen_random_uuid() | PK |
| guest_id | uuid | — | FK → guests, on delete cascade |
| device_uuid | text | — | unique |
| browser_signals_hash | text | '' | signals fingerprint |
| session_token | uuid | gen_random_uuid() | bearer for photo/session APIs |
| created_at / last_seen_at | timestamptz | now() | |

### `access_logs`
Audit trail of guest activity.
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| guest_id | uuid nullable | FK → guests, on delete set null |
| device_uuid | text | |
| event_type | text | check in ('phase_view','photo_api','form_submit','session_restore','breach_flag') |
| event_data | jsonb | |
| ip | text | |
| created_at | timestamptz | indexed desc |

### `breach_flags`
Rate-limit / abuse blocks.
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| device_uuid | text | |
| ip | text | |
| reason | text | check in ('api_rate_limit','repeated_form_submit','hotlink_attempt') |
| blocked_until | timestamptz | |
| created_at | timestamptz | |

### `gallery_events`
Screenshot / print / photo logging.
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| guest_id | uuid nullable | FK → guests, set null |
| device_uuid | text | |
| event_type | text | |
| metadata | jsonb | |
| created_at | timestamptz | indexed desc |

### `admins`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| email | text | unique |
| pass_hash | text | |
| is_super | boolean | false default |
| added_by | text | |
| created_at | timestamptz | |

### `admin_sessions`
| Column | Type | Notes |
|---|---|---|
| token | text PK | bearer |
| admin_id | uuid | FK → admins, on delete cascade |
| expires_at | timestamptz | now() + interval '8 hours' |
| created_at | timestamptz | |

### `settings`
Key/value site settings, seeded by default.
| Column | Type |
|---|---|
| key | text PK |
| value | text |
| updated_at | timestamptz |

Seeded keys: `phase_override` (auto), `youtube_live_url`, `youtube_ceremony_url`, `youtube_reception_url`, `announcement`.

## Relationships
- `guests` 1—∞ `device_fingerprints` (via `guest_id`, cascade delete)
- `guests` 1—∞ `access_logs` (via `guest_id`, set null)
- `guests` 1—∞ `gallery_events` (via `guest_id`, set null)
- `admins` 1—∞ `admin_sessions` (via `admin_id`, cascade delete)
- `breach_flags` and `access_logs` reference `device_uuid` (not a FK) because a blocked device may have no guest.

## Authentication & Sessions
- **Guests:** no password. Identity = device fingerprint (`lib/fingerprint.ts` multi-storage UUID + browser signals hash). Each device gets a `session_token` (bearer) checked by photo/session APIs.
- **Admins:** custom email + `pass_hash`; session row in `admin_sessions` (8h expiry), Google sign-in via `lib/admin-auth.ts`; every action logged by `lib/admin-audit.ts`.
- **Browser → Supabase:** never direct — all access through server-side Next.js API routes using the service key (`lib/supabase.ts`, `server-only`).

## Data Storage & Organization
- **Database:** identities, sessions, logs, flags, settings.
- **Object storage:** Google Drive (photos) — proxied server-side with HMAC-signed tokens (`lib/drive.ts`, `/api/drive-photos`, `/api/drive-image`); no hotlinkable public URLs.
- **Cache:** localStorage per device for instant phase render; Supabase authoritative.
- **Public vs private:** guest data/photo/comments private; only invited guests reach them.

## Indexes & Constraints
- Unique: `guests.email`, `guests.mobile`, `device_fingerprints.device_uuid`, `admins.email`, `settings.key`.
- Indexes: `device_fingerprints(device_uuid)`, `(session_token)`; `access_logs(device_uuid, guest_id, event_type, created_at desc)`; `breach_flags(device_uuid, blocked_until)`; `gallery_events(guest_id, event_type, created_at desc)`; `admin_sessions(admin_id, expires_at)`.
- Referential integrity: guests→fingerprints cascade; guests→logs set null; admins→sessions cascade.
- `event_type` / `reason` constrained by CHECK.

## Backup & Integrity
- Supabase-managed backups; schema versioned in `supabase/schema.sql` (reproducible).
- Hard deletes only via admin; audit trail in `access_logs` + `gallery_events`.
- Seeding idempotent (`on conflict do nothing`).

## Questions to Ask (answered)
1. Entities → guests, devices, logs, flags, gallery events, admins, sessions, settings.
2. Uniques → email, mobile, device_uuid, admin email, settings key.
3. RLS → not browser-facing; enforced server-side via service key + session tokens.
4. Media → Google Drive, not DB.
5. Migration → schema.sql is the source; already applied.
6. Audit → access_logs / gallery_events / admin-audit.
