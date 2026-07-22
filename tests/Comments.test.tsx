import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import Comments from "@/components/sections/Comments";

describe("Comments", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  it("renders the section heading", () => {
    render(<Comments />);
    expect(screen.getByText("Wishes & Messages")).toBeInTheDocument();
  });

  it("renders empty state when no comments", async () => {
    render(<Comments />);
    expect(await screen.findByText("Be the first to leave a wish! 💌")).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    render(<Comments />);
    expect(screen.getByText(/Leave a message for James & Sharon/)).toBeInTheDocument();
  });
});
