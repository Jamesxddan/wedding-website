# WhatsApp Reply Tracking + Auto-RSVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a persistent WhatsApp listener that logs every reply from guests JD has messaged and auto-updates their RSVP when the reply unambiguously reads as attending/not attending/maybe.

**Architecture:** A new script, `scripts/whatsapp-listener.mjs`, reuses the existing `.ww-session/` WhatsApp Web session (already authenticated) and `scripts/lib/supabase-util.mjs`'s REST helper. Incoming messages are matched to a guest by phone number, classified by keyword, logged unconditionally, and applied to `rsvps` only on an unambiguous match. The matching/classification/write logic is split into small, independently unit-tested pure modules; only the actual whatsapp-web.js wiring (connection, events, reconnect) is untested code, verified manually.

**Tech Stack:** Node.js (plain ESM scripts, run directly via `node`, not through Next's build), `whatsapp-web.js` + `qrcode-terminal` (already installed `--no-save`), Vitest (existing project test runner), Supabase REST (via existing `scripts/lib/supabase-util.mjs`), `lib/phone.ts` (existing, reused directly — Node 24's native TypeScript type-stripping lets a plain `.mjs` script `import` a `.ts` file with no build step; confirmed working).

**Spec:** `docs/superpowers/specs/2026-09-27-whatsapp-reply-tracking-design.md`

## Global Constraints

- Classification is keyword-based only — no LLM, no external API. A message matching more than one intent category (or none) always resolves to `unclear` and is never auto-applied.
- Auto-applying to `rsvps` only ever writes the `response` field. `guest_count`, `meal_pref`, `attending_events` are never touched by this system.
- Every message from a phone number matching a known guest is logged, regardless of classification outcome.
- A message from a phone number that doesn't match any `guests.mobile` is ignored entirely — not logged, not processed.
- All outbound WhatsApp messages (existing reminder script) must carry the disclaimer footer: `\n\n_🤖 This is an automated message from James & Sharon's wedding website — not a personal text from James._`

---

### Task 1: Add automation disclaimer to the reminder script

**Files:**
- Modify: `scripts/send-whatsapp-reminders.mjs:72-101` (the `buildMessage` function)

**Interfaces:**
- Produces: `buildMessage(guest, rsvp)` — unchanged signature, return value now always ends with the disclaimer footer.

- [ ] **Step 1: Add the disclaimer constant and append it to both message branches**

In `scripts/send-whatsapp-reminders.mjs`, add this constant just above `buildMessage` (around line 71):

```js
const DISCLAIMER =
  "\n\n_🤖 This is an automated message from James & Sharon's wedding website — not a personal text from James._";
```

Then change the two `return (...)` statements inside `buildMessage` (currently ending `...jameswedssharon.site\`` and `...celebrating with you! 🎉\`` respectively) so each template literal has `${DISCLAIMER}` appended right before its closing backtick. For example the "already RSVP'd" branch becomes:

```js
    return (
      `Hi ${name}! 🎊\n\n` +
      `Just a warm reminder — James & Sharon's wedding is on *${weddingDate}* in *${venue}*.\n\n` +
      `We have you confirmed for ${eventLabel}. Can't wait to celebrate with you! 🥂\n\n` +
      `If anything changes, just visit the website to update your RSVP: jameswedssharon.site` +
      DISCLAIMER
    );
```

and the "no RSVP yet" branch becomes:

```js
  return (
    `Hi ${name}! 💌\n\n` +
    `James & Sharon's wedding is almost here — *${weddingDate}* in *${venue}*!\n\n` +
    `We'd love to know if you can make it. Please fill in your RSVP on the website so we can plan seating and meals:\n` +
    `👉 jameswedssharon.site\n\n` +
    `Looking forward to celebrating with you! 🎉` +
    DISCLAIMER
  );
```

- [ ] **Step 2: Verify with the existing dry-run (no test suite covers this script — verify manually, matching this script's existing convention)**

Run: `node scripts/send-whatsapp-reminders.mjs --dry-run --only "James Daniel"`
Expected: the previewed message for "James Daniel" ends with the disclaimer line, e.g.:
```
If anything changes, just visit the website to update your RSVP: jameswedssharon.site

