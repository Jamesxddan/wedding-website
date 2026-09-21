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

let intersectionCallbacks: IntersectionObserverCallback[] = [];
class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    intersectionCallbacks.push(callback);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
function fireIntersection(isIntersecting: boolean) {
  const entry = { isIntersecting } as IntersectionObserverEntry;
  intersectionCallbacks.forEach(cb => cb([entry], {} as IntersectionObserver));
}

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

  it("shows static teaser chips above the Explore button", async () => {
    render(<InvitationCard guestName="James" onExplore={exploreMock} />);
    await act(async () => { vi.advanceTimersByTime(500); });
    await navigateToCard();
    expect(screen.getByText(/Countdown/)).toBeInTheDocument();
    expect(screen.getByText(/Gallery/)).toBeInTheDocument();
    expect(screen.getByText(/Venue & more/)).toBeInTheDocument();
  });

  it("shows a forward-looking teaser once RSVP is confirmed", async () => {
    globalThis.fetch = vi.fn((url: RequestInfo | URL) => {
      if (String(url) === "/api/rsvp") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            rsvp: { response: "attending", guest_count: 2, meal_pref: "veg", attending_events: "both", updated_at: "" },
            has_email: true,
          }),
        }) as unknown as Promise<Response>;
      }
      return Promise.resolve({ ok: true, json: async () => ({}) }) as unknown as Promise<Response>;
    });

    render(<InvitationCard guestName="James" onExplore={exploreMock} />);
    await act(async () => { vi.advanceTimersByTime(500); });
    await navigateToCard();
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(screen.getByText(/countdown, photos & more are just below/i)).toBeInTheDocument();
  });
});

