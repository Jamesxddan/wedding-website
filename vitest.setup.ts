import "@testing-library/jest-dom/vitest";

// jsdom does not implement IntersectionObserver
if (typeof IntersectionObserver === "undefined") {
  global.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
}
