import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class CountdownHeroPage extends BasePage {
  readonly countdownTimer: Locator;
  readonly guestGreeting: Locator;
  readonly viewInvitationButton: Locator;
  readonly gallerySection: Locator;
  readonly ourStorySection: Locator;
  readonly venueSection: Locator;
  readonly footer: Locator;

  constructor(page: Page) {
    super(page);
    this.countdownTimer = page.locator('[class*="countdown"]').or(
      page.getByText(/days?|hours?|minutes?|seconds?/i)
    );
    this.guestGreeting = page.getByText(/welcome|hello|hi/i);
    this.viewInvitationButton = page.getByRole("button", {
      name: /view invitation/i,
    });
    this.gallerySection = page.getByText(/gallery/i).first();
    this.ourStorySection = page.getByText(/our story/i).first();
    this.venueSection = page.getByText(/venue/i).first();
    this.footer = page.getByRole("contentinfo");
  }

  async expectCountdownVisible(): Promise<void> {
    await expect(this.page.getByText(/days?|hours?/i)).toBeVisible({
      timeout: 10_000,
    });
  }

  async expectSectionsLoaded(): Promise<void> {
    await expect(this.gallerySection).toBeVisible();
    await expect(this.ourStorySection).toBeVisible();
  }

  async clickViewInvitation(): Promise<void> {
    await this.viewInvitationButton.click();
  }

  async scrollToGallery(): Promise<void> {
    await this.gallerySection.scrollIntoViewIfNeeded();
  }

  async scrollToVenue(): Promise<void> {
    await this.venueSection.scrollIntoViewIfNeeded();
  }
}
