import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "@/lib/supabase";

type Chain = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
};

function makeChain(data: unknown): Chain {
  const chain: Chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
  return chain;
}

function req(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/session", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/session", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it("returns { status: 'new' } when device_uuid is absent", async () => {
    const { POST } = await import("@/app/api/session/route");
    const res = await POST(req({}));
    expect((await res.json()).status).toBe("new");
  });

  it("returns { status: 'new' } when device is not in database", async () => {
    vi.mocked(supabase.from).mockReturnValue(makeChain(null) as ReturnType<typeof supabase.from>);
    const { POST } = await import("@/app/api/session/route");
    const res = await POST(req({ device_uuid: "unknown", browser_signals_hash: "abc" }));
    expect((await res.json()).status).toBe("new");
  });

  it("returns known session data when device is found by device_uuid", async () => {
    const fp = {
      session_token: "tok-123",
      guest_id: "g-1",
      guests: { name: "James", city: "Chennai", invitation_seen: true, is_owner: false },
    };
    // First call (device lookup): returns fp. Second call (update): needs update chain.
    vi.mocked(supabase.from)
      .mockReturnValueOnce({
        ...makeChain(fp),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: fp, error: null }),
      } as ReturnType<typeof supabase.from>)
      .mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      } as unknown as ReturnType<typeof supabase.from>);

    const { POST } = await import("@/app/api/session/route");
    const res = await POST(req({ device_uuid: "known-uuid", browser_signals_hash: "abc" }));
    const data = await res.json();
    expect(data.status).toBe("known");
    expect(data.name).toBe("James");
    expect(data.session_token).toBe("tok-123");
  });

});
