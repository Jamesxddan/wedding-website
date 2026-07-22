import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const exploreMock = vi.fn();

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

vi.mock("@/components/webgl/PetalScene", () => ({ default: () => null }));
vi.mock("@/lib/SiteContentContext", () => ({
  useSiteContent: () => ({
    invitation: {
      couple_name: "James Daniel & Sharon",
      date: "October 8th (Thursday), 2026",
      time: "10:00 AM",
      ceremony_label: "Ceremony",
      ceremony_line: "St. Andrew's Kirk, Egmore, Chennai",
      reception_label: "Reception",
      reception_line: "BKN Auditorium, Ritherdon Road, Vepery, Chennai",
      scripture: "Love is patient",
      scripture_ref: "1 Cor 13:4",
      hosts_groom: "The Daniel Family",
      hosts_bride: "The Sharon Family",
      body: "Join us for our celebration",
      presence_line: "Your presence is our greatest joy",
      explore_btn: "Explore the wedding website",
    },
  }),
}));
vi.mock("@/lib/useSelectPhotos", () => ({
  useSelectPhotos: () => ({ byName: () => null }),
}));

import InvitationCard from "@/components/phases/InvitationCard";

async function navigateToCard() {
  // Click envelope front → flip animation starts
  // Text is "tap to open" or "click to open" depending on isMobile
  fireEvent.click(screen.getByText(/to open$/i));
  // Advance past flip (310ms to stage=back, 640ms for idle)
  await act(async () => { vi.advanceTimersByTime(700); });
  // Click back (seal) → open animation starts
  fireEvent.click(screen.getByText(/the seal to open/i));
  // Advance past open animation (1550ms for stage=card)
  await act(async () => { vi.advanceTimersByTime(1600); });
}

describe("InvitationCard", () => {
  beforeEach(() => {
    localStorageMock.clear();
    exploreMock.mockClear();
    vi.useFakeTimers();
  });
  afterEach(() => { vi.useRealTimers(); });

  it("renders personalised greeting with guest name", async () => {
    render(<InvitationCard guestName="James" onExplore={exploreMock} />);
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(screen.getByText("James")).toBeInTheDocument();
  });

  it("renders the wedding details", async () => {
    render(<InvitationCard guestName="Sharon" onExplore={exploreMock} />);
    await act(async () => { vi.advanceTimersByTime(500); });
    await navigateToCard();
    expect(screen.getByText(/October 8th/)).toBeInTheDocument();
    expect(screen.getByText(/Andrew/)).toBeInTheDocument();
  });

  it("renders Google Calendar link", async () => {
    render(<InvitationCard guestName="James" onExplore={exploreMock} />);
    await act(async () => { vi.advanceTimersByTime(500); });
    await navigateToCard();
    expect(screen.getByRole("link", { name: /google calendar/i })).toBeInTheDocument();
  });

  it("renders Apple / Windows calendar download link", async () => {
    render(<InvitationCard guestName="James" onExplore={exploreMock} />);
    await act(async () => { vi.advanceTimersByTime(500); });
    await navigateToCard();
    expect(screen.getByRole("link", { name: /apple.*windows/i })).toBeInTheDocument();
  });

  it("sets invitation_seen and calls onExplore when Explore button clicked", async () => {
    render(<InvitationCard guestName="James" onExplore={exploreMock} />);
    await act(async () => { vi.advanceTimersByTime(500); });
    await navigateToCard();
    fireEvent.click(screen.getByRole("button", { name: /explore the wedding/i }));
    expect(localStorageMock.getItem("invitation_seen")).toBe("true");
    expect(exploreMock).toHaveBeenCalledOnce();
  });
});