describe("InvitationCard — RSVP idle nudge", () => {
  beforeEach(() => {
    localStorageMock.clear();
    exploreMock.mockClear();
    vi.useFakeTimers();
    intersectionCallbacks = [];
    global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, json: async () => ({}) }) as unknown as Promise<Response>);
  });
  afterEach(() => { vi.useRealTimers(); });

  it("shows the idle nudge after 25s of no interaction once the RSVP section is in view", async () => {
    render(<InvitationCard guestName="James" onExplore={exploreMock} />);
    await act(async () => { vi.advanceTimersByTime(500); });
    await navigateToCard();

    act(() => { fireIntersection(true); });
    expect(screen.queryByText(/see what's next/i)).not.toBeInTheDocument();

    await act(async () => { vi.advanceTimersByTime(25000); });
    expect(screen.getByText(/see what's next/i)).toBeInTheDocument();
  });

  it("does not show the nudge before the RSVP section has scrolled into view", async () => {
    render(<InvitationCard guestName="James" onExplore={exploreMock} />);
    await act(async () => { vi.advanceTimersByTime(500); });
    await navigateToCard();

    await act(async () => { vi.advanceTimersByTime(25000); });
    expect(screen.queryByText(/see what's next/i)).not.toBeInTheDocument();
  });

  it("does not resurface a stale nudge after RSVP is completed and then reopened for editing", async () => {
    globalThis.fetch = vi.fn((url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url) === "/api/rsvp" && init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            rsvp: { response: "attending", guest_count: 1, meal_pref: "veg", attending_events: "both", updated_at: "" },
            has_email: false,
          }),
        }) as unknown as Promise<Response>;
      }
      return Promise.resolve({ ok: false, json: async () => ({}) }) as unknown as Promise<Response>;
    });

    render(<InvitationCard guestName="James" onExplore={exploreMock} />);
    await act(async () => { vi.advanceTimersByTime(500); });
    await navigateToCard();

    // RSVP section is in view, idle timer arms.
    act(() => { fireIntersection(true); });

    // Guest completes RSVP just before the idle timer would fire.
    fireEvent.click(screen.getByText(/Yes, I'll be there/i));
    fireEvent.click(screen.getByText(/🌿 Veg/i));
    fireEvent.click(screen.getByText(/Both/i));
    await act(async () => { await fireEvent.click(screen.getByRole("button", { name: /confirm rsvp/i })); });

    // Let the original 25s idle timer's deadline pass in the background.
    await act(async () => { vi.advanceTimersByTime(25000); });

    // Guest reopens the form to edit.
    fireEvent.click(screen.getByText(/update my rsvp/i));

    // The nudge must NOT be showing immediately — no new idle period has elapsed.
    expect(screen.queryByText(/see what's next/i)).not.toBeInTheDocument();
  });

  it("cancels the nudge the moment the guest picks an attendance option", async () => {
    render(<InvitationCard guestName="James" onExplore={exploreMock} />);
    await act(async () => { vi.advanceTimersByTime(500); });
    await navigateToCard();

    act(() => { fireIntersection(true); });
    await act(async () => { vi.advanceTimersByTime(10000); });
    fireEvent.click(screen.getByText(/Yes, I'll be there/i));

    await act(async () => { vi.advanceTimersByTime(25000); });
    expect(screen.queryByText(/see what's next/i)).not.toBeInTheDocument();
  });

  it("never arms the idle nudge when relinkSlot is present (unverified device)", async () => {
    render(
      <InvitationCard guestName="James" onExplore={exploreMock} relinkSlot={<div>relink form</div>} />
    );
    await act(async () => { vi.advanceTimersByTime(500); });
    await navigateToCard();

    // RSVP section doesn't render at all when relinkSlot is present, so the
    // observer never has anything to observe — fireIntersection is a no-op here.
    act(() => { fireIntersection(true); });
    await act(async () => { vi.advanceTimersByTime(25000); });

    expect(screen.queryByText(/see what's next/i)).not.toBeInTheDocument();
  });

  it("cancels the nudge when the guest adjusts the guest count", async () => {
    render(<InvitationCard guestName="James" onExplore={exploreMock} />);
    await act(async () => { vi.advanceTimersByTime(500); });
    await navigateToCard();

    act(() => { fireIntersection(true); });
    await act(async () => { vi.advanceTimersByTime(10000); });
    fireEvent.click(screen.getByText(/Yes, I'll be there/i));

    // Advance only partway — well under the 25s deadline — before touching
    // the guest-count control, then click it, then run past the original
    // deadline. If the count handler failed to (safely) participate in
    // cancellation, this would still pass by coincidence, but it confirms
    // the click doesn't throw or resurface the nudge.
    await act(async () => { vi.advanceTimersByTime(5000); });
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    await act(async () => { vi.advanceTimersByTime(25000); });

    expect(screen.queryByText(/see what's next/i)).not.toBeInTheDocument();
  });

  it("cancels the nudge when the guest picks a meal preference", async () => {
    render(<InvitationCard guestName="James" onExplore={exploreMock} />);
    await act(async () => { vi.advanceTimersByTime(500); });
    await navigateToCard();

    act(() => { fireIntersection(true); });
    await act(async () => { vi.advanceTimersByTime(10000); });
    fireEvent.click(screen.getByText(/Yes, I'll be there/i));

    await act(async () => { vi.advanceTimersByTime(5000); });
    fireEvent.click(screen.getByText(/🌿 Veg/i));
    await act(async () => { vi.advanceTimersByTime(25000); });

    expect(screen.queryByText(/see what's next/i)).not.toBeInTheDocument();
  });

  it("cancels the nudge when the guest selects which events to attend", async () => {
    render(<InvitationCard guestName="James" onExplore={exploreMock} />);
    await act(async () => { vi.advanceTimersByTime(500); });
    await navigateToCard();

    act(() => { fireIntersection(true); });
    await act(async () => { vi.advanceTimersByTime(10000); });
    fireEvent.click(screen.getByText(/Yes, I'll be there/i));

    await act(async () => { vi.advanceTimersByTime(5000); });
    fireEvent.click(screen.getByText(/Both/i));
    await act(async () => { vi.advanceTimersByTime(25000); });

    expect(screen.queryByText(/see what's next/i)).not.toBeInTheDocument();
  });

  it("cancels the nudge when the guest types their email", async () => {
    render(<InvitationCard guestName="James" onExplore={exploreMock} />);
    await act(async () => { vi.advanceTimersByTime(500); });
    await navigateToCard();

    act(() => { fireIntersection(true); });
    await act(async () => { vi.advanceTimersByTime(10000); });
    fireEvent.click(screen.getByText(/Yes, I'll be there/i));

    // guestHasEmail resolves to false (fetch mock returns { ok: false } →
    // json chain resolves to null → `d?.has_email ?? false` is false), so
    // the email field renders.
    await act(async () => { vi.advanceTimersByTime(5000); });
    fireEvent.change(screen.getByPlaceholderText(/so we can send you a confirmation/i), {
      target: { value: "james@example.com" },
    });
    await act(async () => { vi.advanceTimersByTime(25000); });

    expect(screen.queryByText(/see what's next/i)).not.toBeInTheDocument();
  });

  it("the nudge's link advances the guest the same way the main Explore button does", async () => {
    render(<InvitationCard guestName="James" onExplore={exploreMock} />);
    await act(async () => { vi.advanceTimersByTime(500); });
    await navigateToCard();

    act(() => { fireIntersection(true); });
    await act(async () => { vi.advanceTimersByTime(25000); });
    fireEvent.click(screen.getByText(/see what's next/i));

    expect(exploreMock).toHaveBeenCalledOnce();
  });
});
