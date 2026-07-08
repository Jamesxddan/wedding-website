import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchMock = vi.fn();
global.fetch = fetchMock;

import { fetchDrivePhotos } from "@/lib/drive";

describe("fetchDrivePhotos", () => {
  beforeEach(() => fetchMock.mockClear());

  it("returns mapped photo objects", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        files: [
          { id: "abc123", name: "wedding.jpg", mimeType: "image/jpeg" },
          { id: "def456", name: "couple.jpg", mimeType: "image/jpeg" },
        ],
      }),
    });

    const photos = await fetchDrivePhotos("folder_id", "api_key");
    expect(photos).toHaveLength(2);
    expect(photos[0].id).toBe("abc123");
    expect(photos[0].thumbnailUrl).toContain("abc123");
    expect(photos[0].fullUrl).toContain("abc123");
  });

  it("throws on non-ok response", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => '{"error":{"code":403}}',
    });
    await expect(fetchDrivePhotos("folder_id", "api_key")).rejects.toThrow("403");
  });

  it("returns empty array when files list is missing", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    const photos = await fetchDrivePhotos("folder_id", "api_key");
    expect(photos).toHaveLength(0);
  });

  it("includes the folder id and api key in the request URL", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ files: [] }),
    });
    await fetchDrivePhotos("MY_FOLDER", "MY_KEY");
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("MY_FOLDER");
    expect(url).toContain("MY_KEY");
  });
});
