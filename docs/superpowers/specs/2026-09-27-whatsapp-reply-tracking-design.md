# WhatsApp reply tracking & auto-RSVP — design

Date: 2026-09-27
Status: Approved (pending implementation plan)

## Context

`scripts/send-whatsapp-reminders.mjs` sends reminder messages to guests via
`whatsapp-web.js`, then immediately disconnects (`client.destroy()`). Guests
who reply directly in WhatsApp ("yes, we'll be there!") have that reply land
in JD's personal WhatsApp with nothing reading it — the RSVP in Supabase
never changes unless the guest separately visits the website and fills in
the form.

This spec covers a persistent companion process that listens for those
replies, logs every one for a full audit trail, and — when a reply
unambiguously indicates attendance — updates the guest's real RSVP
automatically.

## Goals

- Every inbound WhatsApp message from a phone number matching a `guests.mobile`
  is logged, regardless of content or whether it changes anything.
- Messages that unambiguously read as attending / not attending / maybe
  automatically upsert the guest's row in `rsvps`.
- Ambiguous messages (no keyword match, or matches for more than one
  category) are logged but never guessed at — they surface for JD to read
  manually.
- Survives normal interruptions (WhatsApp Web disconnects, the host machine
  sleeping/restarting) without silently losing replies that arrived while
  it was down.

## Non-goals

- LLM-based interpretation. Classification is deliberately simple keyword
  matching — no Anthropic/OpenAI key wired into this project, and the
  simpler approach fails safe (falls to "unclear") rather than guessing
  wrong on unusual phrasing.
- Inferring `guest_count`, `meal_pref`, or `attending_events` from free text.
  A one-line WhatsApp reply can reliably convey yes/no/maybe and nothing
  more precise — those fields stay whatever they were, or default
  (`guest_count = 1`) on a brand new RSVP row.
- True 24/7 hosting independent of JD's own machine (e.g. a dedicated VPS).
  JD confirmed running this on his own machine is fine for now.
- Any UI for browsing `whatsapp_replies` (e.g. an admin page). Out of scope
  for this iteration — reviewed via direct Supabase queries for now.
- Sending replies back to guests (e.g. an auto "thanks, got it!" acknowledgment).

## Data model

New table, alongside the existing `guests` / `rsvps` in `supabase/schema.sql`:

```sql
create table if not exists whatsapp_replies (
  id                uuid primary key default gen_random_uuid(),
  guest_id          uuid not null references guests(id) on delete cascade,
  from_number       text not null,
  message_body      text not null,
  classified_intent text not null check (classified_intent in ('attending','not_attending','maybe','unclear')),
  applied_to_rsvp   boolean not null default false,
  created_at        timestamptz not null default now()
);

create index if not exists whatsapp_replies_guest_id_idx on whatsapp_replies(guest_id);
create index if not exists whatsapp_replies_intent_idx   on whatsapp_replies(classified_intent);
```

- One row per inbound message (not one row per guest) — a guest can reply
  multiple times, and every message is preserved.
- `applied_to_rsvp` distinguishes "this changed the RSVP" from "this was
  just logged" (e.g. a follow-up "see you there!" after already being
  marked attending doesn't need to touch `rsvps` again, but is still logged).

## Classification

Case-insensitive substring matching against three phrase lists:

| Intent | Trigger phrases |
|---|---|
| `attending` | "yes", "we'll be there", "will attend", "count us in", "definitely coming", "sure", "confirmed" |
| `not_attending` | "can't make it", "cannot attend", "won't be able", "not able to attend", "sorry, can't", "unfortunately" |
| `maybe` | "maybe", "not sure", "will try", "let you know", "might" |

A message classifies as one of the three only if it matches phrases from
**exactly one** category. No match, or matches spanning more than one
category (e.g. "yes but not sure" hits both `attending` and `maybe`), both
resolve to `unclear` — logged, never applied.

Phrase lists live in a small standalone module
(`scripts/lib/whatsapp-intent.mjs`) so they're unit-testable in isolation
from the WhatsApp connection itself.

## RSVP write behavior

On a message classified as `attending` / `not_attending` / `maybe`:

1. Look up `rsvps` by `guest_id`.
2. **No existing row** → insert `{ guest_id, response: <classified>, guest_count: 1 }`.
3. **Existing row** → update only `response` and `updated_at`. `guest_count`,
   `meal_pref`, `attending_events` are left untouched — those came from the
   website form (or a previous more-detailed source) and a one-line text
   reply isn't precise enough to overwrite them.
4. Set `whatsapp_replies.applied_to_rsvp = true` on that message's log row.

Every unambiguous classification applies uniformly regardless of direction
— a reply that reads as "not_attending" after a guest was previously marked
"attending" still auto-applies (confirmed with JD: for catering/headcount
purposes, a cancellation should reflect immediately, not wait on manual
review).

## Guest matching

Reuses and extends `toWhatsAppId()`'s inverse from the reminder script:
normalize both the inbound WhatsApp sender ID and every `guests.mobile`
value to a canonical digits-only form (strip `+`, spaces, dashes,
parentheses; compare by trailing-10-digit suffix to tolerate missing/extra
country codes) before matching. Guest data is known to be messy (see the
2026-09-27 cleanup: malformed numbers like `7995781`, placeholder numbers
like `1234567890`) — matching must degrade to "no match, ignore" rather
than throw on a malformed stored number.

No match → the message is not logged or processed at all. This scopes
tracking strictly to guests JD has actually messaged, not arbitrary
incoming WhatsApp traffic.

## Process architecture

New script: `scripts/whatsapp-listener.mjs`, sharing `.ww-session/` with the
existing reminder script (same authenticated session, no new QR scan).

- **Startup catch-up**: before attaching the live `message` listener, fetch
  chats for every known guest phone number and process any messages newer
  than that guest's most recent `whatsapp_replies.created_at`. For a guest
  with no rows yet, fetch their **last 25 messages** in that chat (WhatsApp's
  own `fetchMessages({ limit: 25 })`) rather than full history — bounds the
  work without an arbitrary date cutoff that could miss an old first-ever
  reply. This is what makes it safe against the process being down for a
  while — messages aren't lost, just processed late.
- **Live mode**: `client.on('message', ...)` for everything after startup.
- **Resilience**: `client.on('disconnected', ...)` triggers a re-`initialize()`
  with backoff instead of crashing the process. Left running via `pm2` (or
  an equivalent process manager) so it survives terminal closes; JD's own
  machine needs to be on and connected for this to react in real time — a
  known, accepted constraint.

## Testing

- **Unit tests** (Vitest, matching existing project conventions) for:
  - Phone-number normalization/matching (`scripts/lib/whatsapp-intent.mjs`
    or a shared phone-utils module) — including the known-messy real
    numbers from the guest list as regression cases.
  - Keyword classification — a table of sample messages to expected
    intent, explicitly including ambiguous/multi-category cases that must
    resolve to `unclear`.
- **`--dry-run` flag** on the listener script (matching the reminder
  script's existing convention): logs what *would* be written to
  `whatsapp_replies` / `rsvps` without writing, for validating against real
  incoming messages before trusting it live.
- The live WhatsApp connection itself is verified manually (JD sends a test
  reply from his own phone and confirms it's processed correctly) — same as
  the existing reminder script, no automated test attempts to simulate an
  actual WhatsApp session.
