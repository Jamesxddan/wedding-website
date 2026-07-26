import { Page } from "@playwright/test";

/**
 * Clear all browser storage to simulate a fresh visitor
 */
export async function clearAllStorage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Set localStorage to simulate a returning visitor
 */
export async function setGuestSession(
  page: Page,
  name: string,
  city: string,
  invitationSeen = true
): Promise<void> {
  await page.addInitScript(
    ({ name, city, invitationSeen }) => {
      localStorage.setItem("guest_name", name);
      localStorage.setItem("guest_city", city);
      if (invitationSeen) {
        localStorage.setItem("invitation_seen", "true");
      }
    },
    { name, city, invitationSeen }
  );
}

/**
 * Override the phase via localStorage dev override
 */
export async function setPhaseOverride(
  page: Page,
  phase: string
): Promise<void> {
  await page.addInitScript((phase) => {
    localStorage.setItem("dev_phase", phase);
  }, phase);
}

/**
 * Generate a random guest name for test isolation
 */
export function randomGuestName(): string {
  return `TestGuest_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Wait for the Next.js hydration to complete
 */
export async function waitForHydration(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  // Give React a moment to hydrate
  await page.waitForTimeout(500);
}
