# WhatsApp OTP relink channel — design

Date: 2026-09-27
Status: Approved (pending implementation plan)

## Context

The existing relink escape hatch (`docs/superpowers/specs/2026-09-07-relink-email-otp-design.md`)
lets a guest whose device isn't recognized verify themselves by proving
control of an email inbox. Not every guest reliably checks email, but most
have WhatsApp — this spec adds WhatsApp as a second OTP channel alongside
the existing email one, following the same verify → relink-or-register
shape.

This depends on the persistent WhatsApp listener process from
`docs/superpowers/specs/2026-09-27-whatsapp-reply-tracking-design.md` —
sending a WhatsApp message can only happen from that always-on process on
JD's own machine (a Vercel-hosted API route can't run whatsapp-web.js
directly), so this spec's outbound OTP codes are queued for that process to
send, not sent synchronously from the API route the way email is.

## Goals

- A guest hitting any relink dead end sees a "Verify with WhatsApp" option
  alongside the existing "Verify with a different email" one — **only when
  the listener process is confirmed alive** (see Availability check below).
- Same verification shape as email: 6-digit code, resend cooldown, attempt
  cap, expiry.
- On successful verification: relink to the matching guest (by `mobile`) or
  fall through to registration with the phone number pre-filled.
- The OTP message itself follows the same "this is automated" disclaimer
  convention as the reminder script (see the reply-tracking spec's sibling
  bounded fix to `send-whatsapp-reminders.mjs` — the OTP send should carry
  the same footer, since it's also outbound from JD's personal WhatsApp
  number).

## Non-goals

- Replacing or deprecating the email OTP channel — this is an additional
  option, guest picks either.
- Real-time/synchronous delivery guarantees. WhatsApp delivery depends on
  the listener process's poll interval (~5s) plus actual WhatsApp send
  latency — noticeably slower than email, and only possible while JD's
  listener is running at all.
- A UI indicator explaining *why* the WhatsApp option is missing (it simply
  isn't shown when the heartbeat is stale — no "WhatsApp unavailable"
  messaging, to avoid confusing guests who don't need that channel anyway).

## Availability check (heartbeat)

The listener process (already running continuously for reply-tracking)
upserts a `settings` row every ~30s:

```
key: 'whatsapp_listener_last_heartbeat'
value: <ISO timestamp>
```

(Reuses the existing `settings` key-value table — no new table needed.)

`GET /api/settings` already exposes this table to the client. The relink
page treats the heartbeat as stale — and hides the WhatsApp option — if
it's missing or older than 2 minutes. This means:
- If JD's machine/listener is off, guests simply don't see the WhatsApp
  option at all (falls back to email-only, which always works).
- No guest is ever left waiting on a code that will never arrive.

## Architecture / flow

```
RelinkForm dead end (lookup "not_found", verify "phone_mismatch"/
"email_mismatch", or auto-guessed relinkPending)
  → "This isn't me" now offers up to two links:
       "Verify with a different email" → /relink/verify-email (existing, unchanged)
       "Verify with WhatsApp" → /relink/verify-whatsapp (new; hidden if heartbeat stale)
            Step "phone":
              input + Send code → POST /api/relink/whatsapp-otp/request
                → inserts a row into whatsapp_otp_outbox
                → listener process polls this table (~every 5s), sends the
                  code via whatsapp-web.js, sets last_sent_at
            Step "code":
              6-digit input, Verify button, Resend (60s cooldown, capped sends)
                → POST /api/relink/whatsapp-otp/verify
            On verify success:
              - guest found by mobile → status "relinked" (same binding
                pattern as email/token relink)
              - no guest found        → status "register", phone pre-filled
                read-only in FirstVisitForm (same sessionStorage-key
                handoff pattern as the email flow's verified_relink_email,
                using a parallel verified_relink_phone key)
```

## Data model

```sql
create table if not exists whatsapp_otp_outbox (
  id            uuid primary key default gen_random_uuid(),
  phone         text not null,
  code_hash     text not null,           -- sha256(code + OTP_HASH_PEPPER), same pepper as email_otps
  device_uuid   text not null,
  attempts      int not null default 0,
  send_count    int not null default 1,
  last_sent_at  timestamptz,             -- null until the listener actually sends it
  requested_at  timestamptz not null default now(),
  expires_at    timestamptz not null,
  verified_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists whatsapp_otp_outbox_phone_idx on whatsapp_otp_outbox (phone);
```

One logical pending OTP per phone at a time — a fresh `/request` call
upserts the existing unverified row for that normalized phone, same pattern
as `email_otps`.

Phone normalization reuses the same digits-only/trailing-10-digit matching
logic already built for the reply-tracking listener's guest matching (see
the sibling spec) — both need to tolerate the same messy stored
`guests.mobile` formats.

## Security

Mirrors the email-OTP spec's security posture exactly, phone in place of email:

- **Per-phone rate limiting**: max 3 sends per phone per rolling hour, 60s
  minimum gap between sends.
- **No enumeration**: `/request` always responds `200 { ok: true }` on any
  non-error path, regardless of whether the phone matches a guest.