🤖 This is an automated message from James & Sharon's wedding website — not a personal text from James.
```

- [ ] **Step 3: Commit**

```bash
git add scripts/send-whatsapp-reminders.mjs
git commit -m "feat: add automation disclaimer to WhatsApp reminder messages"
```

---

### Task 2: Add the `whatsapp_replies` table

**Files:**
- Modify: `supabase/schema.sql` (append new table, near the existing `rsvps` table)

**Interfaces:**
- Produces: a `whatsapp_replies` table that Task 5/7's code will insert into.

- [ ] **Step 1: Append the table definition to `supabase/schema.sql`**

Add this block after the existing `rsvps` table definition (after its two `create index` lines, before the `-- Live ticker` comment):

```sql
-- WhatsApp replies (logged from guests JD has messaged; see
-- docs/superpowers/specs/2026-09-27-whatsapp-reply-tracking-design.md)
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

- [ ] **Step 2: Apply it in Supabase**

This repo has no migration tooling (per the existing `supabase/schema.sql` header comment) — schema changes are applied by hand. Open the Supabase SQL editor at the URL in `supabase/schema.sql`'s own header comment (`https://supabase.com/dashboard/project/sadikezxiwyntwutntnp/sql`), paste just the new `whatsapp_replies` block from Step 1, and run it.

- [ ] **Step 3: Verify the table exists**

