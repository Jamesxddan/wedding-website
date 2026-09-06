import "@testing-library/jest-dom/vitest";

// Default pepper for OTP hashing in tests. Individual tests that need to
// exercise the "unset in production" fail-closed path explicitly delete this.
if (!process.env.OTP_HASH_PEPPER) {
  process.env.OTP_HASH_PEPPER = "test-otp-pepper";
}

// jsdom does not implement IntersectionObserver
if (typeof IntersectionObserver === "undefined") {
  global.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
}
