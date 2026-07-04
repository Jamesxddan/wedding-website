import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@giscus/react", () => ({
  default: () => <div data-testid="giscus-widget" />,
}));

// YoutubeComments fetches on mount — mock fetch so it doesn't hang
vi.mock("@/components/sections/YoutubeComments", () => ({
  default: () => null,
}));

import Comments from "@/components/sections/Comments";

describe("Comments", () => {
  it("renders the section heading", () => {
    render(<Comments />);
    expect(screen.getByText("Leave a Blessing")).toBeInTheDocument();
  });

  it("renders the Giscus widget (config is live)", () => {
    render(<Comments />);
    expect(screen.getByTestId("giscus-widget")).toBeInTheDocument();
  });

  it("renders the tagline", () => {
    render(<Comments />);
    expect(screen.getByText(/your words mean the world/i)).toBeInTheDocument();
  });
});
