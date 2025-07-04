import { createBrowserContext } from "$common/browser.ts";
import { StorageState } from "$common/types.ts";
import { authenticator } from "otplib";
import { BrowserContext, Page } from "playwright";

export async function loginToUnityAssetStore(
  email: string,
  password: string,
  authSecret: string | null,
): Promise<StorageState> {
  const context = await createBrowserContext();
  try {
    const page = await context.newPage();
    console.log("Navigating to login page");
    await page.goto("https://id.unity.com/en");
    console.log("Filling login credentials");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    console.log("Logging in");
    await page.click("input[type=submit]");
    await page.waitForLoadState("load");
    const pageTitle = await page.title();

    if (pageTitle.includes("Verify your code")) {
      if (authSecret) {
        console.log("Entering 2FA code");
        const otp = authenticator.generate(authSecret);
        await page.fill("input.verify_code", otp);
        await page.click("input[type=submit]");
      } else throw new Error("OTP required");
    }

    console.log("Waiting for redirect after logging in");
    await page.waitForURL("https://id.unity.com/en/account/edit");
    console.log("Logged in successfully");
    return await context.storageState();
  } finally {
    await context.browser()?.close();
  }
}

export async function checkIsLoggedInToUnityAssetStoreUsingPage(page: Page) {
  try {
    // Works for product page
    // Doesn't work for home page (https://assetstore.unity.com)
    const signedInProfile = page.locator('[data-test="avatar"]');
    await signedInProfile.waitFor();
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function isLoggedInToUnityAssetStore(context: BrowserContext) {
  const page = await context.newPage();

  try {
    await page.goto("https://id.unity.com/en");
    await page.waitForURL("https://id.unity.com/en/account/edit");
    return true;
  } catch (_) {
    return false;
  } finally {
    await page.close();
  }
}
