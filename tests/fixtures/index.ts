import { test as base, Page } from "@playwright/test";
import { HomePage } from "../pages/home.page";
import { OpeningScreenPage } from "../pages/opening-screen.page";
import { InvitationCardPage } from "../pages/invitation-card.page";
import { CountdownHeroPage } from "../pages/countdown-hero.page";
import { AdminPage } from "../pages/admin.page";

type WeddingFixtures = {
  homePage: HomePage;
  openingScreen: OpeningScreenPage;
  invitationCard: InvitationCardPage;
  countdownHero: CountdownHeroPage;
  adminPage: AdminPage;
  /** Page with localStorage cleared — simulates a first-time visitor */
  freshPage: Page;
};

export const test = base.extend<WeddingFixtures>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },

  openingScreen: async ({ page }, use) => {
    await use(new OpeningScreenPage(page));
  },

  invitationCard: async ({ page }, use) => {
    await use(new InvitationCardPage(page));
  },

  countdownHero: async ({ page }, use) => {
    await use(new CountdownHeroPage(page));
  },

  adminPage: async ({ page }, use) => {
    await use(new AdminPage(page));
  },

  freshPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    // Clear all storage to simulate first visit
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await use(page);
    await context.close();
  },
});

export { expect } from "@playwright/test";
