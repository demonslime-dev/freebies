import { AlreadyClaimedError, UnauthorizedError } from "@/common/errors.ts";
import { checkIsLoggedInToFabUsingPage } from "@/fab/auth.ts";
import { BrowserContext } from "playwright";

export async function claimFromFab(url: string, context: BrowserContext) {
  const page = await context.newPage();
  try {
    console.log("Navigating to product page");
    await page.goto(url, { waitUntil: "networkidle" });

    const isLoggedIn = await checkIsLoggedInToFabUsingPage(page);
    if (!isLoggedIn) throw new UnauthorizedError();

    const isClaimed = await page.getByRole("link", { name: "Open in Launcher" }).isVisible();
    if (isClaimed) throw new AlreadyClaimedError();

    console.log("Claiming");
    await page.getByRole("button", { name: "Buy Now" }).click();
    const frameLocator = page.frameLocator("#webPurchaseContainer iframe");
    await frameLocator.getByRole("button", { name: "Place Order" }).click();
    await frameLocator.getByText("Thank you!").waitFor();
    console.log("Claimed successfully");
  } finally {
    await page.close();
  }
}
