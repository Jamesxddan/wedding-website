# Relink email-OTP escape hatch — design

Date: 2026-09-07
Status: Approved (pending implementation plan)

## Context

Investigating a real incident (a guest, "Whitson", was shown another guest's
name/city during relink due to a browser-fingerprint collision — see
`app/api/session/route.ts` fallback matching) surfaced two related gaps:

1. The fingerprint-collision bug itself — already fixed separately (ambiguity
   guard in `app/api/session/route.ts`, broadened fingerprint signals in
   `lib/fingerprint.ts`).
2. **No escape hatch.** Once a device lands in `RelinkForm` (whether via a
   fingerprint auto-guess, a "name not found" manual lookup, or a
   phone/email mismatch), there is no way forward except successfully
   matching an existing guest record by name+city+phone/email. A guest who
   isn't recognized — wrongly or genuinely — has no path to prove who they
   are and continue.

This spec covers a new self-service path: verify control of an email inbox
via a one-time code, then either relink to the guest record that email
belongs to, or register as a new guest with that email pre-filled.

## Goals

- Every relink dead end (auto-guessed match, "not found", "mismatch") gets a
  visible "This isn't me" / "Verify with a different email" link.
- That link leads to a dedicated page, `/relink/verify-email`, that:
  - Sends a 6-digit OTP to an email address the guest provides.
  - Verifies the code (with resend + attempt limits).
  - On success, looks up a guest by that email:
    - **Match** → binds this device to that guest (same pattern as the
      existing token-based relink), guest is fully logged in.
    - **No match** → guest is sent to the normal FIRST_VISIT registration
      form with the verified email pre-filled and read-only.
- Reject disposable/temporary email domains before ever sending a code.
- No email enumeration: requesting a code never reveals whether the email
  belongs to a guest.

## Non-goals

- Phone-based OTP (email only, for this iteration).
- Replacing the existing name+city+phone/email relink flow — this is an
  additional path, not a replacement.
- Building the `/relink/verify` page referenced by the existing (and
  currently non-functional) "token_verify" step in `RelinkForm` — that is a
  separate pre-existing gap, out of scope here.

## Architecture / flow

```
RelinkForm (lookup / verify / token_verify — any dead end)
  → "This isn't me" / "Verify with a different email" link
  → same-tab navigation to /relink/verify-email
       Step "email":
         input + Send code → POST /api/relink/email-otp/request
       Step "code":
         6-digit input, Verify button, Resend (60s cooldown, capped sends)
         → POST /api/relink/email-otp/verify
       On verify success:
         - guest found by email  → status "relinked": store session_token/
           name/city (safeSetItem, same as completeRelink) → redirect to "/"
         - no guest found        → status "register": store verified email
           in sessionStorage (key: verified_relink_email) → redirect to "/"
           → Home detects the key and forces FIRST_VISIT with the email
             field pre-filled/read-only instead of running the normal
             session check.
```

## Data model

No SQL migration tooling exists in this repo (schema is managed directly in
Supabase). This table needs to be created once via the Supabase SQL editor:

```sql
create table email_otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,           -- sha256(code + server pepper), never plaintext
  device_uuid text not null,
  attempts int not null default 0,   -- failed verify attempts against the current code
  send_count int not null default 1, -- resend count within the rate-limit window
  last_sent_at timestamptz not null default now(),
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index email_otps_email_idx on email_otps (email);
```

One logical "pending OTP" per email at a time: a fresh `/request` call
overwrites/updates the existing unverified row for that normalized email
rather than inserting a new one (upsert keyed on `email`).

## Security

- **Per-email rate limiting**: max 3 sends per email per rolling hour, and a
  60s minimum gap between sends (`last_sent_at` check). This is independent
  of the existing IP/device-based `checkAndBlock` in `lib/breach.ts` — it
  protects a *victim's* inbox from being spammed by someone who just knows
  their email, not only the requesting device.
- **No enumeration**: `/api/relink/email-otp/request` always responds
  `200 { ok: true }` (aside from validation/rate-limit errors), regardless
  of whether the email matches a guest. The guest-match branch only happens
  after successful OTP verification.
- **Hashed codes**: the 6-digit code is hashed (sha256 + server-side pepper
  env var) before storage; the plaintext code only ever exists in the
  outbound email and the user's own verify request.
- **Attempt cap**: 5 wrong-code attempts invalidates the current code
  (`max_attempts`); the guest must request a resend to get a fresh code.
  Combined with the 10-minute expiry, this makes brute-forcing the 6-digit
  space impractical.
- **Disposable-domain block**: the submitted email's domain is checked
  against a static blocklist package (e.g. `disposable-email-domains`) at
  `/request` time, before any code is generated or sent. Rejected with
  `400 { error: "disposable_email" }`.

## API endpoints

### `POST /api/relink/email-otp/request`

Body: `{ email: string, device_uuid: string }`

- Normalize email (trim + lowercase).
- Reject disposable domains → `400 { error: "disposable_email" }`.
- Reject malformed email → `400 { error: "invalid_email" }`.
- Enforce per-email rate limit → `429 { error: "rate_limited", retry_after_seconds }`.
- Generate 6-digit code, hash it, upsert the `email_otps` row (reset
  `attempts` to 0, bump `send_count`, set `last_sent_at`, `expires_at` = now
  + 10 min).