- **Hashed codes**: sha256 + `OTP_HASH_PEPPER` (reused from the email-OTP
  feature), never stored or logged in plaintext.
- **Attempt cap**: 5 wrong attempts invalidates the current code; guest
  must request a resend.
- **Heartbeat check happens before rate-limit/generation** — a stale
  listener short-circuits to `503` before any code is generated, so a dead
  listener can't silently accumulate unsent outbox rows indefinitely (rows
  do still expire naturally via `expires_at` either way).

## API endpoints

### `POST /api/relink/whatsapp-otp/request`

Body: `{ phone: string, device_uuid: string }`

- Normalize phone.
- Check `whatsapp_listener_last_heartbeat` freshness → stale/missing →
  `503 { error: "channel_unavailable" }`.
- Enforce per-phone rate limit → `429 { error: "rate_limited", retry_after_seconds }`.
- Generate 6-digit code, hash it, upsert `whatsapp_otp_outbox` (reset
  `attempts` to 0, bump `send_count`, `requested_at` = now, `expires_at` =
  now + 10 min, `last_sent_at` left null — the listener sets it once
  actually sent).
- Always return `200 { ok: true }` on any non-error path.

### `POST /api/relink/whatsapp-otp/verify`

Body: `{ phone: string, code: string, device_uuid: string, browser_signals_hash?: string, user_agent?: string }`

- Load latest `whatsapp_otp_outbox` row for the normalized phone.
  - Missing or `expires_at` past → `410 { error: "expired_or_missing" }`.
- Compare hash of submitted code against `code_hash`.
  - Mismatch → increment `attempts`; ≥5 → `403 { error: "max_attempts", must_resend: true }`;
    otherwise → `403 { error: "invalid_code", attempts_remaining }`.
  - Match → set `verified_at = now()`.
- Look up `guests` by normalized `mobile` (same trailing-digit matching as
  the reply-tracking listener).
  - **Found**: bind `device_uuid` to that guest (same `device_fingerprints`
    insert pattern as the email-OTP relinked branch), mark
    `guests.invitation_seen = true`. Return `200 { status: "relinked", session_token, name, city }`.
  - **Not found**: return `200 { status: "register", phone }`.

## Listener extension (outbox sender)

The reply-tracking listener (`scripts/whatsapp-listener.mjs`) gains one more
responsibility alongside receiving messages: every ~5s, poll
`whatsapp_otp_outbox` for rows where `last_sent_at is null and expires_at > now()`,
send the code via the existing WhatsApp client (`Hi! Your verification code
for James & Sharon's wedding website is: 123456` + the standard disclaimer
footer), set `last_sent_at = now()`. Rows already past `expires_at` when
picked up are skipped (marked sent-with-no-op is unnecessary — simply left
for the guest to see `expired_or_missing` on verify and request a fresh one).

The listener also owns writing the heartbeat (`settings` upsert every
~30s) — this doubles as a liveness signal for both this feature and future
ones that might need to know "is WhatsApp send capability currently up."

## UI — `/relink/verify-whatsapp`

Same shape/component pattern as `/relink/verify-email`:
- **Step "phone"**: phone input (reusing the existing `PhoneInput` component
  with country-code picker from the main registration form), "Send code"
  button.
- **Step "code"**: 6-digit input, Verify, Resend with cooldown/cap, "← use
  a different number" link.
- **On `relinked`**: same `safeSetItem` pattern as email, redirect to `/`.
- **On `register`**: stores verified phone in `sessionStorage` under
  `verified_relink_phone` (parallel to email's `verified_relink_email`);
  `Home` checks for this key the same way, pre-fills/locks the mobile field
  in `FirstVisitForm` instead of email.

Entry point: same dead-end states in `RelinkForm` that currently show
"Verify with a different email" gain a second conditional link, shown only
when `/api/settings`'s heartbeat value is fresh.

## Error handling & edge cases

Mirrors the email-OTP spec's edge cases (typo mid-flow, expired code, max
attempts, resend cap, concurrent verification) with phone in place of
email. One WhatsApp-specific case:
- **Heartbeat goes stale between page load and code request**: `/request`
  returns `503`; UI shows a message suggesting the email option instead
  rather than a raw error.

## Testing plan

- **Unit tests** (`tests/whatsapp-otp.test.ts`, mirroring
  `tests/email-otp.test.ts`): rate limiting, heartbeat-stale rejection
  (mocked stale/fresh `settings` row), attempt cap, expiry, phone
  normalization edge cases (reusing the same messy-number regression cases
  as the reply-tracking listener's tests).
- **Listener outbox-polling unit test** (mocked Supabase + mocked WhatsApp
  client): confirms unsent rows get picked up, sent, and marked
  `last_sent_at`; confirms expired rows are skipped without erroring.
- **E2E**: same `debug_code` bypass pattern as the email flow (route
  returns the code directly outside production) — no real WhatsApp needed
  in CI, and no dependency on the listener process being reachable from CI
  at all.

## Env / config additions

None beyond what already exists — reuses `OTP_HASH_PEPPER` (from the
email-OTP feature) and the existing `.ww-session` / `settings` table.
