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
import { hashOtpCode } from "@/lib/email-otp";

function req(url: string, body: Record<string, unknown>) {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function tableMock(tables: Record<string, Record<string, unknown>>) {
  return vi.fn((table: string) => {
    const chain = tables[table];
    if (!chain) throw new Error(`unexpected table in test: ${table}`);
    return chain;
  });
}

function guestChain(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
    update: vi.fn().mockReturnThis(),
  };
}

function otpChain(data: unknown, upsertError: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ data: null, error: upsertError }),
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

describe("POST /api/relink/confirm-otp/request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.VERCEL_ENV = "";
  });

  it("returns 400 for missing fields", async () => {
    const { POST } = await import("@/app/api/relink/confirm-otp/request/route");
    const res = await POST(req("http://localhost/api/relink/confirm-otp/request", {}));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the guest doesn't exist", async () => {
    vi.mocked(supabase.from).mockReturnValue(guestChain(null) as ReturnType<typeof supabase.from>);
    const { POST } = await import("@/app/api/relink/confirm-otp/request/route");
    const res = await POST(req("http://localhost/api/relink/confirm-otp/request", { guest_id: "g1", device_uuid: "d1" }));
    expect(res.status).toBe(404);
  });

  it("returns needs_phone when the guest has no email on file", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      guestChain({ id: "g1", email: null }) as ReturnType<typeof supabase.from>
    );
    const { POST } = await import("@/app/api/relink/confirm-otp/request/route");
    const res = await POST(req("http://localhost/api/relink/confirm-otp/request", { guest_id: "g1", device_uuid: "d1" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.needs_phone).toBe(true);
  });

  it("sends a code to the guest's own email and returns a masked hint + debug_code outside production", async () => {
    vi.mocked(supabase.from).mockImplementation(
      tableMock({
        guests: guestChain({ id: "g1", email: "james@example.com" }),
        email_otps: otpChain(null),
      }) as unknown as typeof supabase.from
    );
    const { POST } = await import("@/app/api/relink/confirm-otp/request/route");
    const res = await POST(req("http://localhost/api/relink/confirm-otp/request", { guest_id: "g1", device_uuid: "d1" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.debug_code).toMatch(/^\d{6}$/);
    expect(json.email_hint).toContain("@example.com");
    expect(json.email_hint).not.toContain("james@example.com");
    expect(sendOtpEmail).toHaveBeenCalledWith("james@example.com", json.debug_code);
  });

  it("returns 429 when resent within the cooldown window", async () => {
    const now = Date.now();
    vi.mocked(supabase.from).mockImplementation(
      tableMock({
        guests: guestChain({ id: "g1", email: "james@example.com" }),
        email_otps: otpChain({
          send_count: 1,
          last_sent_at: new Date(now - 5_000).toISOString(),
          window_started_at: new Date(now - 5_000).toISOString(),
        }),
      }) as unknown as typeof supabase.from
    );
    const { POST } = await import("@/app/api/relink/confirm-otp/request/route");
    const res = await POST(req("http://localhost/api/relink/confirm-otp/request", { guest_id: "g1", device_uuid: "d1" }));
    expect(res.status).toBe(429);
  });
});

describe("POST /api/relink/confirm-otp/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns 400 for missing fields", async () => {
    const { POST } = await import("@/app/api/relink/confirm-otp/verify/route");
    const res = await POST(req("http://localhost/api/relink/confirm-otp/verify", { guest_id: "g1" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the guest has no email on file", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      guestChain({ id: "g1", name: "James", city: "Chennai", email: null }) as ReturnType<typeof supabase.from>
    );
    const { POST } = await import("@/app/api/relink/confirm-otp/verify/route");
    const res = await POST(req("http://localhost/api/relink/confirm-otp/verify", { guest_id: "g1", code: "123456", device_uuid: "d1" }));
    expect(res.status).toBe(404);
  });

  it("returns 410 when no OTP row exists for the guest's email", async () => {
    vi.mocked(supabase.from).mockImplementation(
      tableMock({
        guests: guestChain({ id: "g1", name: "James", city: "Chennai", email: "james@example.com" }),
        email_otps: otpChain(null),
      }) as unknown as typeof supabase.from
    );
    const { POST } = await import("@/app/api/relink/confirm-otp/verify/route");
    const res = await POST(req("http://localhost/api/relink/confirm-otp/verify", { guest_id: "g1", code: "123456", device_uuid: "d1" }));
    expect(res.status).toBe(410);
  });

  it("returns 403 invalid_code on a wrong code", async () => {
    const row = {
      code_hash: hashOtpCode("james@example.com", "123456"),
      attempts: 0,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    };
    vi.mocked(supabase.from).mockImplementation(
      tableMock({
        guests: guestChain({ id: "g1", name: "James", city: "Chennai", email: "james@example.com" }),
        email_otps: otpChain(row),
      }) as unknown as typeof supabase.from
    );
    const { POST } = await import("@/app/api/relink/confirm-otp/verify/route");
    const res = await POST(req("http://localhost/api/relink/confirm-otp/verify", { guest_id: "g1", code: "000000", device_uuid: "d1" }));
    const json = await res.json();
    expect(res.status).toBe(403);
    expect(json.error).toBe("invalid_code");
  });

  it("returns status 'relinked' with a session_token when the code is correct", async () => {
    const row = {
      code_hash: hashOtpCode("james@example.com", "123456"),
      attempts: 0,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    };
    vi.mocked(supabase.from).mockImplementation(
      tableMock({
        guests: guestChain({ id: "g1", name: "James", city: "Chennai", email: "james@example.com" }),
        email_otps: otpChain(row),
        device_fingerprints: fingerprintChain(null, { session_token: "tok-123" }),
      }) as unknown as typeof supabase.from
    );
    const { POST } = await import("@/app/api/relink/confirm-otp/verify/route");
    const res = await POST(req("http://localhost/api/relink/confirm-otp/verify", { guest_id: "g1", code: "123456", device_uuid: "new-device" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.status).toBe("relinked");
    expect(json.session_token).toBe("tok-123");
    expect(json.name).toBe("James");
  });
});
