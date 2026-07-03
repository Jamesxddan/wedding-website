import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/cities", () => ({
  searchCities: vi.fn((q: string) =>
    q ? [{ name: "Chennai" }, { name: "Chicago" }] : []
  ),
}));

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

import FirstVisitForm from "@/components/phases/FirstVisitForm";

describe("FirstVisitForm", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("renders name input and city search", () => {
    render(<FirstVisitForm onComplete={() => {}} />);
    expect(screen.getByPlaceholderText(/your name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search your city/i)).toBeInTheDocument();
  });

  it("submit button is disabled when name is empty", () => {
    render(<FirstVisitForm onComplete={() => {}} />);
    expect(screen.getByRole("button", { name: /open your invitation/i })).toBeDisabled();
  });

  it("shows city dropdown suggestions when typing", async () => {
    render(<FirstVisitForm onComplete={() => {}} />);
    await userEvent.type(screen.getByPlaceholderText(/search your city/i), "ch");
    await waitFor(() => expect(screen.getByText("Chennai")).toBeInTheDocument());
  });

  it("fills city input when suggestion is clicked", async () => {
    render(<FirstVisitForm onComplete={() => {}} />);
    await userEvent.type(screen.getByPlaceholderText(/search your city/i), "ch");
    await waitFor(() => screen.getByText("Chennai"));
    fireEvent.mouseDown(screen.getByText("Chennai"));
    await waitFor(() => {
      expect((screen.getByPlaceholderText(/search your city/i) as HTMLInputElement).value).toBe("Chennai");
    });
  });

  it("saves name and city to localStorage and calls onComplete on submit", async () => {
    const onComplete = vi.fn();
    render(<FirstVisitForm onComplete={onComplete} />);
    await userEvent.type(screen.getByPlaceholderText(/your name/i), "James");
    await userEvent.type(screen.getByPlaceholderText(/search your city/i), "ch");
    await waitFor(() => screen.getByText("Chennai"));
    fireEvent.mouseDown(screen.getByText("Chennai"));
    await waitFor(() => {
      expect((screen.getByPlaceholderText(/search your city/i) as HTMLInputElement).value).toBe("Chennai");
    });
    fireEvent.click(screen.getByRole("button", { name: /open your invitation/i }));
    expect(localStorageMock.getItem("guest_name")).toBe("James");
    expect(localStorageMock.getItem("guest_city")).toBe("Chennai");
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("submit is disabled when city is typed but not selected from dropdown", async () => {
    render(<FirstVisitForm onComplete={() => {}} />);
    await userEvent.type(screen.getByPlaceholderText(/your name/i), "James");
    await userEvent.type(screen.getByPlaceholderText(/search your city/i), "Chen");
    expect(screen.getByRole("button", { name: /open your invitation/i })).toBeDisabled();
  });
});
