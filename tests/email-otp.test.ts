import { describe, it, expect } from "vitest";
import {
  normalizeEmail,
  isDisposableEmail,
  generateOtpCode,
  hashOtpCode,
  OTP_EXPIRY_MS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_MAX_SENDS_PER_HOUR,
} from "@/lib/email-otp";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Whitson@Example.COM  ")).toBe("whitson@example.com");
  });
});

describe("isDisposableEmail", () => {
  it("flags a known disposable domain", () => {
    expect(isDisposableEmail("someone@mailinator.com")).toBe(true);
  });

  it("does not flag a normal domain", () => {
    expect(isDisposableEmail("whitson@gmail.com")).toBe(false);
  });

  it("is case-insensitive on the domain", () => {
    expect(isDisposableEmail("someone@MAILINATOR.com")).toBe(true);
  });
});

describe("generateOtpCode", () => {
  it("generates a 6-digit numeric string", () => {
    const code = generateOtpCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("generates different codes across many calls (not constant)", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateOtpCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("hashOtpCode", () => {
  it("is deterministic for the same email+code", () => {
    expect(hashOtpCode("whitson@example.com", "123456")).toBe(
      hashOtpCode("whitson@example.com", "123456")
    );
  });

  it("differs for different codes", () => {
    expect(hashOtpCode("whitson@example.com", "123456")).not.toBe(
      hashOtpCode("whitson@example.com", "654321")
    );
  });

  it("differs for different emails with the same code", () => {
    expect(hashOtpCode("whitson@example.com", "123456")).not.toBe(
      hashOtpCode("james@example.com", "123456")
    );
  });

  it("is not reversible/plaintext (hash does not contain the code)", () => {
    expect(hashOtpCode("whitson@example.com", "123456")).not.toContain("123456");
  });
});

describe("constants", () => {
  it("expose sane defaults", () => {
    expect(OTP_EXPIRY_MS).toBe(10 * 60 * 1000);
    expect(OTP_MAX_ATTEMPTS).toBe(5);
    expect(OTP_RESEND_COOLDOWN_MS).toBe(60 * 1000);
    expect(OTP_MAX_SENDS_PER_HOUR).toBe(3);
  });
});
