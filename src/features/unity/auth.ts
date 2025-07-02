import { createBrowserContext } from "$common/browser.ts";
import { StorageState } from "$common/types.ts";
import { authenticator } from "otplib";
import { BrowserContext, Page } from "playwright";

export async function loginToUnityAssetStore(
  email: string,
  password: string,
  authSecret: string | null,
): Promise<StorageState> {
  const context = await createBrowserContext({ cookies: [], origins: [] });
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
    await page.getByRole("button", { name: "Buy Now" }).waitFor();
    await page.click('[data-test="avatar"]');
    return !(await page.isVisible("#login-action"));
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function isLoggedInToUnityAssetStore(context: BrowserContext) {
  const page = await context.newPage();

  try {
    const url =
      "https://assetstore.unity.com/packages/essentials/tutorial-projects/polygon-prototype-low-poly-3d-art-by-synty-137126";
    await page.goto(url, { waitUntil: "load" });

    return await checkIsLoggedInToUnityAssetStoreUsingPage(page);
  } finally {
    await page.close();
  }
}
