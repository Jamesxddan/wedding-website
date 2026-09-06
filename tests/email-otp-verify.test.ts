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
