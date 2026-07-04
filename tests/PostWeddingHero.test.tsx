import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/components/sections/Gallery", () => ({ default: () => <div>Gallery</div> }));
vi.mock("@/components/sections/Comments", () => ({ default: () => <div>Comments</div> }));
vi.mock("@giscus/react", () => ({ default: () => null }));
vi.mock("@/components/sections/YoutubeComments", () => ({ default: () => null }));
global.fetch = vi.fn().mockResolvedValue({ json: async () => ({ photos: [], configured: false }) });

describe("PostWeddingHero — no highlights video", () => {
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
  it("renders iframe when HIGHLIGHTS_VIDEO_URL is set", async () => {
    vi.doMock("@/lib/constants", () => ({
      HIGHLIGHTS_VIDEO_URL: "https://www.youtube.com/watch?v=test123",
      GISCUS_CONFIG: { repo: "Jamesxddan/wedding-website", repoId: "R_kgDOTNgUhA", category: "General", categoryId: "DIC_kwDOTNgUhM4DAe_R" },
      YOUTUBE_COMMENT_VIDEO_ID: "",
    }));
    const { default: PostWeddingHero } = await import("@/components/phases/PostWeddingHero?v=highlights");
    render(<PostWeddingHero guestName="James" />);
    expect(screen.getByTitle("Wedding Highlights")).toBeInTheDocument();
    expect(screen.getByText("Wedding Highlights")).toBeInTheDocument();
  });
});
