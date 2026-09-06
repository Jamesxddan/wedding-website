# Relink Email-OTP Escape Hatch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every relink dead end (auto-guessed fingerprint match, "name not found", "phone/email mismatch") a working escape hatch: verify an email via a 6-digit OTP, then either relink to the guest that email belongs to, or register as a new guest with that email pre-filled.

**Architecture:** Two new API routes (`/api/relink/email-otp/request`, `/api/relink/email-otp/verify`) backed by a new `email_otps` Supabase table; a new dedicated page (`/relink/verify-email`) driving the two-step (email → code) UI; small additions to the existing `RelinkForm`/`Home` in `app/page.tsx` to link into it and to consume a successful "register as new" result; and `FirstVisitForm`/`OpeningScreen` get an optional pre-filled/read-only email prop.

**Tech Stack:** Next.js API routes, Supabase (`@supabase/supabase-js`), Resend (existing `RESEND_API_KEY` integration), Vitest, Playwright.

Full design context: `docs/superpowers/specs/2026-09-07-relink-email-otp-design.md`.

---

## Task 1: Schema — `email_otps` table

**Files:**
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Append the new table to the schema file**

Add this to the end of `supabase/schema.sql` (after the `chat_logs` block):

```sql

-- Email OTPs for the relink "this isn't me" escape hatch. One row per email
-- address at a time (a fresh request upserts the existing row). window_started_at
-- tracks the top-of-hour for the send-rate-limit window, separate from
-- created_at (which is the row's original creation time).
create table if not exists email_otps (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null unique,
  code_hash          text not null,
  device_uuid        text not null,
  attempts           int not null default 0,
  send_count         int not null default 1,
  window_started_at  timestamptz not null default now(),
  last_sent_at       timestamptz not null default now(),
  expires_at         timestamptz not null,
  verified_at        timestamptz,
  created_at         timestamptz not null default now()
);

create index if not exists email_otps_email_idx on email_otps(email);
```

- [ ] **Step 2: Run it in Supabase**

Open https://supabase.com/dashboard/project/sadikezxiwyntwutntnp/sql, paste the full updated `supabase/schema.sql` (or just the new block — it's idempotent via `create table if not exists`), and run it. Confirm the `email_otps` table appears in the Table Editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add email_otps table for relink email-OTP verification"
```

---

## Task 2: Add the disposable-email-domains dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install**

```bash
npm install disposable-email-domains
```

- [ ] **Step 2: Verify it's importable**

```bash
node -e "console.log(require('disposable-email-domains').length)"
```
Expected: prints a number (the size of the blocklist), no error.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add disposable-email-domains dependency"
```

---

## Task 3: `lib/email-otp.ts` — pure helpers

**Files:**
- Create: `lib/email-otp.ts`
- Test: `tests/email-otp.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/email-otp.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  normalizeEmail,
  isDisposableEmail,
  generateOtpCode,
  hashOtpCode,
  OTP_EXPIRY_MS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_MAX_SENDS_PER_HOUR,
} from "@/lib/email-otp";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Whitson@Example.COM  ")).toBe("whitson@example.com");
  });
});

describe("isDisposableEmail", () => {
  it("flags a known disposable domain", () => {
    expect(isDisposableEmail("someone@mailinator.com")).toBe(true);
  });

  it("does not flag a normal domain", () => {
    expect(isDisposableEmail("whitson@gmail.com")).toBe(false);
  });

  it("is case-insensitive on the domain", () => {
    expect(isDisposableEmail("someone@MAILINATOR.com")).toBe(true);
  });
});

describe("generateOtpCode", () => {
  it("generates a 6-digit numeric string", () => {
    const code = generateOtpCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("generates different codes across many calls (not constant)", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateOtpCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("hashOtpCode", () => {
  it("is deterministic for the same email+code", () => {
    expect(hashOtpCode("whitson@example.com", "123456")).toBe(
      hashOtpCode("whitson@example.com", "123456")
    );
  });

  it("differs for different codes", () => {
    expect(hashOtpCode("whitson@example.com", "123456")).not.toBe(
      hashOtpCode("whitson@example.com", "654321")
    );
  });

  it("differs for different emails with the same code", () => {
    expect(hashOtpCode("whitson@example.com", "123456")).not.toBe(
      hashOtpCode("james@example.com", "123456")
    );
  });

  it("is not reversible/plaintext (hash does not contain the code)", () => {
    expect(hashOtpCode("whitson@example.com", "123456")).not.toContain("123456");
  });
});

describe("constants", () => {
  it("expose sane defaults", () => {
    expect(OTP_EXPIRY_MS).toBe(10 * 60 * 1000);
    expect(OTP_MAX_ATTEMPTS).toBe(5);
    expect(OTP_RESEND_COOLDOWN_MS).toBe(60 * 1000);
    expect(OTP_MAX_SENDS_PER_HOUR).toBe(3);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/email-otp.test.ts`
