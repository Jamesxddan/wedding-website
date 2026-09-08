import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { PhoneInput, type PhoneInputValue } from "@/components/ui/PhoneInput";

// PhoneInput is a controlled component (it reads countryCode/dialCode/
// nationalNumber straight from `value`, not internal state) — the wrapper
// must actually feed onChange's result back in as the new `value`, the way
// every real caller (FirstVisitForm, RelinkForm, IdentityGate) does via
// their own useState, or the UI will never visibly update in these tests.
function Wrapper({ initial, onChange }: { initial: PhoneInputValue; onChange: (v: PhoneInputValue) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <PhoneInput
      value={value}
      onChange={(v) => { setValue(v); onChange(v); }}
      placeholder="Phone number"
    />
  );
}

describe("PhoneInput", () => {
  it("shows only the dial code on the collapsed trigger, not the flag or country name", () => {
    render(<Wrapper initial={{ countryCode: "IN", dialCode: "+91", nationalNumber: "" }} onChange={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: /select country code/i });
    expect(trigger).toHaveTextContent("+91");
    expect(trigger).not.toHaveTextContent("India");
    expect(trigger.textContent).not.toMatch(/🇮🇳/);
  });

  it("does not echo the dial code inside the number field itself", () => {
    render(<Wrapper initial={{ countryCode: "IN", dialCode: "+91", nationalNumber: "9876543210" }} onChange={vi.fn()} />);
    const numberInput = screen.getByLabelText("Phone number") as HTMLInputElement;
    expect(numberInput.value).toBe("9876543210");
    expect(numberInput.value).not.toContain("+91");
  });

  it("opens a dropdown listing countries with flag, name, and dial code", async () => {
    render(<Wrapper initial={{ countryCode: "IN", dialCode: "+91", nationalNumber: "" }} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /select country code/i }));
    expect(screen.getByPlaceholderText(/search country/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /united states/i })).toHaveTextContent("+1");
    expect(screen.getByRole("button", { name: /united kingdom/i })).toHaveTextContent("+44");
  });

  it("filters the list by country name", async () => {
    render(<Wrapper initial={{ countryCode: "IN", dialCode: "+91", nationalNumber: "" }} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /select country code/i }));
    await userEvent.type(screen.getByPlaceholderText(/search country/i), "united states");
    expect(screen.getByRole("button", { name: /united states/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^🇮🇳 india \+91$/i })).not.toBeInTheDocument();
  });

  it("prioritizes ISO-code-prefix matches (typing 'in' surfaces India first)", async () => {
    render(<Wrapper initial={{ countryCode: "IN", dialCode: "+91", nationalNumber: "" }} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /select country code/i }));
    await userEvent.type(screen.getByPlaceholderText(/search country/i), "in");
    const trigger = screen.getByRole("button", { name: /select country code/i });
    const results = screen.getAllByRole("button").filter((b) => b !== trigger && b.textContent?.match(/\+\d/));
    // First result in the filtered list should be India (code "IN" matches the "in" prefix)
    expect(results[0]).toHaveTextContent("India");
  });

  it("selecting a country updates the trigger and calls onChange with its dial code", async () => {
    const onChange = vi.fn();
    render(<Wrapper initial={{ countryCode: "IN", dialCode: "+91", nationalNumber: "123" }} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /select country code/i }));
    await userEvent.click(screen.getByRole("button", { name: /united kingdom/i }));
    expect(onChange).toHaveBeenCalledWith({ countryCode: "GB", dialCode: "+44", nationalNumber: "123" });
  });

  it("the 'Custom' entry is not matched by search but is present at the bottom of the list", async () => {
    render(<Wrapper initial={{ countryCode: "IN", dialCode: "+91", nationalNumber: "" }} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /select country code/i }));

    // Typing something that textually contains "custom" should NOT surface it via search matching —
    // it's simply always rendered, unaffected by the filter, at the end of the list.
    await userEvent.type(screen.getByPlaceholderText(/search country/i), "custom");
    expect(screen.queryByRole("button", { name: /^🌐 custom$/i })).not.toBeInTheDocument();

    // Clearing the search reveals it again, at the bottom.
    await userEvent.clear(screen.getByPlaceholderText(/search country/i));
    const allButtons = screen.getAllByRole("button").filter((b) => b !== screen.getByRole("button", { name: /select country code/i }));
    const customButton = screen.getByRole("button", { name: /custom/i });
    expect(customButton).toBeInTheDocument();
    expect(allButtons[allButtons.length - 1]).toBe(customButton);
  });

  it("selecting 'Custom' reveals a manual dial-code field and reports it via onChange", async () => {
    const onChange = vi.fn();
    render(<Wrapper initial={{ countryCode: "IN", dialCode: "+91", nationalNumber: "555" }} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /select country code/i }));
    await userEvent.click(screen.getByRole("button", { name: /custom/i }));

    const customDialInput = screen.getByLabelText(/custom dial code/i);
    expect(customDialInput).toBeInTheDocument();

    fireEvent.change(customDialInput, { target: { value: "+998" } });
    expect(onChange).toHaveBeenLastCalledWith({ countryCode: "CUSTOM", dialCode: "+998", nationalNumber: "555" });
  });

  it("closes the dropdown when clicking outside", async () => {
    render(
      <div>
        <PhoneInput value={{ countryCode: "IN", dialCode: "+91", nationalNumber: "" }} onChange={vi.fn()} />
        <button>outside</button>
      </div>
    );
    await userEvent.click(screen.getByRole("button", { name: /select country code/i }));
    expect(screen.getByPlaceholderText(/search country/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "outside" }));
    expect(screen.queryByPlaceholderText(/search country/i)).not.toBeInTheDocument();
  });
});
