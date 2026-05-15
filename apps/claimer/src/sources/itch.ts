import { AlreadyClaimedError, UnauthorizedError } from "@freebies/utils";
import { createGuardrails, generate } from "otplib";
import type { BrowserContext, Page } from "patchright";
import type { Claimer, UserCredentials } from "../types.ts";

const authUrl = "https://itch.io/login";
const authRedirectUrl = /https:\/\/itch\.io\/(my-feed|dashboard)/;

async function isAuthenticated(page: Page): Promise<boolean>;
async function isAuthenticated(context: BrowserContext): Promise<boolean>;
async function isAuthenticated(target: BrowserContext | Page): Promise<boolean> {
  const isBrowserContext = "newPage" in target;
  const page = isBrowserContext ? await target.newPage() : target;

  if (isBrowserContext) {
    await page.goto(authUrl);
    return await page
      .waitForURL(authRedirectUrl)
      .then(() => true)
      .catch(() => false)
      .finally(() => page.close());
  }

  return await page
    .locator(".profile_link")
    .waitFor({ state: "visible" })
    .then(() => true)
    .catch(() => false);
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
  await page.goto(url);

  if (!(await isAuthenticated(page))) throw new UnauthorizedError();

  const isClaimed = await page
    .getByText(/You own this .+/)
    .waitFor({ state: "visible" })
    .then(() => true)
    .catch(() => false);

  if (isClaimed) throw new AlreadyClaimedError();

  await page.getByText("Download or claim").locator("visible=true").first().click({ timeout: 1000 });
  await page.getByText("No thanks, just take me to the downloads").click();

  let newPage: Page;
  const pages = context.pages();
  if (pages.length === 1) newPage = page;
  else newPage = pages[pages.indexOf(page) + 1];

  await newPage.getByRole("button", { name: "Claim" }).click();
  await newPage.getByText("You claimed this").waitFor({ state: "visible" });
  await newPage.close();
}

export default {
  productType: "Itch",
  isAuthenticated,
  authenticate,
  claim,
} satisfies Claimer;
