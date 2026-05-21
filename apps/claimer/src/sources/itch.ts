import { AlreadyClaimedError, UnauthorizedError } from "@freebies/utils";
import { createGuardrails, generate } from "otplib";
import type { BrowserContext, Page } from "patchright";
import type { Claimer, UserCredentials } from "../types.ts";

const authCheckUrl = "https://itch.io/dashboard";
const authUrl = "https://itch.io/login";
const authRedirectUrl = /https:\/\/itch\.io\/(my-feed|dashboard)/;

async function isAuthenticated(page: Page): Promise<boolean>;
async function isAuthenticated(context: BrowserContext): Promise<boolean>;
async function isAuthenticated(target: BrowserContext | Page): Promise<boolean> {
  const isBrowserContext = "newPage" in target;
  const page = isBrowserContext ? await target.newPage() : target;

  if (isBrowserContext) await page.goto(authCheckUrl);

  const isAuthenticated = await page
    .locator(".profile_link")
    .waitFor({ state: "visible" })
    .then(() => true)
    .catch(() => false);

  if (isBrowserContext) await page.close();
  return isAuthenticated;
}

async function authenticate({ email, password, authSecret }: UserCredentials, context: BrowserContext) {
  if (await isAuthenticated(context)) return;
  const authPage = context.pages().find((page) => page.url().startsWith(authUrl));
  const page = authPage ?? (await context.newPage());
  if (!authPage) await page.goto(authUrl);

  await page.getByLabel("Username or email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();

  if (authSecret) {
    const guardrails = createGuardrails({ MIN_SECRET_BYTES: 10 });
    const otp = await generate({ secret: authSecret, guardrails });
    await page.getByLabel("Verification code").fill(otp);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
  }

  await page.waitForURL(authRedirectUrl);
  await page.close();
}

async function claim(url: string, context: BrowserContext) {
  const page = await context.newPage();
  let popupPage: Page | undefined; // Keep track in case itch.io opens a new tab

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });

    if (!(await isAuthenticated(page))) {
      throw new UnauthorizedError();
    }

    // Use a short timeout so we don't hang for 30s if the element isn't there
    const isClaimed = await page
      .getByText(/You own this .+/)
      .waitFor({ state: "visible", timeout: 3000 })
      .then(() => true)
      .catch(() => false);

    if (isClaimed) {
      throw new AlreadyClaimedError();
    }

    await page.getByText("Download or claim").locator("visible=true").first().click({ timeout: 5000 });

    // The donation prompt doesn't always appear. Catch the timeout gracefully if it skips straight to claim.
    try {
      const bypassBtn = page.getByText("No thanks, just take me to the downloads");
      await bypassBtn.waitFor({ state: "visible", timeout: 3000 });
      await bypassBtn.click();
    } catch {
      // Ignore timeout. The user might not have a donation prompt configured.
    }

    // Safely determine if a new tab was opened during the click sequence
    const pages = context.pages();
    const currentIndex = pages.indexOf(page);

    // If there is a page after the current one, treat it as the new tab
    if (currentIndex !== -1 && currentIndex < pages.length - 1) {
      popupPage = pages[currentIndex + 1];
    }

    const activePage = popupPage ?? page;

    // Wait for the final claim page to load
    await activePage.getByRole("button", { name: "Claim" }).click({ timeout: 5000 });
    await activePage.getByText("You claimed this").waitFor({ state: "visible", timeout: 5000 });
  } finally {
    // FINALLY BLOCK: This runs 100% of the time, whether the code succeeded or threw an error.

    // 1. Close the popup if it was opened
    if (popupPage && !popupPage.isClosed()) {
      await popupPage.close().catch(console.error);
    }

    // 2. Close the main page
    if (!page.isClosed()) {
      await page.close().catch(console.error);
    }
  }
}

// async function claim(url: string, context: BrowserContext) {
//   const page = await context.newPage();
//   await page.goto(url);

//   if (!(await isAuthenticated(page))) throw new UnauthorizedError();

//   const isClaimed = await page
//     .getByText(/You own this .+/)
//     .waitFor({ state: "visible" })
//     .then(() => true)
//     .catch(() => false);

//   if (isClaimed) throw new AlreadyClaimedError();

//   await page.getByText("Download or claim").locator("visible=true").first().click({ timeout: 1000 });
//   await page.getByText("No thanks, just take me to the downloads").click();

//   let newPage: Page;
//   const pages = context.pages();
//   if (pages.length === 1) newPage = page;
//   else newPage = pages[pages.indexOf(page) + 1];

//   await newPage.getByRole("button", { name: "Claim" }).click();
//   await newPage.getByText("You claimed this").waitFor({ state: "visible" });
//   await newPage.close();
// }

export default {
  platform: "itch.io",
  isAuthenticated,
  authenticate,
  claim,
} satisfies Claimer;
