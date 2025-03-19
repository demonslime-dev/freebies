import { createBrowserContext } from "@/common/browser.js";
import logger from "@/common/logger.js";
import { Prisma } from "@prisma/client";
import { DateTime } from "luxon";

export async function getFreeAssetsFromFab(): Promise<Prisma.ProductCreateInput[]> {
  const assetsUrl = "https://www.fab.com";
  const context = await createBrowserContext();
  try {
    logger.info(`Getting free products from ${assetsUrl}`);
    const page = await context.newPage();
    await page.goto(assetsUrl);
    await page.getByRole("link", { name: "Limited-Time Free", exact: true }).click();
    await page.waitForTimeout(5000);

    const saleEndDateText = await page.getByText("Limited-Time Free").innerText();
    const dateTimeIsoStr = getDateFromString(saleEndDateText);

    const titleLocators = await page.locator("a.fabkit-Typography-root > div").all();
    const thumbnailLocators = await page.locator(".fabkit-Thumbnail-root > img").all();
    logger.info(`${thumbnailLocators.length} free products found`);

    const products: Prisma.ProductCreateInput[] = [];
    for (let i = 0; i < thumbnailLocators.length; i++) {
      const title = await titleLocators[i].innerText();
      let url = await titleLocators[i].locator("..").getAttribute("href");

      if (!url) {
        logger.error("Unable to retrieve product url");
        continue;
      }

      url = `https://www.fab.com${url}`;
      const imageUrl = await thumbnailLocators[i].getAttribute("src");

      if (!imageUrl) {
        logger.error("Unable to retrieve product url");
        continue;
      }

      products.push({
        title,
        url,
        images: [imageUrl],
        saleEndDate: new Date(dateTimeIsoStr),
      });
    }

    logger.info(`${products.length} free products retrieved`);
    return products;
  } finally {
    await context.browser()?.close();
  }
}

function getDateFromString(dateTimeString: string) {
  const match = dateTimeString.match(/(\w+)\s(\d+)\w+\s(\d+):(\d+)\s(AM|PM)\s(\w+)/);
  if (!match) throw new Error("Invalid date string");
  const [_, month, day, hours, minutes, period, zone] = match;
  const year = new Date().getUTCFullYear();
  const formattedDateTimeStr = `${year} ${month} ${day} ${hours}:${minutes} ${period}`;
  const dateTime = DateTime.fromFormat(formattedDateTimeStr, "yyyy MMM d t").setZone("America/New_York");
  const dateTimeIsoStr = dateTime.toUTC().toISO();
  if (!dateTimeIsoStr) throw Error("Invalid date string");
  return dateTimeIsoStr;
}
