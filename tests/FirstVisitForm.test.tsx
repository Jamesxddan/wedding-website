import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/cities", () => ({
  searchCities: vi.fn((q: string) =>
    q ? [{ name: "Chennai" }, { name: "Chicago" }] : []
  ),
}));

const reloadMock = vi.fn();
Object.defineProperty(window, "location", {
  value: { reload: reloadMock },
  writable: true,
});

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
    reloadMock.mockClear();
  });

  it("renders name input and city search", () => {
    render(<FirstVisitForm />);
    expect(screen.getByPlaceholderText(/your name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search your city/i)).toBeInTheDocument();
  });

  it("submit button is disabled when name is empty", () => {
    render(<FirstVisitForm />);
    expect(screen.getByRole("button", { name: /open your invitation/i })).toBeDisabled();
  });

  it("shows city dropdown suggestions when typing", async () => {
    render(<FirstVisitForm />);
    await userEvent.type(screen.getByPlaceholderText(/search your city/i), "ch");
    await waitFor(() => expect(screen.getByText("Chennai")).toBeInTheDocument());
  });

  it("fills city input when suggestion is clicked", async () => {
    render(<FirstVisitForm />);
    await userEvent.type(screen.getByPlaceholderText(/search your city/i), "ch");
    await waitFor(() => screen.getByText("Chennai"));
    fireEvent.mouseDown(screen.getByText("Chennai"));
    await waitFor(() => {
      expect((screen.getByPlaceholderText(/search your city/i) as HTMLInputElement).value).toBe("Chennai");
    });
  });

  it("saves name and city to localStorage and reloads on submit", async () => {
    render(<FirstVisitForm />);
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
    expect(reloadMock).toHaveBeenCalledOnce();
  });

  it("submit is disabled when city is typed but not selected from dropdown", async () => {
    render(<FirstVisitForm />);
    await userEvent.type(screen.getByPlaceholderText(/your name/i), "James");
    await userEvent.type(screen.getByPlaceholderText(/search your city/i), "Chen");
    expect(screen.getByRole("button", { name: /open your invitation/i })).toBeDisabled();
  });
});
