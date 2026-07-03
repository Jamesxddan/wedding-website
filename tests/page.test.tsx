import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Home from "@/app/page";

describe("Home page", () => {
  it("renders the couple's names", () => {
    render(<Home />);
    expect(screen.getByText(/James Daniel/)).toBeInTheDocument();
    expect(screen.getByText(/Sharon/)).toBeInTheDocument();
  });

  it("renders the wedding date", () => {
    render(<Home />);
    expect(screen.getByText(/October 8th, 2026/)).toBeInTheDocument();
  });
});
