// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "@/lib/supabase";

function req(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/register", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function mockFromSequence(calls: Array<{ data: unknown; error: unknown }>) {
  let i = 0;
  vi.mocked(supabase.from).mockImplementation(() => {
    const r = calls[i++] ?? { data: null, error: "unexpected call" };
    return {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue(r),
      single: vi.fn().mockResolvedValue(r),
    } as ReturnType<typeof supabase.from>;
  });
}

describe("POST /api/register", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it("returns 400 when required fields are missing", async () => {
    const { POST } = await import("@/app/api/register/route");
    const res = await POST(req({ name: "James" })); // missing city + device_uuid
    expect(res.status).toBe(400);
  });

  it("returns existing session_token when device is already registered", async () => {
    mockFromSequence([{ data: { session_token: "existing-tok" }, error: null }]);
    const { POST } = await import("@/app/api/register/route");
    const res = await POST(req({ name: "J", city: "Chennai", device_uuid: "u1", browser_signals_hash: "h1" }));
    expect((await res.json()).session_token).toBe("existing-tok");
  });

  it("creates guest + device and returns new session_token", async () => {
    mockFromSequence([
      { data: null, error: null },                          // no existing device
      { data: { id: "guest-1" }, error: null },             // insert guest
      { data: { session_token: "new-tok" }, error: null },  // insert device
    ]);
    const { POST } = await import("@/app/api/register/route");
    const res = await POST(req({ name: "J", city: "Chennai", device_uuid: "u1", browser_signals_hash: "h1" }));
    expect((await res.json()).session_token).toBe("new-tok");
  });

  it("returns 500 if guest creation fails", async () => {
    mockFromSequence([
      { data: null, error: null },                             // no existing device
      { data: null, error: { message: "db error" } },         // guest insert fails
    ]);
    const { POST } = await import("@/app/api/register/route");
    const res = await POST(req({ name: "J", city: "Chennai", device_uuid: "u1", browser_signals_hash: "h1" }));
    expect(res.status).toBe(500);
  });

  it("creates a new guest with email and mobile if no existing guest matches", async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValueOnce({ data: null, error: null }) // device_fingerprints check
                                  .mockResolvedValueOnce({ data: null, error: null })  // guests check by mobile
                                  .mockResolvedValueOnce({ data: null, error: null }); // guests check by email
    const mockInsert = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValueOnce({ data: { id: "guest-new" }, error: null }) // guest insert
                              .mockResolvedValueOnce({ data: { session_token: "new-tok" }, error: null }); // device_fingerprints insert

    vi.mocked(supabase.from).mockImplementation(() => {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: mockInsert,
        maybeSingle: mockMaybeSingle,
        single: mockSingle,
      } as unknown as ReturnType<typeof supabase.from>;
    });

    const { POST } = await import("@/app/api/register/route");
    const res = await POST(req({ name: "J", city: "Chennai", email: "test@example.com", mobile: "+919876543210", device_uuid: "u1", browser_signals_hash: "h1" }));
    
    expect(res.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ email: "test@example.com", mobile: "+919876543210" }));
    expect((await res.json()).session_token).toBe("new-tok");
  });

  it("reuses existing guest by mobile (highest precedence) and updates name, city, and email", async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValueOnce({ data: null, error: null }) // device_fingerprints check
                                  .mockResolvedValueOnce({ data: { id: "guest-old", name: "OldName", city: "OldCity", email: "old@example.com", mobile: "+919876543210" }, error: null }); // guests check by mobile
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
    const mockInsert = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValueOnce({ data: { session_token: "linked-tok" }, error: null }); // device_fingerprints insert

    vi.mocked(supabase.from).mockImplementation(() => {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: mockUpdate,
        insert: mockInsert,
        maybeSingle: mockMaybeSingle,
        single: mockSingle,
      } as unknown as ReturnType<typeof supabase.from>;
    });

    const { POST } = await import("@/app/api/register/route");
    const res = await POST(req({ name: "NewName", city: "NewCity", email: "new@example.com", mobile: "+919876543210", device_uuid: "u1", browser_signals_hash: "h1" }));

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ name: "NewName", city: "NewCity", email: "new@example.com" });
    expect(mockUpdateEq).toHaveBeenCalledWith("id", "guest-old");
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      guest_id: "guest-old",
      device_uuid: "u1",
      browser_signals_hash: "h1",
    }));
    expect((await res.json()).session_token).toBe("linked-tok");
  });

  it("reuses existing guest by email (secondary precedence) and updates name, city, and mobile", async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValueOnce({ data: null, error: null }) // device_fingerprints check
                                  .mockResolvedValueOnce({ data: null, error: null })  // guests check by mobile (none found)
                                  .mockResolvedValueOnce({ data: { id: "guest-old", name: "OldName", city: "OldCity", email: "test@example.com", mobile: null }, error: null }); // guests check by email
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
    const mockInsert = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValueOnce({ data: { session_token: "linked-tok" }, error: null }); // device_fingerprints insert

    vi.mocked(supabase.from).mockImplementation(() => {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: mockUpdate,
        insert: mockInsert,
        maybeSingle: mockMaybeSingle,
        single: mockSingle,
      } as unknown as ReturnType<typeof supabase.from>;
    });

    const { POST } = await import("@/app/api/register/route");
    const res = await POST(req({ name: "NewName", city: "NewCity", email: "test@example.com", mobile: "+919876543210", device_uuid: "u1", browser_signals_hash: "h1" }));

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ name: "NewName", city: "NewCity", mobile: "+919876543210" });
    expect(mockUpdateEq).toHaveBeenCalledWith("id", "guest-old");
    expect((await res.json()).session_token).toBe("linked-tok");
  });
});
