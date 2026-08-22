import { describe, it, expect } from "vitest";
import {
  parsePhone,
  formatPhone,
  detectCountryCode,
  normalizeForStorage,
  getCountryCodeOptions,
  type ParsedPhone,
} from "@/lib/phone";

describe("getCountryCodeOptions", () => {
  it("should return array of country options", () => {
    const options = getCountryCodeOptions();
    expect(options.length).toBeGreaterThan(0);
    expect(options[0]).toHaveProperty("code");
    expect(options[0]).toHaveProperty("dialCode");
    expect(options[0]).toHaveProperty("name");
    expect(options[0]).toHaveProperty("flag");
  });

  it("should have India as first option (default)", () => {
    const options = getCountryCodeOptions();
    expect(options[0].code).toBe("IN");
    expect(options[0].dialCode).toBe("+91");
  });
});

describe("parsePhone", () => {
  describe("Indian numbers", () => {
    it("should parse E.164 format: +919876543210", () => {
      const parsed = parsePhone("+919876543210");
      expect(parsed).toMatchObject({
        countryCode: "IN",
        dialCode: "+91",
        nationalNumber: "9876543210",
        e164: "+919876543210",
        isValid: true,
      });
    });

    it("should parse with spaces: +91 98765 43210", () => {
      const parsed = parsePhone("+91 98765 43210");
      expect(parsed).toMatchObject({
        countryCode: "IN",
        dialCode: "+91",
        nationalNumber: "9876543210",
        e164: "+919876543210",
        isValid: true,
      });
    });

    it("should parse without plus: 919876543210", () => {
      const parsed = parsePhone("919876543210");
      expect(parsed).toMatchObject({
        countryCode: "IN",
        dialCode: "+91",
        nationalNumber: "9876543210",
        e164: "+919876543210",
        isValid: true,
      });
    });

    it("should parse 10-digit national: 9876543210", () => {
      const parsed = parsePhone("9876543210");
      expect(parsed).toMatchObject({
        countryCode: "IN",
        dialCode: "+91",
        nationalNumber: "9876543210",
        e164: "+919876543210",
        isValid: true,
      });
    });

    it("should reject Indian numbers starting with invalid digit", () => {
      const parsed = parsePhone("5876543210");
      expect(parsed?.isValid).toBe(false);
    });

    it("should reject Indian numbers with wrong length", () => {
      const parsed = parsePhone("987654321"); // 9 digits
      expect(parsed?.isValid).toBe(false);
    });
  });

  describe("US/Canada numbers", () => {
    it("should parse US E.164: +15551234567", () => {
      const parsed = parsePhone("+15551234567");
      expect(parsed).toMatchObject({
        countryCode: "US",
        dialCode: "+1",
        nationalNumber: "5551234567",
        e164: "+15551234567",
        isValid: true,
      });
    });

    it("should parse with spaces: +1 555 123 4567", () => {
      const parsed = parsePhone("+1 555 123 4567");
      expect(parsed).toMatchObject({
        countryCode: "US",
        nationalNumber: "5551234567",
        e164: "+15551234567",
      });
    });
  });

  describe("UK numbers", () => {
    it("should parse UK E.164: +442079460958", () => {
      const parsed = parsePhone("+442079460958");
      expect(parsed).toMatchObject({
        countryCode: "GB",
        dialCode: "+44",
        nationalNumber: "2079460958",
        e164: "+442079460958",
        isValid: true,
      });
    });
  });

  describe("edge cases", () => {
    it("should return null for empty string", () => {
      expect(parsePhone("")).toBeNull();
    });

    it("should return null for non-numeric input", () => {
      expect(parsePhone("abc")).toBeNull();
    });

    it("should return null for invalid format", () => {
      expect(parsePhone("+")).toBeNull();
    });

    it("should handle input with dashes and parentheses", () => {
      const parsed = parsePhone("+91 (98765) 43-210");
      expect(parsed?.e164).toBe("+919876543210");
    });
  });
});

describe("formatPhone", () => {
  const indianParsed: ParsedPhone = {
    countryCode: "IN",
    dialCode: "+91",
    nationalNumber: "9876543210",
    e164: "+919876543210",
    isValid: true,
  };

  const usParsed: ParsedPhone = {
    countryCode: "US",
    dialCode: "+1",
    nationalNumber: "5551234567",
    e164: "+15551234567",
    isValid: true,
  };

  it("should format as e164", () => {
    expect(formatPhone(indianParsed, "e164")).toBe("+919876543210");
  });

  it("should format Indian national number with space", () => {
    expect(formatPhone(indianParsed, "national")).toBe("98765 43210");
  });

  it("should format US national number as (XXX) XXX-XXXX", () => {
    expect(formatPhone(usParsed, "national")).toBe("(555) 123-4567");
  });

  it("should format display with dial code", () => {
    expect(formatPhone(indianParsed, "display")).toBe("+91 98765 43210");
  });
});

describe("detectCountryCode", () => {
  it("should detect India from +919876543210", () => {
    expect(detectCountryCode("+919876543210")).toBe("IN");
  });

  it("should detect US from +15551234567", () => {
    expect(detectCountryCode("+15551234567")).toBe("US");
  });

  it("should detect GB from +442079460958", () => {
    expect(detectCountryCode("+442079460958")).toBe("GB");
  });

  it("should default to IN for 10-digit number", () => {
    expect(detectCountryCode("9876543210")).toBe("IN");
  });

  it("should default to IN for invalid input", () => {
    expect(detectCountryCode("abc")).toBe("IN");
  });
});

describe("normalizeForStorage", () => {
  it("should normalize +91 98765 43210 to +919876543210", () => {
    expect(normalizeForStorage("+91 98765 43210")).toBe("+919876543210");
  });

  it("should normalize 919876543210 to +919876543210", () => {
    expect(normalizeForStorage("919876543210")).toBe("+919876543210");
  });

  it("should normalize 9876543210 to +919876543210", () => {
    expect(normalizeForStorage("9876543210")).toBe("+919876543210");
  });

  it("should normalize US number +1 555 123 4567 to +15551234567", () => {
    expect(normalizeForStorage("+1 555 123 4567")).toBe("+15551234567");
  });

  it("should return trimmed input for unparseable data", () => {
    expect(normalizeForStorage("  invalid  ")).toBe("invalid");
  });
});
