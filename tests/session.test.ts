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
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
};

function makeChain(data: unknown): Chain {
  const chain: Chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
  return chain;
}

// The browser_signals_hash fallback query is awaited directly (no .maybeSingle()),
// since it can return multiple rows — supabase-js query builders are PromiseLike,
// so the mock needs a `.then` to stand in for that.
function makeListChain(data: unknown[]) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data, error: null }),
  };
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

  it("returns relink_required when browser_signals_hash uniquely matches one guest", async () => {
    vi.mocked(supabase.from)
      .mockReturnValueOnce(makeChain(null) as ReturnType<typeof supabase.from>) // device_uuid lookup: miss
      .mockReturnValueOnce(
        makeListChain([
          { guest_id: "g-1", guests: { id: "g-1", name: "James Daniel", city: "Chennai", invitation_seen: true, is_owner: false } },
        ]) as ReturnType<typeof supabase.from>
      );

    const { POST } = await import("@/app/api/session/route");
    const res = await POST(req({ device_uuid: "new-device", browser_signals_hash: "shared-hash" }));
    const data = await res.json();
    expect(data.status).toBe("relink_required");
    expect(data.name).toBe("James Daniel");
    expect(data.guest_id).toBe("g-1");
  });

  it("refuses to guess and returns { status: 'new' } when browser_signals_hash matches more than one distinct guest", async () => {
    // Regression test: two different guests (e.g. same phone model/OS/timezone)
    // can share the same low-entropy browser_signals_hash. The server must not
    // disclose either guest's name/city to the other's unrecognized device.
    vi.mocked(supabase.from)
      .mockReturnValueOnce(makeChain(null) as ReturnType<typeof supabase.from>) // device_uuid lookup: miss
      .mockReturnValueOnce(
        makeListChain([
          { guest_id: "g-1", guests: { id: "g-1", name: "James Daniel", city: "Chennai", invitation_seen: true, is_owner: false } },
          { guest_id: "g-2", guests: { id: "g-2", name: "Whitson", city: "Chennai", invitation_seen: false, is_owner: false } },
        ]) as ReturnType<typeof supabase.from>
      );

    const { POST } = await import("@/app/api/session/route");
    const res = await POST(req({ device_uuid: "new-device", browser_signals_hash: "shared-hash" }));
    const data = await res.json();
    expect(data.status).toBe("new");
    expect(data.name).toBeUndefined();
  });

});
