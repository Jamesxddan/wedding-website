import { describe, it, expect, vi, beforeEach } from "vitest";

describe("getBrowserSignalsHash", () => {
  beforeEach(() => { vi.resetModules(); });

  it("returns a 64-char hex SHA-256 string", async () => {
    const { getBrowserSignalsHash } = await import("@/lib/fingerprint");
    const hash = await getBrowserSignalsHash();
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns the same hash on repeated calls in the same environment", async () => {
    const { getBrowserSignalsHash } = await import("@/lib/fingerprint");
    const h1 = await getBrowserSignalsHash();
    const h2 = await getBrowserSignalsHash();
    expect(h1).toBe(h2);
  });
});

describe("getOrCreateDeviceUUID", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    document.cookie = "device_uuid=; max-age=0; path=/";
  });

  it("generates a valid UUID when nothing is stored", async () => {
    const { getOrCreateDeviceUUID } = await import("@/lib/fingerprint");
    const uuid = await getOrCreateDeviceUUID();
    expect(uuid).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("returns the same UUID on repeated calls (localStorage cache)", async () => {
    const { getOrCreateDeviceUUID } = await import("@/lib/fingerprint");
    const uuid1 = await getOrCreateDeviceUUID();
    const uuid2 = await getOrCreateDeviceUUID();
    expect(uuid1).toBe(uuid2);
  });

  it("recovers UUID from localStorage", async () => {
    localStorage.setItem("device_uuid", "test-uuid-1234");
    const { getOrCreateDeviceUUID } = await import("@/lib/fingerprint");
    const uuid = await getOrCreateDeviceUUID();
    expect(uuid).toBe("test-uuid-1234");
  });
});
