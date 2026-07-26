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
    expect(screen.getByText("Wall of Love")).toBeInTheDocument();
  });

  it("renders empty state when no comments", async () => {
    render(<Comments />);
    expect(await screen.findByText("No messages yet — be the first blessing!")).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    render(<Comments />);
    expect(screen.getByText(/Leave your blessings for James & Sharon/)).toBeInTheDocument();
  });
});
