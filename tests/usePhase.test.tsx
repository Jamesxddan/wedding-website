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

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("usePhase", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.useRealTimers();
    vi.resetModules();
  });

  it("returns FIRST_VISIT when localStorage has no guest_name", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(DAY_BEFORE);
    const { usePhase } = await import("@/lib/usePhase");
    const { result } = renderHook(() => usePhase());
    await act(async () => {});
    expect(result.current.phase).toBe(Phase.FIRST_VISIT);
    expect(result.current.guestName).toBeNull();
  });

  it("returns RETURN_VISIT when name is set and date is before wedding", async () => {
    localStorageMock.setItem("guest_name", "John");
    vi.useFakeTimers();
    vi.setSystemTime(DAY_BEFORE);
    const { usePhase } = await import("@/lib/usePhase");
    const { result } = renderHook(() => usePhase());
    await act(async () => {});
    expect(result.current.phase).toBe(Phase.RETURN_VISIT);
    expect(result.current.guestName).toBe("John");
  });

  it("returns POST_WEDDING when name is set and date is after wedding", async () => {
    localStorageMock.setItem("guest_name", "John");
    vi.useFakeTimers();
    vi.setSystemTime(DAY_AFTER);
    const { usePhase } = await import("@/lib/usePhase");
    const { result } = renderHook(() => usePhase());
    await act(async () => {});
    expect(result.current.phase).toBe(Phase.POST_WEDDING);
  });
});
