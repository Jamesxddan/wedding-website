import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/fingerprint", () => ({
  getOrCreateDeviceUUID: vi.fn().mockResolvedValue("test-uuid"),
  getBrowserSignalsHash: vi.fn().mockResolvedValue("test-hash"),
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

import IdentityGate from "@/components/phases/IdentityGate";

describe("IdentityGate", () => {
  beforeEach(() => {
    localStorageMock.clear();
    global.fetch = vi.fn();
  });

  it("asks 'Are you <Name> from <City>?' with Yes/No buttons", () => {
    render(<IdentityGate guestId="g1" guestName="James Daniel" guestCity="Chennai" onConfirmed={vi.fn()} onNotMe={vi.fn()} />);
    expect(screen.getByText(/are you james daniel from chennai\?/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /yes, i'm james daniel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /no, i'm someone else/i })).toBeInTheDocument();
  });

  it("calls onNotMe when 'No, I'm someone else' is clicked", async () => {
    const onNotMe = vi.fn();
    render(<IdentityGate guestId="g1" guestName="James Daniel" guestCity="Chennai" onConfirmed={vi.fn()} onNotMe={onNotMe} />);
    await userEvent.click(screen.getByRole("button", { name: /no, i'm someone else/i }));
    expect(onNotMe).toHaveBeenCalled();
  });

  it("advances to the OTP step and shows the masked email hint after clicking Yes", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, email_hint: "ja***@example.com" }),
    });
    render(<IdentityGate guestId="g1" guestName="James Daniel" guestCity="Chennai" onConfirmed={vi.fn()} onNotMe={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /yes, i'm james daniel/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/relink/confirm-otp/request",
        expect.objectContaining({ method: "POST" })
      );
      expect(screen.getByText("ja***@example.com")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("123456")).toBeInTheDocument();
    });
  });

  it("falls back to the phone-verification step when the guest has no email on file", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ needs_phone: true }),
    });
    render(<IdentityGate guestId="g1" guestName="James Daniel" guestCity="Chennai" onConfirmed={vi.fn()} onNotMe={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /yes, i'm james daniel/i }));
    await waitFor(() => {
      expect(screen.getByText(/verify with the phone number you registered with/i)).toBeInTheDocument();
    });
  });

  it("completes verification and calls onConfirmed on a correct OTP code", async () => {
    const onConfirmed = vi.fn();
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ok: true, email_hint: "ja***@example.com" }) })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: "relinked", session_token: "tok-1", name: "James Daniel", city: "Chennai" }),
      });
    render(<IdentityGate guestId="g1" guestName="James Daniel" guestCity="Chennai" onConfirmed={onConfirmed} onNotMe={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /yes, i'm james daniel/i }));
    await waitFor(() => screen.getByPlaceholderText("123456"));
    fireEvent.change(screen.getByPlaceholderText("123456"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /^verify$/i }));
    await waitFor(() => {
      expect(localStorageMock.getItem("session_token")).toBe("tok-1");
      expect(onConfirmed).toHaveBeenCalled();
    });
  });

  it("shows an error and does not call onConfirmed on an incorrect OTP code", async () => {
    const onConfirmed = vi.fn();
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ok: true, email_hint: "ja***@example.com" }) })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "invalid_code", attempts_remaining: 4 }),
      });
    render(<IdentityGate guestId="g1" guestName="James Daniel" guestCity="Chennai" onConfirmed={onConfirmed} onNotMe={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /yes, i'm james daniel/i }));
    await waitFor(() => screen.getByPlaceholderText("123456"));
    fireEvent.change(screen.getByPlaceholderText("123456"), { target: { value: "000000" } });
    fireEvent.click(screen.getByRole("button", { name: /^verify$/i }));
    await waitFor(() => {
      expect(screen.getByText(/incorrect code \(4 attempts remaining\)/i)).toBeInTheDocument();
      expect(onConfirmed).not.toHaveBeenCalled();
    });
  });
});
