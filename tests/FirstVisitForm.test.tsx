import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/cities", () => ({
  searchCities: vi.fn((q: string) =>
    q ? [{ name: "Chennai" }, { name: "Chicago" }] : []
  ),
}));

vi.mock("@/lib/fingerprint", () => ({
  getOrCreateDeviceUUID: vi.fn().mockResolvedValue("test-uuid"),
  getBrowserSignalsHash: vi.fn().mockResolvedValue("test-hash"),
}));

// BackgroundMusic.startBackgroundMusic may not be defined in jsdom
vi.mock("@/components/ui/BackgroundMusic", () => ({
  startBackgroundMusic: vi.fn(),
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

async function fillAndSubmit(onComplete = vi.fn()) {
  render(<FirstVisitForm onComplete={onComplete} />);
  await userEvent.type(screen.getByPlaceholderText(/your name/i), "James");
  // Use fireEvent.change for email/mobile to bypass pointer-events:none on the
  // collapsing wrapper (the fields hide each other when one is filled).
  fireEvent.change(screen.getByPlaceholderText(/your@email/i), { target: { value: "james@example.com" } });
  fireEvent.change(screen.getByPlaceholderText(/\+91/i), { target: { value: "+919876543210" } });
  await userEvent.type(screen.getByPlaceholderText(/search city/i), "ch");
  await waitFor(() => screen.getByText("Chennai"));
  fireEvent.mouseDown(screen.getByText("Chennai"));
  await waitFor(() => {
    expect((screen.getByPlaceholderText(/search city/i) as HTMLInputElement).value).toBe("Chennai");
  });
  return onComplete;
}

describe("FirstVisitForm", () => {
  beforeEach(() => {
    localStorageMock.clear();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ session_token: "tok-xyz" }),
    });
  });

  it("renders name, email, mobile, and city inputs", () => {
    render(<FirstVisitForm onComplete={() => {}} />);
    expect(screen.getByPlaceholderText(/your name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/your@email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/\+91/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search city/i)).toBeInTheDocument();
  });

  it("submit button is disabled when name is empty", () => {
    render(<FirstVisitForm onComplete={() => {}} />);
    expect(screen.getByRole("button", { name: /open your invitation/i })).toBeDisabled();
  });

  it("shows city dropdown suggestions when typing", async () => {
    render(<FirstVisitForm onComplete={() => {}} />);
    await userEvent.type(screen.getByPlaceholderText(/search city/i), "ch");
    await waitFor(() => expect(screen.getByText("Chennai")).toBeInTheDocument());
  });

  it("fills city input when suggestion is clicked", async () => {
    render(<FirstVisitForm onComplete={() => {}} />);
    await userEvent.type(screen.getByPlaceholderText(/search city/i), "ch");
    await waitFor(() => screen.getByText("Chennai"));
    fireEvent.mouseDown(screen.getByText("Chennai"));
    await waitFor(() => {
      expect((screen.getByPlaceholderText(/search city/i) as HTMLInputElement).value).toBe("Chennai");
    });
  });

  it("calls /api/register, saves to localStorage, and calls onComplete on submit", async () => {
    const onComplete = await fillAndSubmit();
    fireEvent.click(screen.getByRole("button", { name: /open your invitation/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/register", expect.objectContaining({ method: "POST" }));
      expect(localStorageMock.getItem("guest_name")).toBe("James");
      expect(localStorageMock.getItem("guest_city")).toBe("Chennai");
      expect(localStorageMock.getItem("guest_email")).toBe("james@example.com");
      expect(localStorageMock.getItem("guest_mobile")).toBe("+919876543210");
      expect(localStorageMock.getItem("session_token")).toBe("tok-xyz");
      expect(onComplete).toHaveBeenCalledWith("James");
    });
  });

  it("submit is disabled when city is typed but not selected from dropdown", async () => {
    render(<FirstVisitForm onComplete={() => {}} />);
    await userEvent.type(screen.getByPlaceholderText(/your name/i), "James");
    await userEvent.type(screen.getByPlaceholderText(/your@email/i), "james@example.com");
    await userEvent.type(screen.getByPlaceholderText(/search city/i), "Chen");
    expect(screen.getByRole("button", { name: /open your invitation/i })).toBeDisabled();
  });

  it("shows error message on 429 response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ message: "Please try again in a little while." }),
    });
    const onComplete = await fillAndSubmit();
    fireEvent.click(screen.getByRole("button", { name: /open your invitation/i }));
    await waitFor(() => {
      expect(screen.getByText(/please try again/i)).toBeInTheDocument();
    });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("shows generic error message on non-ok response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });
    const onComplete = await fillAndSubmit();
    fireEvent.click(screen.getByRole("button", { name: /open your invitation/i }));
    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });
});
