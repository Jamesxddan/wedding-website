# Supabase Backend Design
**Wedding Website — James & Sharon**
Date: 2026-07-07

---

## Overview

Replace localStorage as the sole source of truth with a Supabase backend. Guest identity, device fingerprints, access logs, photo gating, and breach detection all flow through server-side Next.js API routes — the browser never talks to Supabase directly. localStorage stays as a fast local cache; Supabase is authoritative.

**Approach:** localStorage-as-cache, Supabase-as-truth. Phase renders instantly from localStorage on repeat visits. On every mount, a single `/api/session` call syncs the device against Supabase in the background. If localStorage was cleared but the device UUID survives in a cookie or IndexedDB, the session is silently restored — the guest never sees the opening form again.

---

## Database Schema

### `guests`
One row per registered guest (one per device — no cross-device linking).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Supabase auto-generated |
| `name` | text | From opening form |
| `city` | text | From opening form |
| `invitation_seen` | boolean | Default false |
| `is_owner` | boolean | Default false — flip manually in Supabase dashboard to exempt from all checks |
| `created_at` | timestamptz | |
| `last_seen_at` | timestamptz | Updated on every session call |

### `device_fingerprints`
One row per device. Multiple devices can belong to one guest (same person, different form submissions from different devices).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `guest_id` | uuid FK | → guests.id |
| `device_uuid` | text UNIQUE | Random UUID generated on first visit, stored in localStorage + cookie + IndexedDB |
| `browser_signals_hash` | text | Hash of canvas fingerprint + user agent + timezone + screen size. Fallback identifier if UUID is lost from all storage. |
| `session_token` | text UNIQUE | Random UUID issued on registration. Sent as a header on all photo API calls. |
| `created_at` | timestamptz | |
| `last_seen_at` | timestamptz | |

### `access_logs`
Running diary of every meaningful event.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `guest_id` | uuid FK | Nullable — pre-registration visits won't have a guest yet |
| `device_uuid` | text | |
| `event_type` | text | `phase_view` \| `photo_api` \| `form_submit` \| `session_restore` \| `breach_flag` |
| `event_data` | jsonb | e.g. `{ phase: "RETURN_VISIT" }` or `{ folder: "engagement" }` |
| `ip` | text | Real IP from request headers |
| `created_at` | timestamptz | |

### `breach_flags`
Active blocks on suspicious devices.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `device_uuid` | text | |
| `ip` | text | |
| `reason` | text | `api_rate_limit` \| `repeated_form_submit` |
| `blocked_until` | timestamptz | After this time the block expires automatically |
| `created_at` | timestamptz | |

---

## API Routes

All new routes live under `/app/api/`. Supabase service key is server-side only — never exposed to the browser.

### `POST /api/session`
Called on every page mount. Identifies the device and syncs state.

**Request body:**
```json
{
  "device_uuid": "...",
  "browser_signals_hash": "..."
}
```

**Response (new device):**
```json
{ "status": "new" }
```

**Response (known device):**
```json
{
  "status": "known",
  "name": "Sarah",
  "city": "Chennai",
  "invitation_seen": true,
  "session_token": "..."
}
```

On a `known` response, the client silently hydrates localStorage with the returned values. A `restored` flag is set in component state to show the "Replay the invitation ↩" button.

### `POST /api/register`
Called when the opening form is submitted.

**Request body:**
```json
{
  "name": "Sarah",
  "city": "Chennai",
  "device_uuid": "...",
  "browser_signals_hash": "..."
}
```

**Response:**
```json
{ "session_token": "..." }
```

Creates rows in `guests` and `device_fingerprints`. Logs a `form_submit` event. Checks breach flags before creating — if device is blocked, returns a polite 429 message.

**Blocked response (429):**
```json
{
  "error": "blocked",
  "message": "It looks like you've visited a few times already — please check back in a little while. We can't wait to celebrate with you! 🌸"
}
```

### Existing routes: `GET /api/drive-photos` and `GET /api/drive-image`
Add session token check at the top of each handler.

- `NEXT_PUBLIC_VERCEL_ENV !== "production"` → skip all checks, proceed
- Read `x-session-token` header; if missing → 401
- Look up token in `device_fingerprints` table; if not found → 401
- Device's guest has `is_owner: true` → skip breach checks, proceed
- Found and valid → run breach checks, then proceed and log `photo_api` event

---

## Device Fingerprinting

**UUID generation (client-side, on first visit):**
```
1. Generate crypto.randomUUID()
2. Store in: localStorage("device_uuid"), document.cookie("device_uuid", 1yr), IndexedDB("fingerprint", "device_uuid")
3. On every subsequent load, read from whichever storage still has it (localStorage first, then cookie, then IndexedDB)
```

