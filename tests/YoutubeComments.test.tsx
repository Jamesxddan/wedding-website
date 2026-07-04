import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchMock = vi.fn();
global.fetch = fetchMock;

import YoutubeComments from "@/components/sections/YoutubeComments";

const SAMPLE_COMMENT = {
  id: "c1",
  authorName: "John",
  authorAvatar: "/avatar.jpg",
  text: "Congratulations! 🎉",
  likeCount: 5,
  publishedAt: new Date(Date.now() - 86400000).toISOString(),
};

describe("YoutubeComments", () => {
  beforeEach(() => fetchMock.mockClear());

  it("renders nothing when not configured", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ comments: [], configured: false }),
    });
    const { container } = render(<YoutubeComments />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when configured but no comments", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ comments: [], configured: true }),
    });
    const { container } = render(<YoutubeComments />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it("renders YouTube comments when available", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ comments: [SAMPLE_COMMENT], configured: true }),
    });
    render(<YoutubeComments />);
    await waitFor(() => expect(screen.getByText("John")).toBeInTheDocument());
    expect(screen.getByText(/YouTube Comments/)).toBeInTheDocument();
  });

  it("shows like count", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ comments: [SAMPLE_COMMENT], configured: true }),
    });
    render(<YoutubeComments />);
    await waitFor(() => screen.getByText("John"));
    expect(screen.getByText(/♥ 5/)).toBeInTheDocument();
  });

  it("shows relative time", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ comments: [SAMPLE_COMMENT], configured: true }),
    });
    render(<YoutubeComments />);
    await waitFor(() => screen.getByText("yesterday"));
  });
});

describe("fetchYoutubeComments", () => {
  beforeEach(() => fetchMock.mockClear());

  it("maps API response to YoutubeComment objects", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "thread1",
            snippet: {
              topLevelComment: {
                snippet: {
                  authorDisplayName: "Alice",
                  authorProfileImageUrl: "/a.jpg",
                  textDisplay: "Beautiful!",
                  likeCount: 3,
                  publishedAt: "2026-01-01T00:00:00Z",
                },
              },
            },
          },
        ],
      }),
    });

    const { fetchYoutubeComments } = await import("@/lib/youtube");
    const results = await fetchYoutubeComments("vid123", "key123");
    expect(results).toHaveLength(1);
    expect(results[0].authorName).toBe("Alice");
    expect(results[0].likeCount).toBe(3);
  });

  it("throws on non-ok response", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });
    const { fetchYoutubeComments } = await import("@/lib/youtube");
    await expect(fetchYoutubeComments("vid", "key")).rejects.toThrow("403");
  });
});
