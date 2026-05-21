import { AlreadyClaimedError, UnauthorizedError } from "@freebies/utils";
import { createGuardrails, generate } from "otplib";
import type { BrowserContext, Page } from "patchright";
import type { Claimer, UserCredentials } from "../types.ts";

const authUrl = "https://id.unity.com/en";
const authRedirectUrl = "https://id.unity.com/en/security";

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
    .getByLabel("My Assets")
    .waitFor({ state: "visible" })
    .then(() => true)
    .catch(() => false);
}

async function authenticate({ email, password, authSecret }: UserCredentials, context: BrowserContext) {
  if (await isAuthenticated(context)) return;
  const authPage = context.pages().find((page) => page.url().startsWith(authUrl));
  const page = authPage ?? (await context.newPage());
  if (!authPage) await page.goto(authUrl);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.click("input[type=submit]");
  await page.waitForLoadState("load");

  const pageTitle = await page.title();
  if (pageTitle.includes("Verify your code")) {
    if (authSecret) {
      const guardrails = createGuardrails({ MIN_SECRET_BYTES: 10 });
      const otp = await generate({ secret: authSecret, guardrails });
      await page.fill("input.verify_code", otp);
      await page.click("input[type=submit]");
    } else throw new Error("OTP required");
  }

  await page.waitForURL(authRedirectUrl);
  await page.close();
}

async function claim(url: string, context: BrowserContext, authSecret?: string) {
  const page = await context.newPage();
  await page.goto(url);

  page.on("request", async (request) => {
    if (!authSecret) return;
    const tfaUrl = "https://login.unity.com/en/sign-in/tfa";
    if (request.isNavigationRequest() && request.url().startsWith(tfaUrl)) {
      console.log("Two factor authentication required, generating OTP...");
      const guardrails = createGuardrails({ MIN_SECRET_BYTES: 10 });
      const otp = await generate({ secret: authSecret, guardrails });
      await page.getByPlaceholder("Authentication code").fill(otp);
      await page.getByRole("button", { name: "Continue" }).click();
    }
  });

  if (!isAuthenticated(page)) throw new UnauthorizedError();

  const isClaimed = await page
    .getByText("You purchased this item on")
    .waitFor({ state: "visible" })
    .then(() => true)
    .catch(() => false);

  if (isClaimed) throw new AlreadyClaimedError();

  await page.getByRole("button", { name: "Buy Now" }).click();
  const couponCode = await getCouponCode(context);

  await page.locator('[for="vatRegisteredNo"]').click();
  await page.locator('label[for="order_terms"]:visible').click();
  await page.locator(".summary-coupon input:visible").fill(couponCode);
  await page.locator(".summary-coupon button:visible").click();

  await page.getByRole("button", { name: "Pay now" }).locator("visible=true").click();
  await page.waitForLoadState();
}

const couponCodeUrl = "https://assetstore.unity.com/publisher-sale";

async function getCouponCode(context: BrowserContext) {
  const page = await context.newPage();
  await page.goto(couponCodeUrl);

  const text = await page.getByText("enter the coupon code").innerText();
  const [_, couponCode] = /enter the coupon code (\w+)/.exec(text)!;

  await page.close();
  return couponCode;
}

export default {
  platform: "assetstore.unity.com",
  isAuthenticated,
  authenticate,
  claim,
} satisfies Claimer;
