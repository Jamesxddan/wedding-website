// Run: node scripts/smoke-check.mjs [url]
// Loads the site in a real browser and prints whether the expected content is
// rendered. Used to verify a deployed build (staging/prod).
import { chromium } from "@playwright/test";

// Production domain is the only URL reachable without Vercel's deployment
// protection login wall; preview/staging *.vercel.app and staging.*.site are protected.
const url = process.argv[2] || "https://www.jameswedssharon.site";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  console.log("STATUS:", resp && resp.status());
  console.log("URL:", page.url());
  await page.waitForTimeout(7000);

  const nav = await page.locator("nav ul.hidden li a").allTextContents().catch(() => []);
  console.log("NAV_ORDER:", JSON.stringify(nav));

  const body = await page.locator("body").innerText();
  console.log("BODY_HEAD:", JSON.stringify(body.slice(0, 500)));
  const checks = {
    HAS_BORN_1999: body.includes("Born in 1999"),
    HAS_RIZMASUSI: body.includes("Rizmasusi"),
    HAS_YESURATNAM: body.includes("Yesuratnam"),
    HAS_GOD_WOVE: body.includes("God wove these two families together"),
  };
  console.log("CHECKS:", JSON.stringify(checks));

  // City autocomplete: new-device visitors see the registration form.
  const cityInput = page.getByPlaceholder("Search city…");
  if (await cityInput.isVisible().catch(() => false)) {
    await cityInput.click();
    await cityInput.fill("Hyder");
    await page.waitForTimeout(1200);
    const dropdownOpen = await page.locator("ul li button", { hasText: /Hyderabad/ }).isVisible().catch(() => false);
    console.log("CITY_DROPDOWN_SHOWS_HYDERABAD_AFTER_TYPING_HYDER:", dropdownOpen);
    if (dropdownOpen) {
      await page.locator("ul li button", { hasText: /^Hyderabad$/ }).first().click();
      await page.waitForTimeout(400);
      console.log("CITY_INPUT_VALUE:", await cityInput.inputValue());
    }
  } else {
    console.log("CITY_FORM: not visible (registration skipped on this env)");
  }

  if (errors.length) console.log("CONSOLE_ERRORS:", JSON.stringify(errors.slice(0, 8), null, 2));
} finally {
  await browser.close();
}
