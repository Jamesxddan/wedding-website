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

/**
 * Same idea, but sessionStorage — clears automatically when the tab/window
 * closes. Used for owner preview state so previews never linger into a
 * future browsing session and get mistaken for the real site state.
 */
export function safeSessionGetItem(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSessionSetItem(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Silently degrade.
  }
}

export function safeSessionRemoveItem(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Silently degrade.
  }
}
