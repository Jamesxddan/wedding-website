import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Phase } from "@/lib/phase";

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

import { usePhase } from "@/lib/usePhase";
import Home from "@/app/page";

const mockUsePhase = vi.mocked(usePhase);

describe("Home routing shell", () => {
  it("renders loading state when isLoading is true", () => {
    mockUsePhase.mockReturnValue({ phase: Phase.FIRST_VISIT, guestName: null, guestCity: null, isLoading: true, refresh: vi.fn(), sessionRestored: false });
    render(<Home />);
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });

  it("renders first visit form when FIRST_VISIT", () => {
    mockUsePhase.mockReturnValue({ phase: Phase.FIRST_VISIT, guestName: null, guestCity: null, isLoading: false, refresh: vi.fn(), sessionRestored: false });
    render(<Home />);
    expect(screen.getByText(/James & Sharon/)).toBeInTheDocument();
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
