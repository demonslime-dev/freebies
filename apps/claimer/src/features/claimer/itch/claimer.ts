import { AlreadyClaimedError, UnauthorizedError } from "@/common/errors.ts";
import { checkIsLoggedInToItchDotIoUsingPage } from "@/itch/auth.ts";
import type { BrowserContext, Page } from "patchright";

export async function claimFromItchDotIo(url: string, context: BrowserContext) {
  const page = await context.newPage();
  try {
    console.log("Navigating to product page");
    await page.goto(url);

    const isLoggedIn = await checkIsLoggedInToItchDotIoUsingPage(page);
    if (!isLoggedIn) throw new UnauthorizedError();

    const isClaimed = await page.getByText(/You own this .+/).isVisible();
    if (isClaimed) throw new AlreadyClaimedError();

    await page.getByText("Download or claim").locator("visible=true").first().click({ timeout: 1000 });
    await page.getByText("No thanks, just take me to the downloads").click();

    let newPage: Page;
    const pages = context.pages();
    if (pages.length === 1) newPage = page;
    else newPage = pages[pages.indexOf(page) + 1];

    await newPage.getByRole("button", { name: "Claim" }).click();
    await newPage.getByText("You claimed this").waitFor();

    console.log("Claimed successfully");
    await newPage.close();
  } finally {
    await page.close();
  }
}
