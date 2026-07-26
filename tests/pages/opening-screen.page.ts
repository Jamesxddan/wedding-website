import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class OpeningScreenPage extends BasePage {
  readonly nameInput: Locator;
  readonly cityInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.nameInput = page.getByPlaceholder("Your name");
    this.cityInput = page.getByPlaceholder("Your city");
    this.submitButton = page.getByRole("button", { name: /continue|submit/i });
    this.errorMessage = page.getByRole("alert");
  }

  async goto(): Promise<void> {
    await this.navigate("/");
    // Wait for opening screen to appear (FIRST_VISIT phase)
    await this.nameInput.waitFor({ state: "visible", timeout: 10_000 });
  }

  async register(name: string, city: string): Promise<void> {
    await this.nameInput.fill(name);
    await this.cityInput.fill(city);
    await this.submitButton.click();
  }

  async expectError(message: string | RegExp): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    if (typeof message === "string") {
      await expect(this.errorMessage).toHaveText(message);
    } else {
      await expect(this.errorMessage).toHaveText(message);
    }
  }

  async expectFormVisible(): Promise<void> {
    await expect(this.nameInput).toBeVisible();
    await expect(this.cityInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }
}