Expected: FAIL — `Cannot find module '@/lib/email-otp'` (or similar).

- [ ] **Step 3: Write `lib/email-otp.ts`**

```ts
import "server-only";
import crypto from "crypto";
import disposableDomains from "disposable-email-domains";

const DISPOSABLE_DOMAIN_SET = new Set(
  (disposableDomains as string[]).map((d) => d.toLowerCase())
);

export const OTP_EXPIRY_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_SENDS_PER_HOUR = 3;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isDisposableEmail(email: string): boolean {
  const domain = normalizeEmail(email).split("@")[1] ?? "";
  return DISPOSABLE_DOMAIN_SET.has(domain);
}

export function generateOtpCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtpCode(email: string, code: string): string {
  const pepper = process.env.OTP_HASH_PEPPER || "dev-otp-pepper-change-in-production";
  return crypto
    .createHash("sha256")
    .update(`${normalizeEmail(email)}:${code}:${pepper}`)
    .digest("hex");
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/email-otp.test.ts`
Expected: PASS (all tests green).

- [ ] **Step 5: Commit**

```bash
git add lib/email-otp.ts tests/email-otp.test.ts
git commit -m "feat: add email-otp helper module (hashing, code gen, disposable-domain check)"
```

---

## Task 4: `lib/email-otp-send.ts` — send the code via Resend

**Files:**
- Create: `lib/email-otp-send.ts`

No unit test for this one — it's a thin wrapper around a `fetch` call to Resend, matching the existing untested pattern in `lib/rsvp-email.ts` (which also has no test file).

- [ ] **Step 1: Write `lib/email-otp-send.ts`**

```ts
import "server-only";

const FROM = "James & Sharon <rsvp@jameswedssharon.site>";

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:24px 0;background:#f5ede0;font-family:Georgia,'Times New Roman',serif">
  <div style="max-width:480px;margin:0 auto;background:#fffdf9;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(90,31,46,0.10)">
    <div style="background:#5a1f2e;padding:32px;text-align:center">
      <p style="color:#D4AF37;font-size:11px;letter-spacing:4px;text-transform:uppercase;margin:0;font-family:-apple-system,sans-serif">James &amp; Sharon</p>
    </div>
    <div style="padding:32px">
      <p style="font-size:15px;line-height:1.75;color:#3a1a10;margin:0 0 20px">Use this code to verify your email and continue to the wedding site:</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#8B4A6B;text-align:center;margin:0 0 20px">${code}</p>
      <p style="font-size:13px;color:#a07840;margin:0">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
    </div>
  </div>
</body>
</html>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: `Your verification code: ${code}`,
        html,
      }),
    });
  } catch {
    /* best-effort — the caller still returns debug_code outside production */
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/email-otp-send.ts
git commit -m "feat: add OTP email sender via Resend"
```

---

## Task 5: `POST /api/relink/email-otp/request`

