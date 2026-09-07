import "server-only";
import crypto from "crypto";
import disposableDomains from "disposable-email-domains";

const DISPOSABLE_DOMAIN_SET = new Set(
  (disposableDomains as string[]).map((d) => d.toLowerCase())
);

export const OTP_EXPIRY_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_SENDS_PER_HOUR = 3;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isDisposableEmail(email: string): boolean {
  const domain = normalizeEmail(email).split("@")[1] ?? "";
  return DISPOSABLE_DOMAIN_SET.has(domain);
}

export function generateOtpCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtpCode(email: string, code: string): string {
  const pepper = process.env.OTP_HASH_PEPPER;
  if (!pepper) {
    if (process.env.VERCEL_ENV === "production") {
      throw new Error(
        "OTP_HASH_PEPPER is not set in production. Refusing to hash OTP codes with a default pepper."
      );
    }
  }
  const effectivePepper = pepper || "dev-otp-pepper-change-in-production";
  return crypto
    .createHash("sha256")
    .update(`${normalizeEmail(email)}:${code}:${effectivePepper}`)
    .digest("hex");
}
