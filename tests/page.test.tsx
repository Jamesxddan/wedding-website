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
vi.mock("@/components/ui/Reveal", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/ui/BackgroundMusic", () => ({ default: () => null }));
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

  // RETURN_VISIT, WEDDING_DAY, and POST_WEDDING phase rendering is tested
  // via E2E tests (return-visit.spec.ts) since components are dynamically imported.
});