**Files:**
- Create: `app/api/relink/email-otp/request/route.ts`
- Test: `tests/email-otp-request.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/email-otp-request.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}));
vi.mock("@/lib/email-otp-send", () => ({
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
}));

import { supabase } from "@/lib/supabase";
import { sendOtpEmail } from "@/lib/email-otp-send";

function req(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/relink/email-otp/request", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function makeChain(data: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
}

describe("POST /api/relink/email-otp/request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.VERCEL_ENV = "";
  });

  it("returns 400 for missing fields", async () => {
    const { POST } = await import("@/app/api/relink/email-otp/request/route");
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("missing required fields");
  });

  it("returns 400 for a malformed email", async () => {
    const { POST } = await import("@/app/api/relink/email-otp/request/route");
    const res = await POST(req({ email: "not-an-email", device_uuid: "d1" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_email");
  });

  it("returns 400 for a disposable email domain", async () => {
    const { POST } = await import("@/app/api/relink/email-otp/request/route");
    const res = await POST(req({ email: "someone@mailinator.com", device_uuid: "d1" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("disposable_email");
  });

  it("sends a code and returns ok + debug_code outside production", async () => {
    vi.mocked(supabase.from).mockReturnValue(makeChain(null) as ReturnType<typeof supabase.from>);
    const { POST } = await import("@/app/api/relink/email-otp/request/route");
    const res = await POST(req({ email: "whitson@example.com", device_uuid: "d1" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.debug_code).toMatch(/^\d{6}$/);
    expect(sendOtpEmail).toHaveBeenCalledWith("whitson@example.com", json.debug_code);
  });

  it("omits debug_code in production", async () => {
    process.env.VERCEL_ENV = "production";
    vi.mocked(supabase.from).mockReturnValue(makeChain(null) as ReturnType<typeof supabase.from>);
    const { POST } = await import("@/app/api/relink/email-otp/request/route");
    const res = await POST(req({ email: "whitson@example.com", device_uuid: "d1" }));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.debug_code).toBeUndefined();
  });

  it("returns 429 when resent within the cooldown window", async () => {
    const now = Date.now();
    vi.mocked(supabase.from).mockReturnValue(
      makeChain({
        send_count: 1,
        last_sent_at: new Date(now - 5_000).toISOString(),
        window_started_at: new Date(now - 5_000).toISOString(),
      }) as ReturnType<typeof supabase.from>
    );
    const { POST } = await import("@/app/api/relink/email-otp/request/route");
    const res = await POST(req({ email: "whitson@example.com", device_uuid: "d1" }));
    const json = await res.json();
    expect(res.status).toBe(429);
    expect(json.error).toBe("rate_limited");
    expect(json.retry_after_seconds).toBeGreaterThan(0);
  });

  it("returns 429 when the hourly send cap is reached", async () => {
    const now = Date.now();
    vi.mocked(supabase.from).mockReturnValue(
      makeChain({
        send_count: 3,
        last_sent_at: new Date(now - 61_000).toISOString(),
        window_started_at: new Date(now - 60_000).toISOString(),
      }) as ReturnType<typeof supabase.from>
    );
    const { POST } = await import("@/app/api/relink/email-otp/request/route");
    const res = await POST(req({ email: "whitson@example.com", device_uuid: "d1" }));
    const json = await res.json();
    expect(res.status).toBe(429);
    expect(json.error).toBe("rate_limited");
  });

  it("allows a send once the hourly window has rolled over", async () => {
    const now = Date.now();
    vi.mocked(supabase.from).mockReturnValue(
      makeChain({
        send_count: 3,
        last_sent_at: new Date(now - 61 * 60 * 1000).toISOString(),
        window_started_at: new Date(now - 61 * 60 * 1000).toISOString(),
      }) as ReturnType<typeof supabase.from>
    );
    const { POST } = await import("@/app/api/relink/email-otp/request/route");
    const res = await POST(req({ email: "whitson@example.com", device_uuid: "d1" }));
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/email-otp-request.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/relink/email-otp/request/route'`.

- [ ] **Step 3: Write `app/api/relink/email-otp/request/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  normalizeEmail,
  isDisposableEmail,
  generateOtpCode,
  hashOtpCode,
  OTP_EXPIRY_MS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_MAX_SENDS_PER_HOUR,
} from "@/lib/email-otp";
import { sendOtpEmail } from "@/lib/email-otp-send";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOUR_MS = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { email, device_uuid } = body as { email?: string; device_uuid?: string };

  if (!email || !device_uuid) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const normalizedEmail = normalizeEmail(email);
  if (!EMAIL_RE.test(normalizedEmail)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (isDisposableEmail(normalizedEmail)) {
    return NextResponse.json({ error: "disposable_email" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("email_otps")
    .select("send_count, last_sent_at, window_started_at")
    .eq("email", normalizedEmail)
    .maybeSingle();

  const now = Date.now();
  let sendCount = 1;
  let windowStartedAt = new Date(now).toISOString();

  if (existing) {
    const lastSentMs = new Date(existing.last_sent_at).getTime();
    if (now - lastSentMs < OTP_RESEND_COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - lastSentMs)) / 1000);
      return NextResponse.json({ error: "rate_limited", retry_after_seconds: retryAfterSeconds }, { status: 429 });
    }

    const windowStartMs = new Date(existing.window_started_at).getTime();
    const windowStillOpen = now - windowStartMs < HOUR_MS;

    if (windowStillOpen) {
      if (existing.send_count >= OTP_MAX_SENDS_PER_HOUR) {
        const retryAfterSeconds = Math.ceil((HOUR_MS - (now - windowStartMs)) / 1000);
        return NextResponse.json({ error: "rate_limited", retry_after_seconds: retryAfterSeconds }, { status: 429 });
      }
      sendCount = existing.send_count + 1;
      windowStartedAt = existing.window_started_at;
    }
    // else: window rolled over — sendCount/windowStartedAt keep their fresh-window defaults
  }

  const code = generateOtpCode();
  const code_hash = hashOtpCode(normalizedEmail, code);
  const expires_at = new Date(now + OTP_EXPIRY_MS).toISOString();

  const { error } = await supabase.from("email_otps").upsert(
    {
      email: normalizedEmail,
      code_hash,
      device_uuid,
      attempts: 0,
      send_count: sendCount,
      window_started_at: windowStartedAt,
      last_sent_at: new Date(now).toISOString(),
      expires_at,
      verified_at: null,
    },
    { onConflict: "email" }
  );

  if (error) {
    return NextResponse.json({ error: "failed to generate code" }, { status: 500 });
  }

  await sendOtpEmail(normalizedEmail, code);

  const isNonProduction = process.env.VERCEL_ENV !== "production";
  return NextResponse.json({ ok: true, ...(isNonProduction ? { debug_code: code } : {}) });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/email-otp-request.test.ts`
