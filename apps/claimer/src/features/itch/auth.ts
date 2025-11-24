import { createBrowserContext } from "@/common/browser.ts";
import type { StorageState } from "@freebies/db/types";
import { authenticator } from "otplib";
import { BrowserContext, Page } from "patchright";

export async function loginToItchDotIo(
  email: string,
  password: string,
  authSecret: string | null,
): Promise<StorageState> {
  const context = await createBrowserContext();
  try {
    const page = await context.newPage();
    console.log("Navigating to login page");
    await page.goto("https://itch.io/login");
    console.log("Filling login credentials");
    await page.getByLabel("Username or email").fill(email);
    await page.getByLabel("Password").fill(password);
    console.log("Logging in");
    await page.getByRole("button", { name: "Log in", exact: true }).click();

    if (authSecret) {
      console.log("Filling in 2FA code");
      await page.getByLabel("Verification code").fill(authenticator.generate(authSecret));
      await page.getByRole("button", { name: "Log in", exact: true }).click();
    }

    console.log("Waiting for redirect after login");
    await page.waitForURL(/https:\/\/itch\.io\/(my-feed|dashboard)/);
    console.log("Logged in successfully");
    return await context.storageState();
  } finally {
    await context.browser()?.close();
  }
}

export async function checkIsLoggedInToItchDotIoUsingPage(page: Page) {
  try {
    return await page.locator(".logged_in").isVisible();
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function isLoggedInToItchDotIo(context: BrowserContext) {
  const page = await context.newPage();

  try {
    await page.goto("https://itch.io/");
    return await checkIsLoggedInToItchDotIoUsingPage(page);
  } finally {
    await page.close();
  }
}
