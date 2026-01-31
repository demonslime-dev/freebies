import { AlreadyClaimedError, UnauthorizedError } from "@/common/errors.ts";
import { checkIsLoggedInToUnityAssetStoreUsingPage } from "@/unity/auth.ts";
import type { BrowserContext } from "patchright";

export async function claimFromUnityAssetStore(url: string, context: BrowserContext) {
  const page = await context.newPage();
  try {
    console.log("Navigating to product page");
    await page.goto(url);

    const isLoggedIn = await checkIsLoggedInToUnityAssetStoreUsingPage(page);
    if (!isLoggedIn) throw new UnauthorizedError();

    const isClaimed = await page.getByText("You purchased this item on").isVisible();
    if (isClaimed) throw new AlreadyClaimedError();

    await page.getByRole("button", { name: "Buy Now" }).click();

    await page.locator('[for="vatRegisteredNo"]').click();
    await page.locator('label[for="order_terms"]:visible').click();
    console.log("Getting coupon code");
    const couponCode = await getCouponCode(context);
    await page.locator(".summary-coupon input:visible").fill(couponCode);
    console.log("Applying coupon code");
    await page.locator(".summary-coupon button:visible").click();
    console.log("Claiming");
    await page.getByRole("button", { name: "Pay now" }).locator("visible=true").click();
    await page.waitForLoadState();
    console.log("Claimed successfully");
  } finally {
    await page.close();
  }
}

async function getCouponCode(context: BrowserContext) {
  const page = await context.newPage();

  try {
    await page.goto("https://assetstore.unity.com/publisher-sale");

    const text = await page.getByText("enter the coupon code").innerText();
    const [_, couponCode] = /enter the coupon code (\w+)/.exec(text)!;

    return couponCode;
  } finally {
    await page.close();
  }
}