Expected: PASS (all tests green).

- [ ] **Step 5: Commit**

```bash
git add app/api/relink/email-otp/request/route.ts tests/email-otp-request.test.ts
git commit -m "feat: add /api/relink/email-otp/request endpoint"
```

---

## Task 6: `POST /api/relink/email-otp/verify`

**Files:**
- Create: `app/api/relink/email-otp/verify/route.ts`
- Test: `tests/email-otp-verify.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/email-otp-verify.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "@/lib/supabase";
import { hashOtpCode } from "@/lib/email-otp";

function req(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/relink/email-otp/verify", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

// The route calls supabase.from(...) multiple times, sometimes hitting the
// same table more than once (e.g. "email_otps" for both the lookup and the
// verified_at update; "guests" for both the lookup and the invitation_seen
// update). Dispatch by table name — each chain object below supports every
// method the route calls on that table, regardless of call order/count —
// rather than trying to match exact call sequence.
function tableMock(tables: Record<string, Record<string, unknown>>) {
  return vi.fn((table: string) => {
    const chain = tables[table];
    if (!chain) throw new Error(`unexpected table in test: ${table}`);
    return chain;
  });
}

function otpChain(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
    update: vi.fn().mockReturnThis(),
  };
}

function guestChain(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
    update: vi.fn().mockReturnThis(),
  };
}

function fingerprintChain(existingFp: unknown, insertedFp: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: existingFp, error: null }),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: insertedFp, error: null }),
  };
}

describe("POST /api/relink/email-otp/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns 400 for missing fields", async () => {
    const { POST } = await import("@/app/api/relink/email-otp/verify/route");
    const res = await POST(req({ email: "a@b.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 410 when no OTP row exists", async () => {
    vi.mocked(supabase.from).mockReturnValue(otpChain(null) as ReturnType<typeof supabase.from>);
    const { POST } = await import("@/app/api/relink/email-otp/verify/route");
    const res = await POST(req({ email: "whitson@example.com", code: "123456", device_uuid: "d1" }));
    expect(res.status).toBe(410);
    expect((await res.json()).error).toBe("expired_or_missing");
  });

  it("returns 410 when the OTP row is expired", async () => {
    const row = {
      code_hash: hashOtpCode("whitson@example.com", "123456"),
      attempts: 0,
      expires_at: new Date(Date.now() - 1000).toISOString(),
    };
    vi.mocked(supabase.from).mockReturnValue(otpChain(row) as ReturnType<typeof supabase.from>);
    const { POST } = await import("@/app/api/relink/email-otp/verify/route");
    const res = await POST(req({ email: "whitson@example.com", code: "123456", device_uuid: "d1" }));
    expect(res.status).toBe(410);
    expect((await res.json()).error).toBe("expired_or_missing");
  });

  it("returns 403 invalid_code on a wrong code and increments attempts", async () => {
    const row = {
      code_hash: hashOtpCode("whitson@example.com", "123456"),
      attempts: 0,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    };
    const chain = otpChain(row);
    vi.mocked(supabase.from).mockReturnValue(chain as ReturnType<typeof supabase.from>);
    const { POST } = await import("@/app/api/relink/email-otp/verify/route");
    const res = await POST(req({ email: "whitson@example.com", code: "000000", device_uuid: "d1" }));
    const json = await res.json();
    expect(res.status).toBe(403);
    expect(json.error).toBe("invalid_code");
    expect(json.attempts_remaining).toBe(4);
    expect(chain.update).toHaveBeenCalled();
  });

  it("returns 403 max_attempts on the 5th wrong attempt", async () => {
    const row = {
      code_hash: hashOtpCode("whitson@example.com", "123456"),
      attempts: 4,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    };
    vi.mocked(supabase.from).mockReturnValue(otpChain(row) as ReturnType<typeof supabase.from>);
    const { POST } = await import("@/app/api/relink/email-otp/verify/route");
    const res = await POST(req({ email: "whitson@example.com", code: "000000", device_uuid: "d1" }));
    const json = await res.json();
    expect(res.status).toBe(403);
    expect(json.error).toBe("max_attempts");
    expect(json.must_resend).toBe(true);
  });

  it("returns status 'register' when the correct code matches no guest", async () => {
    const row = {
      code_hash: hashOtpCode("whitson@example.com", "123456"),
      attempts: 0,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    };
    vi.mocked(supabase.from).mockImplementation(
      tableMock({
        email_otps: otpChain(row),
        guests: guestChain(null),
      }) as unknown as typeof supabase.from
    );
    const { POST } = await import("@/app/api/relink/email-otp/verify/route");
    const res = await POST(req({ email: "whitson@example.com", code: "123456", device_uuid: "d1" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.status).toBe("register");
    expect(json.email).toBe("whitson@example.com");
  });

  it("returns status 'relinked' with a session_token when the code matches a guest", async () => {
    const row = {
      code_hash: hashOtpCode("whitson@example.com", "123456"),
      attempts: 0,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    };
    const guest = { id: "guest-1", name: "Whitson", city: "Chennai" };
    vi.mocked(supabase.from).mockImplementation(
      tableMock({
        email_otps: otpChain(row),
        guests: guestChain(guest),
        device_fingerprints: fingerprintChain(null, { session_token: "tok-999" }),
      }) as unknown as typeof supabase.from
    );
    const { POST } = await import("@/app/api/relink/email-otp/verify/route");
    const res = await POST(req({ email: "whitson@example.com", code: "123456", device_uuid: "new-device" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.status).toBe("relinked");
    expect(json.session_token).toBe("tok-999");
    expect(json.name).toBe("Whitson");
  });

  it("reuses the existing session_token when this device is already linked", async () => {
    const row = {
      code_hash: hashOtpCode("whitson@example.com", "123456"),
      attempts: 0,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    };
    const guest = { id: "guest-1", name: "Whitson", city: "Chennai" };
    vi.mocked(supabase.from).mockImplementation(
      tableMock({
        email_otps: otpChain(row),
        guests: guestChain(guest),
        device_fingerprints: fingerprintChain({ session_token: "existing-tok" }, null),
      }) as unknown as typeof supabase.from
    );
    const { POST } = await import("@/app/api/relink/email-otp/verify/route");
    const res = await POST(req({ email: "whitson@example.com", code: "123456", device_uuid: "already-linked-device" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.session_token).toBe("existing-tok");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/email-otp-verify.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `app/api/relink/email-otp/verify/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { normalizeEmail, hashOtpCode, OTP_MAX_ATTEMPTS } from "@/lib/email-otp";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { email, code, device_uuid, user_agent, browser_signals_hash } = body as {
    email?: string;
    code?: string;
    device_uuid?: string;
    user_agent?: string;
    browser_signals_hash?: string;
  };

  if (!email || !code || !device_uuid) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const normalizedEmail = normalizeEmail(email);

  const { data: otpRow } = await supabase
    .from("email_otps")
    .select("code_hash, attempts, expires_at")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (!otpRow || new Date(otpRow.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "expired_or_missing" }, { status: 410 });
  }

  const submittedHash = hashOtpCode(normalizedEmail, code.trim());
  if (submittedHash !== otpRow.code_hash) {
    const attempts = otpRow.attempts + 1;
    await supabase.from("email_otps").update({ attempts }).eq("email", normalizedEmail);

    if (attempts >= OTP_MAX_ATTEMPTS) {
      return NextResponse.json({ error: "max_attempts", must_resend: true }, { status: 403 });
    }
    return NextResponse.json(
      { error: "invalid_code", attempts_remaining: OTP_MAX_ATTEMPTS - attempts },
      { status: 403 }
    );
  }

  await supabase
    .from("email_otps")
    .update({ verified_at: new Date().toISOString() })
    .eq("email", normalizedEmail);

  const { data: guest } = await supabase
    .from("guests")
    .select("id, name, city")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (!guest) {
    return NextResponse.json({ status: "register", email: normalizedEmail });
  }

  const { data: existingFp } = await supabase
    .from("device_fingerprints")
    .select("session_token")
    .eq("device_uuid", device_uuid)
    .maybeSingle();

  let sessionToken: string;
  if (existingFp) {
    sessionToken = existingFp.session_token;
    await supabase
      .from("device_fingerprints")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("device_uuid", device_uuid);
  } else {
    const { data: newFp, error: fpError } = await supabase
      .from("device_fingerprints")
      .insert({
        guest_id: guest.id,
        device_uuid,
        browser_signals_hash: browser_signals_hash ?? "",
        user_agent: user_agent ?? null,
      })
      .select("session_token")
      .single();

    if (fpError || !newFp) {
      return NextResponse.json({ error: "failed to create device fingerprint" }, { status: 500 });
    }
    sessionToken = newFp.session_token;
  }

  await supabase.from("guests").update({ invitation_seen: true }).eq("id", guest.id);

  return NextResponse.json({
    status: "relinked",
    session_token: sessionToken,
    name: guest.name,
    city: guest.city,
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/email-otp-verify.test.ts`
Expected: PASS (all tests green).

- [ ] **Step 5: Commit**

```bash
git add app/api/relink/email-otp/verify/route.ts tests/email-otp-verify.test.ts
git commit -m "feat: add /api/relink/email-otp/verify endpoint"
```

---

## Task 7: `/relink/verify-email` page

**Files:**
- Create: `app/relink/verify-email/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateDeviceUUID, getBrowserSignalsHash } from "@/lib/fingerprint";
import { safeSetItem } from "@/lib/storage";

type Step = "email" | "code";

const RESEND_COOLDOWN_SECONDS = 60;
const MAX_SENDS_PER_HOUR = 3;

export default function VerifyEmailPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sendCount, setSendCount] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (cooldownTimer.current) clearInterval(cooldownTimer.current); };
  }, []);

  function startCooldown() {
    setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldownSeconds((s) => {
        if (s <= 1 && cooldownTimer.current) clearInterval(cooldownTimer.current);
        return Math.max(0, s - 1);
      });
    }, 1000);
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const device_uuid = await getOrCreateDeviceUUID();
      const res = await fetch("/api/relink/email-otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), device_uuid }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "disposable_email") {
          setErrorMsg("Please use a permanent email address (temporary/disposable addresses aren't supported).");
        } else if (data.error === "invalid_email") {
          setErrorMsg("Please enter a valid email address.");
        } else if (data.error === "rate_limited") {
          setErrorMsg("Too many attempts — please try again later, or contact James & Sharon directly.");
        } else {
          setErrorMsg("Something went wrong, please try again.");
        }
        setStatus("error");
        return;
      }
      setSendCount((c) => c + 1);
      startCooldown();
      setStep("code");
      setStatus("idle");
    } catch {
      setErrorMsg("Connection error — please try again.");
      setStatus("error");
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || status === "loading") return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const device_uuid = await getOrCreateDeviceUUID();
      const browser_signals_hash = await getBrowserSignalsHash();
      const res = await fetch("/api/relink/email-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          device_uuid,
          browser_signals_hash,
          user_agent: navigator.userAgent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "expired_or_missing") {
          setErrorMsg("That code expired — please resend.");
          setCooldownSeconds(0);
        } else if (data.error === "max_attempts") {
          setErrorMsg("Too many incorrect attempts — please request a new code.");
          setCode("");
        } else if (data.error === "invalid_code") {
          setErrorMsg(`Incorrect code (${data.attempts_remaining} attempt${data.attempts_remaining === 1 ? "" : "s"} remaining).`);
        } else {
          setErrorMsg("Something went wrong, please try again.");
        }
        setStatus("error");
        return;
      }

      if (data.status === "relinked") {
        safeSetItem("guest_name", data.name);
        safeSetItem("guest_city", data.city);
        safeSetItem("session_token", data.session_token);
        safeSetItem("invitation_seen", "true");
      } else {
        sessionStorage.setItem("verified_relink_email", data.email);
      }
      router.push("/");
    } catch {
      setErrorMsg("Connection error — please try again.");
      setStatus("error");
    }
  }

  const resendDisabled = status === "loading" || cooldownSeconds > 0 || sendCount >= MAX_SENDS_PER_HOUR;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f9f5f1", padding: 20 }}>
      <div style={{ width: 340, textAlign: "center" }}>
        <h2 style={{ margin: "0 0 8px", fontFamily: "Georgia, serif", color: "#8B4A6B", fontSize: 20 }}>Verify your email</h2>

        {step === "email" && (
          <>
            <p style={{ fontSize: 13, color: "#999", marginBottom: 18 }}>
              We&apos;ll send a 6-digit code to confirm it&apos;s really you.
            </p>
            <form onSubmit={sendCode} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14 }}
              />
              <button
                type="submit"
                disabled={status === "loading"}
                style={{ padding: "10px 14px", background: "#8B4A6B", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, opacity: status === "loading" ? 0.6 : 1 }}
              >
                {status === "loading" ? "Sending…" : "Send code"}
              </button>
            </form>
          </>
        )}

        {step === "code" && (
          <>
            <p style={{ fontSize: 13, color: "#999", marginBottom: 18 }}>
              Enter the 6-digit code sent to <strong>{email}</strong>
            </p>
            <form onSubmit={verifyCode} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                required
                style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 20, letterSpacing: 6, textAlign: "center" }}
              />
              <button
                type="submit"
                disabled={status === "loading"}
                style={{ padding: "10px 14px", background: "#8B4A6B", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, opacity: status === "loading" ? 0.6 : 1 }}
              >
                {status === "loading" ? "Verifying…" : "Verify"}
              </button>
            </form>
            <button
              onClick={() => sendCode()}
              disabled={resendDisabled}
              style={{ marginTop: 12, background: "none", border: "none", color: resendDisabled ? "#ccc" : "#8B4A6B", fontSize: 12, cursor: resendDisabled ? "default" : "pointer", textDecoration: resendDisabled ? "none" : "underline" }}
            >
              {cooldownSeconds > 0
                ? `Resend code (${cooldownSeconds}s)`
                : sendCount >= MAX_SENDS_PER_HOUR
                ? "Resend limit reached — try again later"
                : "Resend code"}
            </button>
            <button
              onClick={() => { setStep("email"); setCode(""); setErrorMsg(""); setStatus("idle"); }}
              style={{ marginTop: 10, background: "none", border: "none", color: "#999", fontSize: 12, cursor: "pointer", textDecoration: "underline", display: "block", margin: "10px auto 0" }}
            >
              ← use a different email
            </button>
          </>
        )}

        {status === "error" && errorMsg && (
          <p style={{ marginTop: 14, fontSize: 13, color: "#c0392b" }}>{errorMsg}</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/relink/verify-email/page.tsx
git commit -m "feat: add /relink/verify-email page (email OTP entry + verify)"
```

---

## Task 8: Wire `RelinkForm` dead ends and `Home` "register as new" consumption

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add the "This isn't me" link to the "lookup" step**

In `RelinkForm`, find the final `return` block (the "lookup" step, starting `return (\n    <div style={{ textAlign: "center", padding: "0 4px" }}>\n      <p style={{ fontSize: 13, color: "#aaa", marginBottom: 16 }}>Already a guest?...`). Replace it:

```tsx
  return (
    <div style={{ textAlign: "center", padding: "0 4px" }}>
      <p style={{ fontSize: 13, color: "#aaa", marginBottom: 16 }}>Already a guest? Re-enter your details to continue.</p>
      <form onSubmit={handleLookup} style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 480, margin: "0 auto" }}>
        <input
          value={name}
          onChange={e => handleNameChange(e.target.value)}
          placeholder="Your name"
          required
          style={{ flex: "1 1 160px", padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, outline: "none" }}
        />
        <input
          value={city}
          onChange={e => handleCityChange(e.target.value)}
          placeholder="Your city"
          required
          style={{ flex: "1 1 160px", padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, outline: "none" }}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: "#8B4A6B", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: status === "loading" ? 0.6 : 1 }}
        >
          {status === "loading" ? "Checking…" : "Continue"}
        </button>
      </form>
      {status === "error" && <p style={{ marginTop: 12, fontSize: 13, color: "#c0392b" }}>{errorMsg}</p>}
      <a
        href="/relink/verify-email"
        style={{ display: "inline-block", marginTop: 14, color: "#999", fontSize: 12, textDecoration: "underline" }}
      >
        This isn&apos;t me — verify with a different email
      </a>
    </div>
  );
}
```

- [ ] **Step 2: Add the same link to the "verify" step**

Find the "verify" step's return block (contains `← Not you? Try a different name`). Add the link right after that existing button:

```tsx
        <button
          onClick={() => { setStep("lookup"); setErrorMsg(""); setStatus("idle"); }}
          style={{ marginTop: 10, background: "none", border: "none", color: "#999", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
        >
          ← Not you? Try a different name
        </button>
        <a
          href="/relink/verify-email"
          style={{ display: "inline-block", marginTop: 10, color: "#999", fontSize: 12, textDecoration: "underline" }}
        >
          This isn&apos;t me — verify with a different email
        </a>
      </div>
    );
  }
