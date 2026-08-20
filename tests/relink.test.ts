// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock supabase
vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}));

// Mock breach logging
vi.mock("@/lib/breach", () => ({
  logEvent: vi.fn(),
}));

import { supabase } from "@/lib/supabase";

function req(url: string, body: Record<string, unknown>) {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function makeChain(data: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    single: vi.fn().mockResolvedValue({ data, error }),
  };
}

describe("POST /api/relink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("request-token", () => {
    it("should generate a token when guest_id is provided and trusted device found", async () => {
      // Mock: first call returns device_fingerprint for the guest
      vi.mocked(supabase.from).mockReturnValueOnce(makeChain({ device_uuid: "trusted-device-uuid" }) as any);
      // Second call for the actual token generation (no DB call needed)
      vi.mocked(supabase.from).mockReturnValue(makeChain(null) as any);

      const { POST } = await import("@/app/api/relink/route");
      const res = await POST(req("http://localhost/api/relink/request-token", {
        guest_id: "guest-123",
        browser_signals_hash: "hash-abc",
        user_agent: "TestAgent/1.0",
      }));
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.token).toBeDefined();
      expect(typeof json.token).toBe("string");
      expect(json.expires_at).toBeDefined();
    });

    it("should return 404 when guest_id is provided but no trusted device found", async () => {
      vi.mocked(supabase.from).mockReturnValue(makeChain(null) as any);
      const { POST } = await import("@/app/api/relink/route");
      const res = await POST(req("http://localhost/api/relink/request-token", {
        guest_id: "guest-123",
        browser_signals_hash: "hash-abc",
      }));
      const json = await res.json();
      expect(res.status).toBe(404);
      expect(json.error).toBe("no trusted device found for guest");
    });

    it("should return 404 when guest_id is missing (no trusted device to look up)", async () => {
      const { POST } = await import("@/app/api/relink/route");
      const res = await POST(req("http://localhost/api/relink/request-token", {
        browser_signals_hash: "hash-abc",
      }));
      const json = await res.json();
      expect(res.status).toBe(404);
      expect(json.error).toBe("no trusted device found for guest");
    });
  });

  describe("confirm", () => {
    it("should return 400 when token or device_uuid is missing", async () => {
      const { POST } = await import("@/app/api/relink/route");
      const res = await POST(req("http://localhost/api/relink/confirm", {
        token: "some-token",
      }));
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.error).toBe("missing required fields");
    });

    it("should return 403 for an invalid token", async () => {
      const { POST } = await import("@/app/api/relink/route");
      const res = await POST(req("http://localhost/api/relink/confirm", {
        token: "invalid.token",
        device_uuid: "new-device-uuid",
      }));
      const json = await res.json();
      expect(res.status).toBe(403);
      expect(json.error).toBe("invalid or expired token");
    });
  });

  describe("original flow (lookup)", () => {
    it("should return verification method for existing guest with phone", async () => {
      vi.mocked(supabase.from).mockReturnValue({
        ...makeChain({
          id: "guest-id",
          name: "John Doe",
          city: "Chennai",
          email: "john@example.com",
          mobile: "+919876543210",
          invitation_seen: false,
        }),
      } as any);

      const { POST } = await import("@/app/api/relink/route");
      const res = await POST(req("http://localhost/api/relink", {
        name: "John Doe",
        city: "Chennai",
        lookup: true,
      }));
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.method).toBe("phone");
      expect(json.hint).toBeDefined();
    });

    it("should return not_found when guest name is not found", async () => {
      vi.mocked(supabase.from).mockReturnValue(makeChain(null) as any);

      const { POST } = await import("@/app/api/relink/route");
      const res = await POST(req("http://localhost/api/relink", {
        name: "Nonexistent",
        city: "Nowhere",
        lookup: true,
      }));
      const json = await res.json();
      expect(res.status).toBe(404);
      expect(json.error).toBe("not_found");
    });

    it("should require token for guests with no phone/email (verifyMethod: none)", async () => {
      vi.mocked(supabase.from).mockReturnValue({
        ...makeChain({
          id: "guest-id",
          name: "No Contact",
          city: "Remote",
          email: null,
          mobile: null,
          invitation_seen: false,
        }),
      } as any);

      const { POST } = await import("@/app/api/relink/route");
      const res = await POST(req("http://localhost/api/relink", {
        name: "No Contact",
        city: "Remote",
        lookup: false,
      }));
      const json = await res.json();
      expect(res.status).toBe(403);
      expect(json.error).toBe("token_required");
      expect(json.message).toContain("secure link");
    });
  });
});