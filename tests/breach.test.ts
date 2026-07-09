// @vitest-environment node
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

  it("inserts a new phase_view log if none exists", async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "access_logs") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: mockMaybeSingle,
          insert: mockInsert,
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    const { logEvent } = await import("@/lib/breach");
    await logEvent("uuid-1", "phase_view", { home: "time-1" }, "1.2.3.4", "guest-1");

    expect(mockMaybeSingle).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalledWith({
      device_uuid: "uuid-1",
      guest_id: "guest-1",
      event_type: "phase_view",
      event_data: { home: "time-1" },
      ip: "1.2.3.4",
    });
  });

  it("updates and merges an existing phase_view log if found", async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ error: null });
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: "log-123", event_data: { home: "time-1" }, guest_id: null },
      error: null,
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "access_logs") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: mockMaybeSingle,
          update: mockUpdate,
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    const { logEvent } = await import("@/lib/breach");
    await logEvent("uuid-1", "phase_view", { preview: "time-2" }, "1.2.3.4", "guest-1");

    expect(mockMaybeSingle).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      event_data: { home: "time-1", preview: "time-2" },
      guest_id: "guest-1",
    }));
  });
});
