import { describe, it, expect, beforeEach, vi } from "vitest";

describe("supabase client", () => {
  beforeEach(() => { vi.resetModules(); });

  it("exports a client with a .from() method when env vars are present", async () => {
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_KEY = "test-key";
    const { supabase } = await import("@/lib/supabase");
    expect(supabase).toBeDefined();
    expect(typeof supabase.from).toBe("function");
  });
});