```

(This replaces the single closing `</div>\n    );\n  }` that currently ends the "verify" step block — add the `<a>` tag before those closing lines.)

- [ ] **Step 3: Make `Home` consume `verified_relink_email` on mount**

In `Home`, right after the `usePhase()` destructure line (`const { phase, guestName, guestCity, guestId, isOwner, isLoading, refresh, sessionRestored, relinkPending, relinkRequiredPreview, acknowledgeInvitation } = usePhase();`), add:

```tsx
  const [verifiedRelinkEmail, setVerifiedRelinkEmail] = useState<string | null>(null);
  useEffect(() => {
    try {
      const email = sessionStorage.getItem("verified_relink_email");
      if (email) {
        setVerifiedRelinkEmail(email);
        sessionStorage.removeItem("verified_relink_email");
      }
    } catch {}
  }, []);
```

Then find `if (isLoading) {` (the loading-screen early return) and add this immediately **before** it:

```tsx
  if (verifiedRelinkEmail) {
    return <OpeningScreen onComplete={() => { setVerifiedRelinkEmail(null); refresh(); }} verifiedEmail={verifiedRelinkEmail} />;
  }

```

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add email-OTP escape hatch links to RelinkForm and wire Home to consume verified email"
```

---

## Task 9: Pre-fill and lock the email field in `FirstVisitForm`/`OpeningScreen`

**Files:**
- Modify: `components/phases/OpeningScreen.tsx`
- Modify: `components/phases/FirstVisitForm.tsx`

- [ ] **Step 1: Add `verifiedEmail` prop to `OpeningScreen`**

In `components/phases/OpeningScreen.tsx`, update the `Props` interface and pass-through:

```tsx
interface Props {
  onComplete: (name: string) => void;
  verifiedEmail?: string;
}
```

```tsx
export default function OpeningScreen({ onComplete, verifiedEmail }: Props) {
```

Find where `<FirstVisitForm onComplete={onComplete} />` is rendered and change it to:

```tsx
<FirstVisitForm onComplete={onComplete} verifiedEmail={verifiedEmail} />
```

- [ ] **Step 2: Add `verifiedEmail` prop to `FirstVisitForm`**

In `components/phases/FirstVisitForm.tsx`, update:

```tsx
interface Props {
  onComplete: (name: string) => void;
  verifiedEmail?: string;
}

export default function FirstVisitForm({ onComplete, verifiedEmail }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(verifiedEmail ?? "");
```

- [ ] **Step 3: Make the email field read-only when pre-verified**

Replace the email `<input>`:

```tsx
          <input
            id="guest-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className={inputCls}
            autoComplete="off"
            readOnly={!!verifiedEmail}
            style={verifiedEmail ? { opacity: 0.7, cursor: "not-allowed" } : undefined}
          />
```

- [ ] **Step 4: Commit**

```bash
git add components/phases/OpeningScreen.tsx components/phases/FirstVisitForm.tsx
git commit -m "feat: allow FirstVisitForm to pre-fill and lock a verified email"
```

---

## Task 10: E2E test for the full flow

**Files:**
- Create: `tests/e2e/relink-email-otp.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from "@playwright/test";

test.describe("Relink email-OTP escape hatch", () => {
  test("verifying an unrecognized email routes to registration with email pre-filled", async ({ page }) => {
    await page.goto("/relink/verify-email");

    const testEmail = `otp-test-${Date.now()}@example.com`;
    await page.getByPlaceholder("your@email.com").fill(testEmail);
    await page.getByRole("button", { name: /send code/i }).click();

    // Dev/staging returns debug_code so we don't need a real inbox.
    await expect(page.getByPlaceholder("123456")).toBeVisible({ timeout: 10_000 });

    const requestPromise = page.waitForResponse((r) => r.url().includes("/api/relink/email-otp/request"));
    // The request already fired above; re-fetch its JSON via a fresh request instead
    // isn't possible post-hoc, so read it from the network log captured during send:
    const res = await requestPromise.catch(() => null);
    let code = "";
    if (res) {
      const json = await res.json().catch(() => null);
      code = json?.debug_code ?? "";
    }
    expect(code).toMatch(/^\d{6}$/);

    await page.getByPlaceholder("123456").fill(code);
    await page.getByRole("button", { name: /verify/i }).click();

    // No guest exists for this fresh test email → routed to registration.
    await expect(page).toHaveURL("/");
    const emailInput = page.locator("#guest-email");
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
    await expect(emailInput).toHaveValue(testEmail);
    await expect(emailInput).toHaveAttribute("readonly", "");
  });

  test("resend button is disabled during the cooldown window", async ({ page }) => {
    await page.goto("/relink/verify-email");
    const testEmail = `otp-cooldown-${Date.now()}@example.com`;
    await page.getByPlaceholder("your@email.com").fill(testEmail);
    await page.getByRole("button", { name: /send code/i }).click();
    await expect(page.getByPlaceholder("123456")).toBeVisible({ timeout: 10_000 });

    const resendButton = page.getByRole("button", { name: /resend code/i });
    await expect(resendButton).toBeDisabled();
  });

  test("rejects a disposable email domain", async ({ page }) => {
    await page.goto("/relink/verify-email");
    await page.getByPlaceholder("your@email.com").fill("someone@mailinator.com");
    await page.getByRole("button", { name: /send code/i }).click();
    await expect(page.getByText(/temporary\/disposable addresses aren't supported/i)).toBeVisible({ timeout: 10_000 });
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx playwright test --project=chromium tests/e2e/relink-email-otp.spec.ts --reporter=list`
Expected: 3 passed. If the dev server isn't already running, Playwright's configured `webServer` starts it automatically.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/relink-email-otp.spec.ts
git commit -m "test: add e2e coverage for the relink email-OTP flow"
```

---

## Task 11: Full regression pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit suite**

Run: `npx vitest run`
Expected: all test files pass, including the 4 new ones from this plan.

- [ ] **Step 2: Run the full e2e suite on chromium**

Run: `npx playwright test --project=chromium --reporter=list`
Expected: no new failures introduced by this feature (pre-existing unrelated failures from other specs, if any, are out of scope for this plan).

- [ ] **Step 3: Note the required manual step**

Confirm with the user that `OTP_HASH_PEPPER` has been set in the production environment (Vercel project env vars) before this ships — without it, the code falls back to a shared dev default, which is fine for dev/staging but must not be used in production.
