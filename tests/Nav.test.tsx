import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Nav from "@/components/ui/Nav";

describe("Nav", () => {
  it("renders the couple monogram", () => {
    render(<Nav />);
    expect(screen.getByText(/J & S/)).toBeInTheDocument();
  });

  it("renders all nav links (desktop + mobile duplicates)", () => {
    render(<Nav />);
    // Each link appears twice: desktop list + mobile list
    expect(screen.getAllByRole("link", { name: /home/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /our story/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /gallery/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /venue/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /families/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /comments/i }).length).toBeGreaterThan(0);
  });

  it("hamburger button toggles aria-expanded", () => {
    render(<Nav />);
    const btn = screen.getByRole("button", { name: /open menu/i });
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
  });
});
