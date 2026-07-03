import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Nav from "@/components/ui/Nav";

describe("Nav", () => {
  it("renders the couple monogram", () => {
    render(<Nav />);
    expect(screen.getByText(/J & S/)).toBeInTheDocument();
  });

  it("renders all nav links", () => {
    render(<Nav />);
    expect(screen.getByRole("link", { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /our story/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /gallery/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /venue/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /families/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /comments/i })).toBeInTheDocument();
  });
});
