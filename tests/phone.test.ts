import { describe, it, expect } from "vitest";
import {
  parsePhone,
  formatPhone,
  detectCountryCode,
  normalizeForStorage,
  getCountryCodeOptions,
  toE164,
  combineDialCode,
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

    it("should strip a domestic trunk-prefix zero: 09876543210", () => {
      const parsed = parsePhone("09876543210");
      expect(parsed).toMatchObject({
        countryCode: "IN",
        dialCode: "+91",
        nationalNumber: "9876543210",
        e164: "+919876543210",
        isValid: true,
      });
    });

    it("should strip a trunk-prefix zero with punctuation: 098765-43210", () => {
      const parsed = parsePhone("098765-43210");
      expect(parsed?.e164).toBe("+919876543210");
    });
  });

  describe("regression: a plain 10-digit number is only ever a guess", () => {
    it("misclassifies a US number that happens to start with 9 as Indian (documents the known limitation of guessing without an explicit country — use toE164 with an explicit country instead)", () => {
      // This is why toE164() exists: whenever the real country is known
      // (e.g. from a PhoneInput country picker), callers must use toE164
      // instead of parsePhone/normalizeForStorage's digit-guessing.
      const parsed = parsePhone("9175551234");
      expect(parsed?.countryCode).toBe("IN");
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

describe("toE164", () => {
  it("combines India's dial code with a plain national number", () => {
    expect(toE164("IN", "9876543210")).toBe("+919876543210");
  });

  it("combines US's dial code with a national number that starts with 9 (would be misguessed as India by parsePhone)", () => {
    expect(toE164("US", "9175551234")).toBe("+19175551234");
  });

  it("combines Australia's dial code and strips a domestic trunk-prefix zero", () => {
    expect(toE164("AU", "0412345678")).toBe("+61412345678");
  });

  it("combines UK's dial code and strips a domestic trunk-prefix zero", () => {
    expect(toE164("GB", "07911123456")).toBe("+447911123456");
  });

  it("strips punctuation/spaces from the national number", () => {
    expect(toE164("IN", "98765-43210")).toBe("+919876543210");
  });

  it("falls back to India's dial code for an unknown ISO country code", () => {
    expect(toE164("ZZ", "9876543210")).toBe("+919876543210");
  });
});

describe("combineDialCode", () => {
  it("combines a curated dial code with a national number", () => {
    expect(combineDialCode("+91", "9876543210")).toBe("+919876543210");
  });

  it("normalizes a dial code missing its leading '+' (a guest typing a custom code)", () => {
    expect(combineDialCode("998", "912345678")).toBe("+998912345678");
  });

  it("strips punctuation/spaces from both the dial code and the national number", () => {
    expect(combineDialCode(" +91 ", "98765-43210")).toBe("+919876543210");
  });

  it("strips a domestic trunk-prefix zero from the national number", () => {
    expect(combineDialCode("+44", "07911123456")).toBe("+447911123456");
  });

  it("never looks anything up — an unrecognized dial code passes through as-is", () => {
    // Unlike toE164, this must work for genuinely custom codes not in COUNTRY_OPTIONS.
    expect(combineDialCode("+998", "912345678")).toBe("+998912345678");
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
