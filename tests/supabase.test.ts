import { describe, it, expect, beforeEach, vi } from "vitest";

describe("supabase client", () => {
  beforeEach(() => { vi.resetModules(); });

  it("exports a client with a .from() method when env vars are present", async () => {
    vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_KEY", "test-key");
    const { supabase } = await import("@/lib/supabase");
    expect(supabase).toBeDefined();
    expect(typeof supabase.from).toBe("function");
  });

  it("throws when SUPABASE_URL is missing", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_KEY", "test-key");
    await expect(import("@/lib/supabase")).rejects.toThrow("Missing");
  });
});
