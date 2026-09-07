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

function makeChain(data: unknown, error: unknown = null, upsertError: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    upsert: vi.fn().mockResolvedValue({ data: null, error: upsertError }),
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

  it("returns 500 when the upsert fails", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      makeChain(null, null, { message: "db error" }) as ReturnType<typeof supabase.from>
    );
    const { POST } = await import("@/app/api/relink/email-otp/request/route");
    const res = await POST(req({ email: "whitson@example.com", device_uuid: "d1" }));
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).toBe("failed to generate code");
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