**Browser signals hash:**
```
Canvas fingerprint + navigator.userAgent + Intl.DateTimeFormat().resolvedOptions().timeZone + screen.width + screen.height
→ SHA-256 hash via SubtleCrypto API
```

The UUID is the primary identifier. The browser signals hash is a fallback — if all three UUID storages are cleared, the signals hash is used to match against existing records (best-effort, not guaranteed).

---

## Breach Detection

Three checks run at the start of every API route handler. Check 1 is a fast pre-check; Checks 2 and 3 are the two breach triggers.

**Exemptions (always skip both checks):**
- `NEXT_PUBLIC_VERCEL_ENV !== "production"`
- Device's guest has `is_owner: true`

**Check 1 — Is device currently blocked?**
Query `breach_flags` where `device_uuid = X AND blocked_until > NOW()`. If found, return 429 with polite message immediately.

**Check 2 — API rate limit:**
Count `access_logs` rows where `device_uuid = X AND created_at > NOW() - interval '60 seconds'`.
If count > 30 → insert `breach_flags` row with `reason: "api_rate_limit"`, `blocked_until: NOW() + interval '1 hour'`. Return 429:
> *"We're just catching our breath — please give it a moment and try again."*

**Check 3 — Repeated form submissions:**
Count `access_logs` rows where `device_uuid = X AND event_type = "form_submit" AND created_at > NOW() - interval '2 hours'`.
If count > 10 → insert `breach_flags` row with `reason: "repeated_form_submit"`, `blocked_until: NOW() + interval '24 hours'`. Return 429:
> *"It looks like you've visited a few times already — please check back in a little while. We can't wait to celebrate with you! 🌸"*

---

## Sticky Session Restore

When `/api/session` returns `{ status: "known" }`:

1. Client hydrates localStorage: `guest_name`, `guest_city`, `invitation_seen`, `session_token`
2. `usePhase` tick is incremented → phase re-derives from freshly hydrated localStorage
3. Component sets `sessionRestored: true` state
4. A subtle button appears on the CountdownHero: **"↩ Replay the invitation"** — clicking it clears localStorage and calls `refresh()`, sending the guest back to the opening screen

The guest never sees a loading screen. The hydration happens silently before any UI changes.

---

## Admin Page (`/admin`)

Password-protected with a single env var `ADMIN_PASSWORD`. Correct password sets a session cookie. No Supabase Auth — just one shared secret.

**Guest List tab:**
Table of all guests — name, city, first visit, last visit, device count, flagged status. Click any row to expand their full access log.

**Access Log tab:**
Live feed of all `access_logs` rows, newest first. Columns: timestamp, guest name (or "Unknown"), event type, event data, IP. Filterable by guest name or event type.

**Flagged Devices tab:**
Active `breach_flags` rows — device UUID (first 8 chars), reason, IP, blocked until. Each row has an **Unblock** button that deletes the flag immediately.

**Owner Toggle:**
Each guest row in the Guest List has a toggle to flip `is_owner`. Removes the need to open the Supabase dashboard for this common action.

---

## Environment Variables

Add to `.env.local` and Vercel environment settings:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key   # server-side only, never NEXT_PUBLIC_
ADMIN_PASSWORD=your_chosen_password
```

---

## What Changes in Existing Code

| File | Change |
|---|---|
| `lib/usePhase.ts` | On mount, call `/api/session`; if `known`, hydrate localStorage before deriving phase. Expose `sessionRestored` boolean. |
| `components/phases/FirstVisitForm.tsx` | On submit, call `/api/register` instead of writing directly to localStorage. Handle 429 with polite error UI. |
| `components/phases/CountdownHero.tsx` | Show "↩ Replay the invitation" button when `sessionRestored` is true. |
| `app/api/drive-photos/route.ts` | Add session token check + breach check at top. |
| `app/api/drive-image/route.ts` | Add session token check + breach check at top. |
| `app/api/session/route.ts` | **New** — device lookup + session restore |
| `app/api/register/route.ts` | **New** — guest + device creation |
| `app/api/admin/` | **New** — guest list, access logs, breach flags, unblock, owner toggle |
| `app/admin/page.tsx` | **New** — admin UI |
| `lib/supabase.ts` | **New** — Supabase client (service key, server-side only) |
| `lib/fingerprint.ts` | **New** — UUID generation + multi-storage read/write + browser signals hash |
| `lib/breach.ts` | **New** — shared breach check logic called by API routes |

---

## Implementation Phases

**Phase 1 — Foundation (build first):**
Supabase schema, `lib/supabase.ts`, `lib/fingerprint.ts`, `/api/session`, `/api/register`, `usePhase` update, `FirstVisitForm` update, sticky session restore in CountdownHero, admin page.

**Phase 2 — Security layer (build on top of Phase 1):**
Session token check in photo API routes, `lib/breach.ts`, breach checks in all API routes, access logging across all routes.
