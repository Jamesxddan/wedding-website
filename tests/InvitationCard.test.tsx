import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

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

import InvitationCard from "@/components/phases/InvitationCard";

describe("InvitationCard", () => {
  beforeEach(() => { localStorageMock.clear(); exploreMock.mockClear(); });

  it("renders personalised greeting with guest name", () => {
    render(<InvitationCard guestName="James" onExplore={exploreMock} />);
    expect(screen.getByText(/Dear James/)).toBeInTheDocument();
  });

  it("renders the wedding details", () => {
    render(<InvitationCard guestName="Sharon" onExplore={exploreMock} />);
    expect(screen.getByText(/October 8th, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/St Andrews Kirk/)).toBeInTheDocument();
  });

  it("renders Google Calendar link", () => {
    render(<InvitationCard guestName="James" onExplore={exploreMock} />);
    expect(screen.getByRole("link", { name: /google calendar/i })).toBeInTheDocument();
  });

  it("renders Apple / Windows calendar download link", () => {
    render(<InvitationCard guestName="James" onExplore={exploreMock} />);
    expect(screen.getByRole("link", { name: /apple.*windows/i })).toBeInTheDocument();
  });

  it("sets invitation_seen and calls onExplore when Explore button clicked", () => {
    render(<InvitationCard guestName="James" onExplore={exploreMock} />);
    fireEvent.click(screen.getByRole("button", { name: /explore the wedding/i }));
    expect(localStorageMock.getItem("invitation_seen")).toBe("true");
    expect(exploreMock).toHaveBeenCalledOnce();
  });
});
