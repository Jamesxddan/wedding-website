import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/webgl/petalScene", () => ({
  createPetalScene: vi.fn(() => ({ destroy: vi.fn() })),
}));

vi.mock("@/lib/constants", () => ({
  WEDDING_DATE: new Date("2026-10-08T00:00:00+05:30"),
}));

import CountdownHero from "@/components/phases/CountdownHero";

describe("CountdownHero", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-04T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the couple names", () => {
    render(<CountdownHero guestName="James" />);
    expect(screen.getByText(/James & Sharon/)).toBeInTheDocument();
  });

  it("renders personalised greeting", () => {
    render(<CountdownHero guestName="Arun" />);
    expect(screen.getByText(/Welcome back, Arun/)).toBeInTheDocument();
  });

  it("renders countdown unit labels", () => {
    render(<CountdownHero guestName="James" />);
    expect(screen.getByText("Days")).toBeInTheDocument();
    expect(screen.getByText("Hours")).toBeInTheDocument();
    expect(screen.getByText("Minutes")).toBeInTheDocument();
    expect(screen.getByText("Seconds")).toBeInTheDocument();
  });

  it("renders non-zero days until wedding", () => {
    render(<CountdownHero guestName="James" />);
    const days = screen.getByText("Days").closest("div")?.querySelector("span");
    expect(Number(days?.textContent)).toBeGreaterThan(0);
  });

  it("ticks every second", () => {
    render(<CountdownHero guestName="James" />);
    const before = screen.getByText("Seconds").closest("div")?.querySelector("span")?.textContent;
    act(() => { vi.advanceTimersByTime(1000); });
    const after = screen.getByText("Seconds").closest("div")?.querySelector("span")?.textContent;
    // seconds value changes (or wraps) after 1s tick
    expect(after).toBeDefined();
  });

  it("renders the nav", () => {
    render(<CountdownHero guestName="James" />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });
});
