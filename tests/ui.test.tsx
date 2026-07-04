import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Footer from "@/components/ui/Footer";
import Reveal from "@/components/ui/Reveal";
import FloralAccent from "@/components/ui/FloralAccent";

// ── Footer ────────────────────────────────────────────────────────────────────

describe("Footer", () => {
  it("renders couple name and date", () => {
    render(<Footer />);
    expect(screen.getByText("James & Sharon")).toBeInTheDocument();
    expect(screen.getByText(/October 8th, 2026/)).toBeInTheDocument();
  });

  it("renders tagline", () => {
    render(<Footer />);
    expect(screen.getByText(/God's will was on our marriage/)).toBeInTheDocument();
  });
});

// ── Reveal ────────────────────────────────────────────────────────────────────

describe("Reveal", () => {
  it("renders children", () => {
    render(<Reveal><p>hello</p></Reveal>);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("starts with reveal class (hidden)", () => {
    const { container } = render(<Reveal><p>test</p></Reveal>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.classList.contains("reveal")).toBe(true);
    expect(wrapper.classList.contains("visible")).toBe(false);
  });
});

// ── FloralAccent ──────────────────────────────────────────────────────────────

describe("FloralAccent", () => {
  it("renders an SVG", () => {
    const { container } = render(<FloralAccent />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("is aria-hidden", () => {
    const { container } = render(<FloralAccent />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.getAttribute("aria-hidden")).toBe("true");
  });

  it("applies custom size", () => {
    const { container } = render(<FloralAccent size={200} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("200");
    expect(svg.getAttribute("height")).toBe("200");
  });
});