Run this from the project root (reuses the same env-loading approach as the project's existing one-off DB scripts):

```bash
node -e "
const { loadEnv, supabaseREST } = require('./scripts/lib/supabase-util.mjs');
" 2>&1 || node --input-type=module -e "
import { loadEnv, supabaseREST } from './scripts/lib/supabase-util.mjs';
const { url, key } = loadEnv();
const db = supabaseREST({ url, key });
db.get('/whatsapp_replies?select=id&limit=1').then((rows) => {
  console.log('Table exists, row count in this page:', rows.length);
}).catch((e) => console.error('FAILED:', e.message));
"
```

Expected: `Table exists, row count in this page: 0` (empty table, no error).

- [ ] **Step 4: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add whatsapp_replies table to schema"
```

---

### Task 3: Phone matching module

**Files:**
- Create: `scripts/lib/phone-match.mjs`
- Test: `tests/phone-match.test.ts`

**Interfaces:**
- Consumes: `normalizeForStorage(input: string): string` from `lib/phone.ts` (existing, unchanged).
- Produces:
  - `waIdToE164(waId: string): string`
  - `findGuestByWhatsAppId(guests: Array<{ id: string; mobile: string | null }>, waId: string): { id: string; mobile: string | null } | null`

- [ ] **Step 1: Write the failing tests**

Create `tests/phone-match.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { waIdToE164, findGuestByWhatsAppId } from "../scripts/lib/phone-match.mjs";

describe("waIdToE164", () => {
  it("converts a WhatsApp chat id with country code to E.164", () => {
    expect(waIdToE164("917995781657@c.us")).toBe("+917995781657");
  });

  it("converts a bare-digit id (no @c.us suffix present) the same way", () => {
    expect(waIdToE164("917995781657")).toBe("+917995781657");
  });
});

describe("findGuestByWhatsAppId", () => {
  const guests = [
    { id: "g1", mobile: "7995781657" },        // bare 10-digit, no country code
    { id: "g2", mobile: "+919444390573" },     // full E.164 already
    { id: "g3", mobile: "7995781" },           // malformed (too short) — must never match, never throw
    { id: "g4", mobile: null },                // no mobile on file
  ];

  it("matches a bare-10-digit stored number against a WhatsApp id with country code", () => {
    const found = findGuestByWhatsAppId(guests, "917995781657@c.us");
    expect(found?.id).toBe("g1");
  });

  it("matches a full-E.164 stored number", () => {
    const found = findGuestByWhatsAppId(guests, "919444390573@c.us");
    expect(found?.id).toBe("g2");
  });

  it("returns null for a WhatsApp id with no matching guest", () => {
    const found = findGuestByWhatsAppId(guests, "911111111111@c.us");
    expect(found).toBeNull();
  });

  it("never throws on a malformed stored mobile, just doesn't match it", () => {
    expect(() => findGuestByWhatsAppId(guests, "917995781@c.us")).not.toThrow();
    expect(findGuestByWhatsAppId(guests, "917995781@c.us")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/phone-match.test.ts`
Expected: FAIL — `Cannot find module '../scripts/lib/phone-match.mjs'` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `scripts/lib/phone-match.mjs`:

```js
// Matches an incoming WhatsApp sender id to a known guest by phone number.
// Reuses lib/phone.ts's normalizeForStorage — Node's native TypeScript
// type-stripping (Node 22.6+/24 default) lets a plain .mjs script import a
// .ts file directly with no build step, confirmed working in this repo.
import { normalizeForStorage } from "../../lib/phone.ts";

// Convert a whatsapp-web.js message.from / message.author (e.g.
// "917995781657@c.us", or occasionally without the suffix) into the same
// E.164 form guests.mobile is normalized to for comparison.
export function waIdToE164(waId) {
  const digits = String(waId).split("@")[0];
  return normalizeForStorage(digits);
}

// Find the guest whose stored mobile normalizes to the same E.164 value as
// this WhatsApp sender id. Guest mobile data is known to be messy
// (malformed/placeholder numbers) — a guest with no mobile, or one that
// fails to normalize sensibly, simply never matches; this never throws.
export function findGuestByWhatsAppId(guests, waId) {
  const target = waIdToE164(waId);
  return guests.find((g) => g.mobile && normalizeForStorage(g.mobile) === target) ?? null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/phone-match.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/phone-match.mjs tests/phone-match.test.ts
git commit -m "feat: add WhatsApp-to-guest phone matching module"
```

---

### Task 4: Intent classification module

**Files:**
- Create: `scripts/lib/whatsapp-intent.mjs`
- Test: `tests/whatsapp-intent.test.ts`

**Interfaces:**
- Produces: `classifyIntent(text: string): "attending" | "not_attending" | "maybe" | "unclear"`

- [ ] **Step 1: Write the failing tests**

Create `tests/whatsapp-intent.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { classifyIntent } from "../scripts/lib/whatsapp-intent.mjs";

describe("classifyIntent", () => {
  it("classifies a clear yes as attending", () => {
    expect(classifyIntent("Yes we'll be there!")).toBe("attending");
  });

  it("classifies 'count us in' as attending", () => {
    expect(classifyIntent("count us in")).toBe("attending");
  });

  it("classifies a clear no as not_attending", () => {
    expect(classifyIntent("Sorry, can't make it that weekend")).toBe("not_attending");
  });

  it("classifies 'unfortunately' as not_attending", () => {
    expect(classifyIntent("Unfortunately we have a conflict")).toBe("not_attending");
  });

  it("classifies 'maybe' as maybe", () => {
    expect(classifyIntent("maybe, will confirm soon")).toBe("maybe");
  });

  it("classifies an unrelated message as unclear", () => {
    expect(classifyIntent("Congratulations to the both of you!")).toBe("unclear");
  });

  it("classifies an empty/missing message as unclear without throwing", () => {
    expect(classifyIntent("")).toBe("unclear");
    // @ts-expect-error deliberately testing null input from a loosely-typed caller
    expect(classifyIntent(null)).toBe("unclear");
  });

  it("classifies a message matching more than one category as unclear (documents the fail-safe collision rule)", () => {
    // "not sure" matches the `maybe` phrase list directly, but also contains
    // "sure" which matches the `attending` list — the ambiguity itself, not
    // either single keyword, is what must win here.
    expect(classifyIntent("not sure yet, will let you know")).toBe("unclear");
  });

  it("is case-insensitive", () => {
    expect(classifyIntent("YES WE'LL BE THERE")).toBe("attending");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/whatsapp-intent.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `scripts/lib/whatsapp-intent.mjs`:

```js
// Deliberately simple keyword matching, not an LLM — see
// docs/superpowers/specs/2026-09-27-whatsapp-reply-tracking-design.md for
// why. A message must match exactly one category to auto-classify; no
// match, or matches spanning more than one category, both resolve to
// "unclear" so an ambiguous reply is never guessed at.

const ATTENDING_PHRASES = [
  "yes", "we'll be there", "will attend", "count us in",
  "definitely coming", "sure", "confirmed",
];

const NOT_ATTENDING_PHRASES = [
  "can't make it", "cannot attend", "won't be able",
  "not able to attend", "sorry, can't", "unfortunately",
];

const MAYBE_PHRASES = ["maybe", "not sure", "will try", "let you know", "might"];

export function classifyIntent(text) {
  const lower = String(text ?? "").toLowerCase();

  const matched = {
    attending: ATTENDING_PHRASES.some((p) => lower.includes(p)),
    not_attending: NOT_ATTENDING_PHRASES.some((p) => lower.includes(p)),
    maybe: MAYBE_PHRASES.some((p) => lower.includes(p)),
  };

  const categories = Object.keys(matched).filter((k) => matched[k]);
  return categories.length === 1 ? categories[0] : "unclear";
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/whatsapp-intent.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/whatsapp-intent.mjs tests/whatsapp-intent.test.ts
git commit -m "feat: add WhatsApp reply keyword intent classifier"
```

---

### Task 5: RSVP-apply module

**Files:**
- Create: `scripts/lib/rsvp-apply.mjs`
- Test: `tests/rsvp-apply.test.ts`

**Interfaces:**
- Consumes: a `db` object shaped like `scripts/lib/supabase-util.mjs`'s `supabaseREST()` return value (`{ get(path), post(path, body), patch(path, body) }`), and a `classifyIntent` result string.
- Produces: `applyRsvpFromIntent(db, guestId: string, intent: string): Promise<{ applied: boolean }>`

- [ ] **Step 1: Write the failing tests**

Create `tests/rsvp-apply.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { applyRsvpFromIntent } from "../scripts/lib/rsvp-apply.mjs";

function fakeDb(overrides = {}) {
  return {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

describe("applyRsvpFromIntent", () => {
  it("does nothing and returns applied:false for 'unclear'", async () => {
    const db = fakeDb();
    const result = await applyRsvpFromIntent(db, "guest-1", "unclear");
    expect(result).toEqual({ applied: false });
    expect(db.get).not.toHaveBeenCalled();
    expect(db.post).not.toHaveBeenCalled();
    expect(db.patch).not.toHaveBeenCalled();
  });

  it("inserts a new rsvp row (guest_count: 1) when none exists yet", async () => {
    const db = fakeDb({ get: vi.fn().mockResolvedValue([]) });
    const result = await applyRsvpFromIntent(db, "guest-1", "attending");
    expect(result).toEqual({ applied: true });
    expect(db.post).toHaveBeenCalledWith("/rsvps", {
      guest_id: "guest-1",
      response: "attending",
      guest_count: 1,
    });
    expect(db.patch).not.toHaveBeenCalled();
  });

  it("patches only the response field when a rsvp row already exists", async () => {
    const db = fakeDb({ get: vi.fn().mockResolvedValue([{ id: "rsvp-1" }]) });
    const result = await applyRsvpFromIntent(db, "guest-1", "not_attending");
    expect(result).toEqual({ applied: true });
    expect(db.post).not.toHaveBeenCalled();
    const [path, body] = db.patch.mock.calls[0];
    expect(path).toBe("/rsvps?id=eq.rsvp-1");
    expect(body.response).toBe("not_attending");
    expect(body).not.toHaveProperty("guest_count");
    expect(body).not.toHaveProperty("meal_pref");
    expect(body).not.toHaveProperty("attending_events");
  });

  it("applies a 'maybe' downgrade over an existing rsvp the same way as any other classification", async () => {
    const db = fakeDb({ get: vi.fn().mockResolvedValue([{ id: "rsvp-1" }]) });
    const result = await applyRsvpFromIntent(db, "guest-1", "maybe");
    expect(result).toEqual({ applied: true });
    expect(db.patch).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/rsvp-apply.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `scripts/lib/rsvp-apply.mjs`:

```js
// Upserts a guest's RSVP response from a classified WhatsApp intent. Only
// ever writes the `response` field — an existing row's guest_count,
// meal_pref, and attending_events (set via the website form, which can
// capture more than a one-line text reply can) are never touched.
export async function applyRsvpFromIntent(db, guestId, intent) {
  if (intent !== "attending" && intent !== "not_attending" && intent !== "maybe") {
    return { applied: false };
  }

  const existing = await db.get(`/rsvps?guest_id=eq.${guestId}&select=id`);

  if (existing.length > 0) {
    await db.patch(`/rsvps?id=eq.${existing[0].id}`, {
      response: intent,
      updated_at: new Date().toISOString(),
    });
  } else {
    await db.post("/rsvps", {
      guest_id: guestId,
      response: intent,
      guest_count: 1,
    });
  }

  return { applied: true };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/rsvp-apply.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/rsvp-apply.mjs tests/rsvp-apply.test.ts
git commit -m "feat: add RSVP auto-apply module for classified WhatsApp replies"
```

---

### Task 6: Reply-logging module

**Files:**
- Create: `scripts/lib/reply-log.mjs`
- Test: `tests/reply-log.test.ts`

**Interfaces:**
- Consumes: same `db` shape as Task 5.
- Produces: `logWhatsAppReply(db, { guestId, fromNumber, messageBody, intent, applied }): Promise<void>`

- [ ] **Step 1: Write the failing test**

Create `tests/reply-log.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { logWhatsAppReply } from "../scripts/lib/reply-log.mjs";

describe("logWhatsAppReply", () => {
  it("inserts a row with all fields mapped correctly", async () => {
    const post = vi.fn().mockResolvedValue({});
    const db = { post };

    await logWhatsAppReply(db, {
      guestId: "guest-1",
      fromNumber: "+917995781657",
      messageBody: "Yes we'll be there!",
      intent: "attending",
      applied: true,
    });

    expect(post).toHaveBeenCalledWith("/whatsapp_replies", {
      guest_id: "guest-1",
      from_number: "+917995781657",
      message_body: "Yes we'll be there!",
      classified_intent: "attending",
      applied_to_rsvp: true,
    });
  });

  it("logs an unclear/unapplied message the same way, just with applied_to_rsvp: false", async () => {
    const post = vi.fn().mockResolvedValue({});
    const db = { post };

    await logWhatsAppReply(db, {
      guestId: "guest-2",
      fromNumber: "+919444390573",
      messageBody: "Congrats!",
      intent: "unclear",
      applied: false,
    });

    expect(post).toHaveBeenCalledWith("/whatsapp_replies", expect.objectContaining({
      classified_intent: "unclear",
      applied_to_rsvp: false,
    }));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/reply-log.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `scripts/lib/reply-log.mjs`:

```js
// Logs every matched incoming WhatsApp message to whatsapp_replies —
// unconditionally, regardless of classification outcome. This is the full
// audit trail; applied_to_rsvp distinguishes "this changed the RSVP" from
// "this was just logged".
export async function logWhatsAppReply(db, { guestId, fromNumber, messageBody, intent, applied }) {
  await db.post("/whatsapp_replies", {
    guest_id: guestId,
    from_number: fromNumber,
    message_body: messageBody,
    classified_intent: intent,
    applied_to_rsvp: applied,
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/reply-log.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/reply-log.mjs tests/reply-log.test.ts
git commit -m "feat: add WhatsApp reply logging module"
```

---

### Task 7: Message-handling orchestration module

**Files:**
- Create: `scripts/lib/handle-incoming-message.mjs`
- Test: `tests/handle-incoming-message.test.ts`

**Interfaces:**
- Consumes:
  - `findGuestByWhatsAppId(guests, waId)` from Task 3
  - `classifyIntent(text)` from Task 4
  - `applyRsvpFromIntent(db, guestId, intent)` from Task 5
  - `logWhatsAppReply(db, {...})` from Task 6
- Produces: `handleIncomingMessage(db, guests, fromWaId: string, messageBody: string): Promise<{ matched: boolean; intent?: string; applied?: boolean }>` — this is the single entry point Task 8's live listener and catch-up pass both call; it's fully unit-testable without any real WhatsApp connection.

- [ ] **Step 1: Write the failing tests**

Create `tests/handle-incoming-message.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { handleIncomingMessage } from "../scripts/lib/handle-incoming-message.mjs";

const GUESTS = [
  { id: "guest-1", mobile: "7995781657" },
  { id: "guest-2", mobile: "+919444390573" },
];

function fakeDb() {
  return {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
  };
}

describe("handleIncomingMessage", () => {
  it("ignores a message from a number matching no known guest", async () => {
    const db = fakeDb();
    const result = await handleIncomingMessage(db, GUESTS, "911111111111@c.us", "Yes!");
    expect(result).toEqual({ matched: false });
    expect(db.post).not.toHaveBeenCalled();
  });

  it("logs and applies an unambiguous 'attending' reply from a known guest", async () => {
    const db = fakeDb();
    const result = await handleIncomingMessage(db, GUESTS, "917995781657@c.us", "Yes we'll be there!");
    expect(result).toEqual({ matched: true, intent: "attending", applied: true });

    // logged
    expect(db.post).toHaveBeenCalledWith("/whatsapp_replies", expect.objectContaining({
      guest_id: "guest-1",
      classified_intent: "attending",
      applied_to_rsvp: true,
    }));
    // applied (new rsvp row inserted, since db.get returns [] by default)
    expect(db.post).toHaveBeenCalledWith("/rsvps", expect.objectContaining({
      guest_id: "guest-1",
      response: "attending",
    }));
  });

  it("logs but does not apply an unclear reply from a known guest", async () => {
    const db = fakeDb();
    const result = await handleIncomingMessage(db, GUESTS, "919444390573@c.us", "Congratulations!");
    expect(result).toEqual({ matched: true, intent: "unclear", applied: false });

    expect(db.post).toHaveBeenCalledWith("/whatsapp_replies", expect.objectContaining({
      guest_id: "guest-2",
      classified_intent: "unclear",
      applied_to_rsvp: false,
    }));
    expect(db.post).not.toHaveBeenCalledWith("/rsvps", expect.anything());
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/handle-incoming-message.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `scripts/lib/handle-incoming-message.mjs`:

```js
import { findGuestByWhatsAppId } from "./phone-match.mjs";
import { classifyIntent } from "./whatsapp-intent.mjs";
import { applyRsvpFromIntent } from "./rsvp-apply.mjs";
import { logWhatsAppReply } from "./reply-log.mjs";

// Single entry point for processing one inbound WhatsApp message, used by
// both the live listener and the startup catch-up pass (Task 8). Fully
// testable without a real WhatsApp connection — db and guests are plain
// data/objects, no whatsapp-web.js types involved.
export async function handleIncomingMessage(db, guests, fromWaId, messageBody) {
  const guest = findGuestByWhatsAppId(guests, fromWaId);
  if (!guest) return { matched: false };

  const intent = classifyIntent(messageBody);
  const { applied } = await applyRsvpFromIntent(db, guest.id, intent);

  await logWhatsAppReply(db, {
    guestId: guest.id,
    fromNumber: fromWaId,
    messageBody,
    intent,
    applied,
  });

  return { matched: true, intent, applied };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/handle-incoming-message.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/handle-incoming-message.mjs tests/handle-incoming-message.test.ts
git commit -m "feat: add WhatsApp incoming-message orchestration module"
```

---

### Task 8: The listener entrypoint

**Files:**
- Create: `scripts/whatsapp-listener.mjs`

**Interfaces:**
- Consumes: `handleIncomingMessage(db, guests, fromWaId, messageBody)` from Task 7, `loadEnv`/`supabaseREST` from `scripts/lib/supabase-util.mjs` (existing).
- Produces: nothing consumed by other tasks — this is the runnable entrypoint.

No automated test for this file — same convention as `scripts/send-whatsapp-reminders.mjs` (the actual WhatsApp connection is inherently manual/live). Verified manually in Step 3 below.

- [ ] **Step 1: Write the implementation**

Create `scripts/whatsapp-listener.mjs`:

```js
#!/usr/bin/env node
/**
 * WhatsApp Reply Listener — James & Sharon's Wedding
 *
 * Persistent process: listens for incoming WhatsApp messages from guests
 * JD has messaged, logs every one, and auto-applies unambiguous
 * attending/not_attending/maybe replies to their RSVP.
 *
 * REQUIREMENTS
 *   Same as scripts/send-whatsapp-reminders.mjs — whatsapp-web.js and
 *   qrcode-terminal already installed, reuses the same .ww-session/.
 *
 * USAGE
 *   node scripts/whatsapp-listener.mjs
 *   (leave it running — see the pm2 note in Step 4 below for keeping it
 *   alive across terminal closes)
 *
 *   # Dry run — logs what WOULD be written to whatsapp_replies/rsvps,
 *   # writes nothing. Reads (guest lookups, existing-rsvp checks) are
 *   # still real, so the preview accurately shows insert-vs-update.
 *   node scripts/whatsapp-listener.mjs --dry-run
 *
 * RUN FROM THE PROJECT ROOT (needed to resolve .env.local and .ww-session):
 *   cd /path/to/wedding-website
 *   node scripts/whatsapp-listener.mjs
 */

import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

import { loadEnv, supabaseREST } from "./lib/supabase-util.mjs";
import { handleIncomingMessage } from "./lib/handle-incoming-message.mjs";

const DRY_RUN = process.argv.includes("--dry-run");

const { url: SUPABASE_URL, key: SUPABASE_KEY } = loadEnv();
const realDb = supabaseREST({ url: SUPABASE_URL, key: SUPABASE_KEY });

// In dry-run mode, reads stay real (so the preview correctly shows
// insert-vs-update for an existing rsvp) but writes just print instead of
// touching the database — same shape the reminder script's --dry-run uses
// conceptually, adapted for a long-running listener instead of a one-shot loop.
const db = DRY_RUN
  ? {
      get: realDb.get,
      post: async (restPath, body) => {
        console.log(`[DRY RUN] would POST ${restPath}`, body);
        return {};
      },
      patch: async (restPath, body) => {
        console.log(`[DRY RUN] would PATCH ${restPath}`, body);
        return {};
      },
    }
  : realDb;

if (DRY_RUN) console.log("Running in --dry-run mode: nothing will be written.\n");

const CATCH_UP_MESSAGE_LIMIT = 25;
const RECONNECT_DELAY_MS = 10_000;

let Client, LocalAuth;
try {
  ({ Client, LocalAuth } = require("whatsapp-web.js"));
} catch {
  console.error(
    "\n❌  whatsapp-web.js is not installed.\n" +
      "    Run: npm install --no-save whatsapp-web.js qrcode-terminal\n" +
      "    (and npm approve-scripts, if prompted) then try again.\n"
  );
  process.exit(1);
}

const sessionPath = path.join(__dirname, "..", ".ww-session");

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: sessionPath }),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  },
});

async function fetchGuestsWithMobile() {
  return db.get("/guests?select=id,mobile&mobile=not.is.null");
}

async function latestReplyTimestamp(guestId) {
  const rows = await db.get(
    `/whatsapp_replies?guest_id=eq.${guestId}&select=created_at&order=created_at.desc&limit=1`
  );
  return rows.length > 0 ? new Date(rows[0].created_at).getTime() : 0;
}

// Best-effort inverse of phone-match's waIdToE164 — good enough to build a
// chat id to look up a known guest's chat, not used for the actual
// guest-matching decision (handleIncomingMessage re-derives that itself
// from the real message.from it receives).
function guestMobileToWaId(mobile) {
  const digits = String(mobile).replace(/\D/g, "");
  return `${digits}@c.us`;
}

async function catchUp() {
  console.log("Running startup catch-up pass...");
  const guests = await fetchGuestsWithMobile();

  for (const guest of guests) {
    const waId = guestMobileToWaId(guest.mobile);
    let chat;
    try {
      chat = await client.getChatById(waId);
    } catch {
      continue; // no chat with this guest yet — nothing to catch up on
    }
    if (!chat) continue;

    const sinceMs = await latestReplyTimestamp(guest.id);
    const messages = await chat.fetchMessages({ limit: CATCH_UP_MESSAGE_LIMIT });

    for (const msg of messages) {
      if (msg.fromMe) continue;
      if (msg.timestamp * 1000 <= sinceMs) continue;
      await handleIncomingMessage(db, guests, msg.from, msg.body);
    }
  }
  console.log("Catch-up pass complete.");
}

client.on("qr", (qr) => {
  console.log("\nThis should already be authenticated via .ww-session/.");
  console.log("If you're seeing a QR code, delete .ww-session/ was likely removed — scan with WhatsApp → Linked Devices.\n");
});

client.on("ready", async () => {
  console.log("✓ WhatsApp listener ready.");
  await catchUp();

  client.on("message", async (msg) => {
    if (msg.fromMe) return;
    const guests = await fetchGuestsWithMobile();
    const result = await handleIncomingMessage(db, guests, msg.from, msg.body);
    if (result.matched) {
      console.log(`[${new Date().toISOString()}] ${msg.from} -> ${result.intent} (applied: ${result.applied})`);
    }
  });

  console.log("Listening for replies...");
});

client.on("disconnected", (reason) => {
  console.error(`Disconnected (${reason}), reconnecting in ${RECONNECT_DELAY_MS / 1000}s...`);
  setTimeout(() => {
    client.initialize().catch((err) => {
      console.error("Reconnect failed:", err.message);
    });
  }, RECONNECT_DELAY_MS);
});

client.on("auth_failure", (msg) => {
  console.error("❌ Authentication failed:", msg);
  process.exit(1);
});

client.initialize();
```

- [ ] **Step 2: Sanity-check the module loads without errors**

Run: `node --check scripts/whatsapp-listener.mjs`
Expected: no output (syntax is valid). This only checks parseability, not behavior — actual behavior is verified in Steps 3-4.

- [ ] **Step 3: Dry-run verification**

Before trusting this against real data, confirm the plumbing works without writing anything:

1. Run: `node scripts/whatsapp-listener.mjs --dry-run`
2. Expected: `Running in --dry-run mode: nothing will be written.` printed first, then the same `✓ WhatsApp listener ready.` → catch-up → `Listening for replies...` sequence as a normal run.
3. From the test number `7010643851`, send a WhatsApp message reading `"Yes we'll be there!"`.
4. Expected console output includes `[DRY RUN] would POST /rsvps ...` (or `would PATCH ...` if that guest already has an rsvp row) and `[DRY RUN] would POST /whatsapp_replies ...` showing `classified_intent: "attending"` — confirming matching + classification work correctly before anything real is written.
5. Stop the process (Ctrl+C). Verify in Supabase that no new row actually appeared in `whatsapp_replies` for that message (dry-run wrote nothing, as expected).

- [ ] **Step 4: Manual live verification**

1. Run: `node scripts/whatsapp-listener.mjs`
2. Expected console output: `✓ WhatsApp listener ready.` then `Running startup catch-up pass...` then `Catch-up pass complete.` then `Listening for replies...` (no QR prompt — `.ww-session/` is already authenticated from the reminder script's earlier live run).
3. From the test number `7010643851`, send a WhatsApp message to JD's number reading something unambiguous, e.g. `"Yes we'll be there!"`.
4. Expected: a console line like `[...] 917010643851@c.us -> attending (applied: true)`.
5. Verify in Supabase: query `whatsapp_replies` for that number and confirm a row exists with `classified_intent = 'attending'`, `applied_to_rsvp = true`; query `rsvps` for that guest's `guest_id` and confirm `response = 'attending'`.
6. Send a second, ambiguous message, e.g. `"haha ok"`. Expected: logged with `classified_intent = 'unclear'`, `applied_to_rsvp = false`, and the `rsvps` row from step 5 unchanged.
7. Stop the process (Ctrl+C), send a third message from the test number, then restart `node scripts/whatsapp-listener.mjs`. Expected: the catch-up pass picks up and processes that third message (proving the "process was down" resilience case from the spec) before "Listening for replies..." prints.

- [ ] **Step 5: Set up pm2 for always-on operation (optional but recommended, per the spec's "always-on" requirement)**

```bash
npm install --no-save pm2
npx pm2 start scripts/whatsapp-listener.mjs --name whatsapp-listener
npx pm2 logs whatsapp-listener
```

`npx pm2 status` shows it running; `npx pm2 stop whatsapp-listener` to stop it. This survives closing the terminal (pm2 runs as a background daemon); it does not survive the machine itself shutting down unless separately configured with `pm2 startup` — leaving that as a manual choice rather than part of this plan, since it changes OS-level startup behavior.

- [ ] **Step 6: Commit**

```bash
git add scripts/whatsapp-listener.mjs
git commit -m "feat: add persistent WhatsApp reply listener"
```

---

## Summary

After all 8 tasks: every WhatsApp reply from a guest JD has messaged is logged in `whatsapp_replies`, and unambiguous attending/not_attending/maybe replies auto-update `rsvps`. All outbound reminder messages now carry the automation disclaimer. This unblocks the next plan (WhatsApp OTP relink channel, per `docs/superpowers/specs/2026-09-27-whatsapp-otp-relink-design.md`), which extends `scripts/whatsapp-listener.mjs` with an outbox-polling loop and the `settings` heartbeat — write that as a separate plan once this one is merged, since its tasks modify files this plan creates.