- Send the code via the existing Resend integration (same pattern as
  `lib/rsvp-email.ts`).
- Always return `200 { ok: true }` on any non-error path.

### `POST /api/relink/email-otp/verify`

Body: `{ email: string, code: string, device_uuid: string, browser_signals_hash?: string, user_agent?: string }`

- Load the latest `email_otps` row for the normalized email.
  - Missing or `expires_at` past → `410 { error: "expired_or_missing" }`.
- Compare hash of submitted code against stored `code_hash`.
  - Mismatch → increment `attempts`; if now ≥ 5 → `403 { error: "max_attempts", must_resend: true }`;
    otherwise → `403 { error: "invalid_code", attempts_remaining }`.
  - Match → set `verified_at = now()`.
- Look up `guests` by normalized email (same precedence as `/api/register`'s
  email lookup).
  - **Found**: reuse-or-create a `device_fingerprints` row for this
    `device_uuid` bound to that guest (same insert pattern as the existing
    token-based branch in `/api/relink`), mark `guests.invitation_seen =
    true`. Return `200 { status: "relinked", session_token, name, city }`.
  - **Not found**: return `200 { status: "register", email }`.

## UI — `/relink/verify-email`

Self-contained page component; derives its own `device_uuid` via
`getOrCreateDeviceUUID()` (from `lib/fingerprint.ts`), no query params
required.

- **Step "email"**: email input, "Send code" button → calls `/request`;
  inline validation error for disposable/malformed addresses before any
  network call where feasible (client-side disposable-domain check mirrors
  the server list to give instant feedback, server remains the source of
  truth).
- **Step "code"**: 6-digit input, "Verify" button; "Resend code" link,
  disabled with a live countdown until 60s have elapsed since the last
  send, and disabled entirely (with an explanatory message) once
  `send_count` hits the hourly cap; "← use a different email" link returns
  to step "email".
- **On `relinked`**: store `session_token`/`name`/`city` via `safeSetItem`
  (same keys/pattern as `completeRelink` in `app/page.tsx`), redirect to
  `/`.
- **On `register`**: store the verified email in `sessionStorage` under
  `verified_relink_email`, redirect to `/`. `Home` (`app/page.tsx`) checks
  for this key on mount; if present, it skips the normal session check,
  forces `Phase.FIRST_VISIT`, and passes the email into the registration
  form as pre-filled/read-only. The key is cleared once consumed.

Entry point: every dead end in the existing `RelinkForm` (lookup
"not_found" error state, verify "phone_mismatch"/"email_mismatch" error
state, and the auto-guessed `relinkPending` initial view) gets a "This
isn't me? Verify with a different email" link/button that navigates
(same-tab) to `/relink/verify-email`.

## Error handling & edge cases

- **Typo mid-flow**: "use a different email" resets to step "email";
  pending server-side OTP row simply expires naturally (10 min).
- **Expired code**: `expired_or_missing` → UI prompts to resend, with the
  resend cooldown bypassed since there's nothing valid to resend against.
- **Max attempts**: UI disables code input, prompts for resend.
- **Resend cap hit**: UI shows a "try again later or contact James &
  Sharon" message, matching the tone of the existing "Name not found"
  error copy in `RelinkForm`.
- **Concurrent verification from two devices for the same email**: the
  guest-by-email lookup and fingerprint insert follow the same pattern as
  today's `/api/relink` and `/api/register` — last-write-wins, no new risk
  introduced beyond what those endpoints already accept.
- **Abandoned mid-flow**: no cross-device coupling of the OTP row beyond
  email; a stale unverified row is simply overwritten by the next
  `/request` call for that email.

## Testing plan

- **Unit tests** (`tests/email-otp.test.ts`, mocking pattern matching
  `tests/session.test.ts` / `tests/relink.test.ts`):
  - request: rate-limit enforcement, disposable-domain rejection, resend
    cooldown enforcement.
  - verify: correct code → `relinked` branch (guest match) and `register`
    branch (no match); wrong code increments attempts; 5th wrong attempt →
    `max_attempts`; expired row → `expired_or_missing`.
- **E2E test** (`tests/e2e/relink-email-otp.spec.ts`): drives "This isn't
  me" → email entry → code entry → success branch. Since real inboxes
  aren't available in CI, `/api/relink/email-otp/request` additionally
  returns a `debug_code` field when `process.env.VERCEL_ENV !==
  "production"` (matching this repo's existing dev/staging-exemption
  pattern, e.g. the photo-access rule in `CLAUDE.md`), so the E2E spec can
  read the code directly rather than needing a real mailbox.

## Env / config additions

- `OTP_HASH_PEPPER` — new secret, server-only, used when hashing codes.
- Reuses existing `RESEND_API_KEY` for sending.
- New npm dependency: `disposable-email-domains` (widely-used static
  blocklist package; exposes a domain `Set`/array checked against the
  submitted email's domain — no network calls, no API key).
