import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/components/sections/Gallery", () => ({ default: () => <div>Gallery</div> }));
vi.mock("@/components/sections/Comments", () => ({ default: () => <div>Comments</div> }));
vi.mock("@giscus/react", () => ({ default: () => null }));
vi.mock("@/components/sections/YoutubeComments", () => ({ default: () => null }));

describe("PostWeddingHero — no highlights video", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ json: async () => ({}) });
  });

  it("renders the couple title", async () => {
    const { default: PostWeddingHero } = await import("@/components/phases/PostWeddingHero");
    render(<PostWeddingHero guestName="James" />);
    expect(screen.getByText(/Mr & Mrs James Daniel/)).toBeInTheDocument();
  });

  it("renders personalised greeting", async () => {
    const { default: PostWeddingHero } = await import("@/components/phases/PostWeddingHero");
    render(<PostWeddingHero guestName="Arun" />);
    expect(screen.getByText(/Dear Arun/)).toBeInTheDocument();
  });

  it("renders the thank-you message", async () => {
    const { default: PostWeddingHero } = await import("@/components/phases/PostWeddingHero");
    render(<PostWeddingHero guestName="James" />);
    expect(screen.getByText(/thank you for your presence/i)).toBeInTheDocument();
  });

  it("shows highlights placeholder when no URL configured", async () => {
    const { default: PostWeddingHero } = await import("@/components/phases/PostWeddingHero");
    render(<PostWeddingHero guestName="James" />);
    expect(screen.getByText(/highlights coming soon/i)).toBeInTheDocument();
  });

  it("renders the nav", async () => {
    const { default: PostWeddingHero } = await import("@/components/phases/PostWeddingHero");
    render(<PostWeddingHero guestName="James" />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });
});

describe("PostWeddingHero — with highlights video", () => {
  it("renders iframe when highlights_video_url is set via settings", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ highlights_video_url: "https://www.youtube.com/watch?v=test123" }),
    });
    const { default: PostWeddingHero } = await import("@/components/phases/PostWeddingHero");
    const { rerender } = render(<PostWeddingHero guestName="James" />);
    // Wait for the fetch to resolve and state to update
    await vi.waitFor(() => expect(screen.queryByTitle("Wedding Highlights")).toBeInTheDocument());
    rerender(<PostWeddingHero guestName="James" />);
    expect(screen.getByText("Wedding Highlights")).toBeInTheDocument();
  });
});
