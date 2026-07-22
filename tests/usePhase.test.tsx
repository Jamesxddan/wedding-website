import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Phase } from "@/lib/phase";
import { WEDDING_DATE } from "@/lib/constants";

const DAY_BEFORE = new Date(WEDDING_DATE.getTime() - 24 * 60 * 60 * 1000);
const DAY_AFTER = new Date(WEDDING_DATE.getTime() + 24 * 60 * 60 * 1000);

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });

// Mock fingerprint module (browser APIs not fully available in vitest)
vi.mock("@/lib/fingerprint", () => ({
  getOrCreateDeviceUUID: vi.fn().mockResolvedValue("test-uuid"),
  getBrowserSignalsHash: vi.fn().mockResolvedValue("test-hash"),
}));

describe("usePhase", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.useRealTimers();
    vi.resetModules();
    // Prevent real network calls in background session check
    global.fetch = vi.fn().mockRejectedValue(new Error("no network in test"));
  });

  it("returns RETURN_VISIT when localStorage has no guest_name", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(DAY_BEFORE);
    const { usePhase } = await import("@/lib/usePhase");
    const { result } = renderHook(() => usePhase());
    await act(async () => { await vi.runAllTimersAsync(); });
    expect(result.current.phase).toBe(Phase.RETURN_VISIT);
    expect(result.current.guestName).toBeNull();
    expect(result.current.sessionRestored).toBe(false);
  });

  it("returns INVITATION when name set but invitation not seen", async () => {
    localStorageMock.setItem("guest_name", "John");
    vi.useFakeTimers();
    vi.setSystemTime(DAY_BEFORE);
    const { usePhase } = await import("@/lib/usePhase");
    const { result } = renderHook(() => usePhase());
    await act(async () => { await vi.runAllTimersAsync(); });
    expect(result.current.phase).toBe(Phase.INVITATION);
  });

  it("returns RETURN_VISIT when name set and invitation seen", async () => {
    localStorageMock.setItem("guest_name", "John");
    localStorageMock.setItem("invitation_seen", "true");
    vi.useFakeTimers();
    vi.setSystemTime(DAY_BEFORE);
    const { usePhase } = await import("@/lib/usePhase");
    const { result } = renderHook(() => usePhase());
    await act(async () => { await vi.runAllTimersAsync(); });
    expect(result.current.phase).toBe(Phase.RETURN_VISIT);
    expect(result.current.guestName).toBe("John");
  });

  it("returns POST_WEDDING when name set, invitation seen, and date is after wedding", async () => {
    localStorageMock.setItem("guest_name", "John");
    localStorageMock.setItem("invitation_seen", "true");
    vi.useFakeTimers();
    vi.setSystemTime(DAY_AFTER);
    const { usePhase } = await import("@/lib/usePhase");
    const { result } = renderHook(() => usePhase());
    await act(async () => { await vi.runAllTimersAsync(); });
    expect(result.current.phase).toBe(Phase.POST_WEDDING);
  });

  it("silently restores session when /api/session returns 'known'", async () => {
    // No guest_name in localStorage — simulates cleared storage
    // Must run as production so the session check is not skipped
    process.env.NEXT_PUBLIC_VERCEL_ENV = "production";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        status: "known",
        name: "Sharon",
        city: "Chennai",
        invitation_seen: true,
        session_token: "tok-abc",
      }),
    });
    vi.useFakeTimers();
    vi.setSystemTime(DAY_BEFORE);
    try {
      const { usePhase } = await import("@/lib/usePhase");
      const { result } = renderHook(() => usePhase());
      await act(async () => { await vi.runAllTimersAsync(); });
      expect(localStorageMock.getItem("guest_name")).toBe("Sharon");
      expect(localStorageMock.getItem("session_token")).toBe("tok-abc");
      expect(result.current.sessionRestored).toBe(true);
      expect(result.current.phase).toBe(Phase.RETURN_VISIT);
      expect(result.current.guestName).toBe("Sharon");
    } finally {
      delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    }
  });

  it("does not fire session check when guest_name is already in localStorage", async () => {
    localStorageMock.setItem("guest_name", "John");
    localStorageMock.setItem("session_token", "tok-existing");
    localStorageMock.setItem("invitation_seen", "true");
    vi.useFakeTimers();
    vi.setSystemTime(DAY_BEFORE);
    const { usePhase } = await import("@/lib/usePhase");
    renderHook(() => usePhase());
    await act(async () => { await vi.runAllTimersAsync(); });
    // Settings fetch may be called, but the session check (/api/session POST) must not be
    expect(global.fetch).not.toHaveBeenCalledWith("/api/session", expect.anything());
  });
});
