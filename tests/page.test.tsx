import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { Phase } from "@/lib/phase";

beforeAll(() => {
  // jsdom doesn't implement ResizeObserver (used by OpeningScreen canvas)
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

vi.mock("@/lib/usePhase", () => ({ usePhase: vi.fn() }));
vi.mock("@/components/phases/CountdownHero", () => ({
  default: ({ guestName, sessionRestored }: { guestName: string; sessionRestored?: boolean }) => (
    <div>Welcome back, {guestName}!</div>
  ),
}));
vi.mock("@/components/sections/Gallery", () => ({ default: () => <div>Gallery</div> }));
vi.mock("@/components/sections/OurStory", () => ({ default: () => <div>Our Story</div> }));
vi.mock("@/components/sections/AboutJames", () => ({ default: () => <div>About James</div> }));
vi.mock("@/components/sections/AboutSharon", () => ({ default: () => <div>About Sharon</div> }));
vi.mock("@/components/sections/Families", () => ({ default: () => <div>Families</div> }));
vi.mock("@/components/sections/Venue", () => ({ default: () => <div>Venue</div> }));
vi.mock("@/components/sections/Itinerary", () => ({ default: () => <div>Itinerary</div> }));
vi.mock("@/components/phases/WeddingDayBanner", () => ({
  default: ({ guestName }: { guestName: string }) => <div>Wedding Day — {guestName}</div>,
}));
vi.mock("@/components/phases/PostWeddingHero", () => ({
  default: ({ guestName }: { guestName: string }) => <div>Post Wedding — {guestName}</div>,
}));
vi.mock("@/components/ui/Footer", () => ({ default: () => <footer>Footer</footer> }));
vi.mock("@/components/ui/BackgroundMusic", () => ({ default: () => null }));
vi.mock("@/components/ui/Marquee", () => ({ default: () => null }));
vi.mock("@/components/ui/Reveal", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/sections/Comments", () => ({ default: () => null }));

import { usePhase } from "@/lib/usePhase";
import Home from "@/app/page";

const mockUsePhase = vi.mocked(usePhase);

describe("Home routing shell", () => {
  it("renders loading state when isLoading is true", () => {
    mockUsePhase.mockReturnValue({ phase: Phase.FIRST_VISIT, guestName: null, guestCity: null, isLoading: true, refresh: vi.fn(), sessionRestored: false });
    render(<Home />);
    expect(screen.getByText(/preparing your invitation/i)).toBeInTheDocument();
  });

  it("renders first visit form when FIRST_VISIT", () => {
    mockUsePhase.mockReturnValue({ phase: Phase.FIRST_VISIT, guestName: null, guestCity: null, isLoading: false, refresh: vi.fn(), sessionRestored: false });
    render(<Home />);
    // "James" and "Sharon" are split across separate elements — check each individually
    expect(screen.getByText("James")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/your name/i)).toBeInTheDocument();
  });

  it("renders Phase 2 placeholder with guest name when RETURN_VISIT", () => {
    mockUsePhase.mockReturnValue({ phase: Phase.RETURN_VISIT, guestName: "John", guestCity: "Chennai", isLoading: false, refresh: vi.fn(), sessionRestored: false });
    render(<Home />);
    expect(screen.getByText(/Welcome back, John/)).toBeInTheDocument();
  });

  it("renders wedding day banner when WEDDING_DAY", () => {
    mockUsePhase.mockReturnValue({ phase: Phase.WEDDING_DAY, guestName: "John", guestCity: null, isLoading: false, refresh: vi.fn(), sessionRestored: false });
    render(<Home />);
    expect(screen.getByText(/Wedding Day — John/)).toBeInTheDocument();
  });

  it("renders post-wedding hero when POST_WEDDING", () => {
    mockUsePhase.mockReturnValue({ phase: Phase.POST_WEDDING, guestName: "John", guestCity: null, isLoading: false, refresh: vi.fn(), sessionRestored: false });
    render(<Home />);
    expect(screen.getByText(/Post Wedding — John/)).toBeInTheDocument();
  });
});
