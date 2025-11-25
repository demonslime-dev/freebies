import { createBrowserContext } from "@/common/browser.ts";
import { ProductPropertyNotFoundError } from "@/common/errors.ts";
import type { CreateProductInput } from "@freebies/db/types";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

export async function getFreeAssetsFromUnityAssetStore(): Promise<CreateProductInput[]> {
  const assetUrl = "https://assetstore.unity.com/publisher-sale";
  const context = await createBrowserContext();
  try {
    console.log(`Getting free products from ${assetUrl}`);
    const page = await context.newPage();
    await page.goto(assetUrl, { waitUntil: "domcontentloaded" });

    console.log("Getting sale end date");
    const text = await page.getByText("* Sale and related free asset promotion end").innerText();
    const saleEndDate = getSaleEndDate(text);

    const getYourGiftLocator = page.getByRole("link", {
      name: "Get your gift",
    });
    const saleContainerLocator = getYourGiftLocator.locator("../..");

    console.log("Getting product image");
    const imageUrl = await saleContainerLocator.locator("img").getAttribute("src");
    if (!imageUrl) throw new ProductPropertyNotFoundError("images");

    console.log("Getting product URL");
    await getYourGiftLocator.click();
    const url = page.url();

    console.log("Getting product title");
    const title = await page.getByRole("heading", { level: 1 }).textContent();
    // const title = (await page.title()).split("|").shift()?.trim();
    if (!title) throw new ProductPropertyNotFoundError("title");

    console.log("1 free product retrieved");

    return [
      {
        url: url,
        title: title,
        images: [imageUrl],
        saleEndDate: new Date(saleEndDate),
        productType: "Unity",
      },
    ];
  } catch (error) {
    console.error(error);
    return [];
  } finally {
    await context.browser()?.close();
  }
}

function getSaleEndDate(text: string): string {
  const match = text.match(/end\s(.+)\sPT/);
  if (!match) throw new Error("Unable to match sale end date");
  const date = dayjs.tz(match[1], "MMMM D, YYYY [at] h:mma", "America/Los_Angeles");
  return date.utc().toISOString();
}
