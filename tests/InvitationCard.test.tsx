import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const reloadMock = vi.fn();
Object.defineProperty(window, "location", { value: { reload: reloadMock }, writable: true });

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
  beforeEach(() => { localStorageMock.clear(); reloadMock.mockClear(); });

  it("renders personalised greeting with guest name", () => {
    render(<InvitationCard guestName="James" />);
    expect(screen.getByText(/Dear James/)).toBeInTheDocument();
  });

  it("renders the wedding details", () => {
    render(<InvitationCard guestName="Sharon" />);
    expect(screen.getByText(/October 8th, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/St Andrews Kirk/)).toBeInTheDocument();
  });

  it("renders Google Calendar link", () => {
    render(<InvitationCard guestName="James" />);
    expect(screen.getByRole("link", { name: /google calendar/i })).toBeInTheDocument();
  });

  it("renders Apple / Windows calendar download link", () => {
    render(<InvitationCard guestName="James" />);
    expect(screen.getByRole("link", { name: /apple.*windows/i })).toBeInTheDocument();
  });

  it("sets invitation_seen and reloads when Explore button clicked", () => {
    render(<InvitationCard guestName="James" />);
    fireEvent.click(screen.getByRole("button", { name: /explore the wedding/i }));
    expect(localStorageMock.getItem("invitation_seen")).toBe("true");
    expect(reloadMock).toHaveBeenCalledOnce();
  });
});
