import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "@/lib/supabase";

function mockFrom(data: unknown, count: number | null = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
    single: vi.fn().mockResolvedValue({ data, error: null, count }),
  } as unknown as ReturnType<typeof supabase.from>;
}

describe("checkAndBlock", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it("returns null in non-production environments", async () => {
    const orig = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = "preview";
    const { checkAndBlock } = await import("@/lib/breach");
    const result = await checkAndBlock("uuid-1", null, null);
    expect(result).toBeNull();
    process.env.VERCEL_ENV = orig;
  });

  it("returns a block object when an active breach_flag exists", async () => {
    process.env.VERCEL_ENV = "production";
    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockFrom(null)) // owner check (guest_id is null, skip)
      .mockReturnValueOnce(mockFrom({     // active breach flag found
        id: "flag-1",
        blocked_until: new Date(Date.now() + 1e6).toISOString(),
        reason: "api_rate_limit",
      }));
    const { checkAndBlock } = await import("@/lib/breach");
    const result = await checkAndBlock("uuid-1", null, null);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(429);
    process.env.VERCEL_ENV = undefined;
  });

  it("returns null when no flag and rate limit not exceeded", async () => {
    process.env.VERCEL_ENV = "production";
    vi.mocked(supabase.from)
      .mockReturnValueOnce(mockFrom(null))   // no flag
      .mockReturnValueOnce({ ...mockFrom(null, 5), head: true } as unknown as ReturnType<typeof supabase.from>) // 5 recent calls
      .mockReturnValueOnce({ ...mockFrom(null, 0), head: true } as unknown as ReturnType<typeof supabase.from>); // 0 form submits
    const { checkAndBlock } = await import("@/lib/breach");
    const result = await checkAndBlock("uuid-1", null, null);
    expect(result).toBeNull();
    process.env.VERCEL_ENV = undefined;
  });
});

describe("logEvent", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it("inserts a row into access_logs without throwing", async () => {
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    } as unknown as ReturnType<typeof supabase.from>);
    const { logEvent } = await import("@/lib/breach");
    await expect(logEvent("uuid-1", "photo_api", { folder: "engagement" }, "1.2.3.4", "guest-1")).resolves.toBeUndefined();
  });
});
