import { AlreadyClaimedError, UnauthorizedError } from "@freebies/utils";
import { createGuardrails, generate } from "otplib";
import type { BrowserContext, Page } from "patchright";
import type { Claimer, UserCredentials } from "../types.ts";

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
    .getByLabel("Sign in")
    .waitFor({ state: "visible" })
    .then(() => false)
    .catch(() => true);
}

const authUrl = "https://www.epicgames.com/id/login";
const authRedirectUrl = "https://www.epicgames.com/account/personal";

async function authenticate({ email, password, authSecret }: UserCredentials, context: BrowserContext) {
  if (await isAuthenticated(context)) return;
  const authPage = context.pages().find((page) => page.url().startsWith(authUrl));
  const page = authPage ?? (await context.newPage());
  if (!authPage) await page.goto(authUrl);

  await page.locator("#email").fill(email);
  await page.locator("button[type=submit]").click();

  await page.locator("#password").fill(password);
  await page.locator("button[type=submit]").click();

  if (authSecret) {
    const guardrails = createGuardrails({ MIN_SECRET_BYTES: 10 });
    const otp = await generate({ secret: authSecret, guardrails });

    for (let i = 0; i < otp.length; i++) {
      await page.locator(`input[name="code-input-${i}"]`).fill(otp[i]);
    }

    await page.locator("button[type=submit]").click();
  }

  await page.waitForURL(authRedirectUrl);
  await page.close();
}

async function claim(url: string, context: BrowserContext) {
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  if (!isAuthenticated(page)) throw new UnauthorizedError();

  const isClaimed = await page
    .getByRole("link", { name: "Open in Launcher" })
    .waitFor({ state: "visible" })
    .then(() => true)
    .catch(() => false);

  if (isClaimed) throw new AlreadyClaimedError();

  await page.getByRole("button", { name: "Buy Now" }).click();
  const frameLocator = page.frameLocator("#webPurchaseContainer iframe");
  await frameLocator.getByRole("button", { name: "Place Order" }).click();
  await frameLocator.getByText("Thank you!").waitFor({ state: "visible" });
  await page.close();
}

export default {
  productType: "Fab",
  isAuthenticated,
  authenticate,
  claim,
} satisfies Claimer;
