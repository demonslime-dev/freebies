import type { StorageState } from "@freebies/db/types";
import { createBrowserContext } from "@freebies/utils";
import { generate } from "otplib";
import type { BrowserContext, Page } from "patchright";

export async function loginToFab(email: string, password: string, authSecret: string | null): Promise<StorageState> {
  const context = await createBrowserContext();
  try {
    const page = await context.newPage();
    console.log("Navigating to login page");
    await page.goto("https://www.epicgames.com/id/login");
    console.log("Filling login credentials");
    await page.fill("#email", email);

    // TODO: Bypass or solve captcha
    await page.click("button[type=submit]");
    await page.fill("#password", password);
    console.log("Logging in");
    await page.click("button[type=submit]");

    if (authSecret) {
      console.log("Filling in 2FA code");
      const otp = await generate({ secret: authSecret });

      for (let i = 0; i < otp.length; i++) {
        await page.fill(`input[name="code-input-${i}"]`, otp[i]);
      }

      await page.click("button[type=submit]");
    }

    await page.waitForURL("https://www.epicgames.com/account/personal");
    console.log("Logged in successfully");
    return await context.storageState();
  } finally {
    await context.browser()?.close();
  }
}

export async function checkIsLoggedInToFabUsingPage(page: Page) {
  try {
    const isNotLoggedIn = await page.getByLabel("Sign in").first().isVisible();
    await page.waitForTimeout(5 * 60 * 1000);
    return !isNotLoggedIn;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function isLoggedInToFab(context: BrowserContext) {
  const page = await context.newPage();

  try {
    await page.goto("https://www.fab.com", {
      waitUntil: "networkidle",
    });
    return await checkIsLoggedInToFabUsingPage(page);
  } finally {
    await page.close();
  }
}
