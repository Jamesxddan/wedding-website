import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/constants", () => ({
  WEDDING_DATE: new Date("2026-10-08T00:00:00+05:30"),
  MUSIC_URL: "",
}));

// Stub canvas-based components to avoid WebGL/Canvas errors in jsdom
vi.mock("@/components/ui/ParticleCanvas", () => ({ default: () => null }));
vi.mock("@/components/ui/CinematicSlideshow", () => ({ default: () => null }));

import CountdownHero from "@/components/phases/CountdownHero";

describe("CountdownHero", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-04T00:00:00Z"));
    // Stub fetch for drive photos
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ photos: [], configured: false }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the couple names", () => {
    render(<CountdownHero guestName="James" />);
    // SplitText renders each name with aria-label; the & separator is aria-hidden
    expect(document.querySelector('[aria-label="James"]')).toBeInTheDocument();
    expect(document.querySelector('[aria-label="Sharon"]')).toBeInTheDocument();
  });

  it("renders personalised greeting", () => {
    render(<CountdownHero guestName="Arun" />);
    expect(screen.getByText(/Counting down with you, Arun/)).toBeInTheDocument();
  });

  it("renders countdown unit labels", () => {
    render(<CountdownHero guestName="James" />);
    expect(screen.getByText(/^days$/i)).toBeInTheDocument();
    expect(screen.getByText(/^hours$/i)).toBeInTheDocument();
    expect(screen.getByText(/^minutes$/i)).toBeInTheDocument();
    expect(screen.getByText(/^seconds$/i)).toBeInTheDocument();
  });

  it("renders non-zero days until wedding", async () => {
    render(<CountdownHero guestName="James" />);
    // Let the count-up animation complete (animates over 1500ms via rAF)
    await act(async () => { vi.advanceTimersByTime(2000); });
    const days = screen.getByText(/^days$/i).closest("div")?.querySelector("span");
    expect(Number(days?.textContent)).toBeGreaterThan(0);
  });

  it("ticks every second", () => {
    render(<CountdownHero guestName="James" />);
    const secondsEl = screen.getByText(/^seconds$/i).closest("div")?.querySelector("span");
    expect(secondsEl).toBeDefined();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(secondsEl?.textContent).toBeDefined();
  });

  it("renders the nav", () => {
    render(<CountdownHero guestName="James" />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });
});
