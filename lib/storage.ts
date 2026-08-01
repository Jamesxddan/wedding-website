"use client";

/**
 * Safe localStorage wrappers that degrade gracefully when localStorage is
 * unavailable (Safari private browsing, disabled by policy, etc.).
 * All three functions return/behave as if the key didn't exist.
 */

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Silently degrade — fingerprint / session-check fallbacks still work.
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Silently degrade.
  }
}
