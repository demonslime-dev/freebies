import { createBrowserContext } from "@/common/browser.ts";
import { saveProduct } from "@/db/index.ts";
import { Product } from "@/db/types.ts";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

export async function getFreeAssetsFromFab(): Promise<Product[]> {
  const assetsUrl = "https://www.fab.com/limited-time-free";
  const context = await createBrowserContext();

  try {
    console.log(`Getting free products from ${assetsUrl}`);
    const page = await context.newPage();
    await page.goto(assetsUrl);

    const text = await page.getByText(/Limited-Time\sFree\s\(Until.+\)/).innerText();
    const saleEndDate = await getSaleEndDate(text);

    const titleLocators = await page.locator("a.fabkit-Typography-root > div").all();
    const thumbnailLocators = await page.locator(".fabkit-Thumbnail-root > img").all();
    console.log(`${thumbnailLocators.length} free products found`);

    const products: Product[] = [];
    for (const [i, thumbnailLocator] of thumbnailLocators.entries()) {
      const title = await titleLocators[i].innerText();
      let url = await titleLocators[i].locator("..").getAttribute("href");

      if (!url) {
        console.error("Unable to retrieve product url");
        continue;
      }

      url = `https://www.fab.com${url}`;
      const imageUrl = await thumbnailLocator.getAttribute("src");

      if (!imageUrl) {
        console.error("Unable to retrieve product url");
        continue;
      }

      console.log(`Saving product to database.. ${url}`);
      const product = await saveProduct({
        title,
        url,
        images: [imageUrl],
        saleEndDate: new Date(saleEndDate),
        productType: "Fab",
      });

      products.push(product);
    }

    console.log(`${products.length} free products retrieved`);
    return products;
  } catch (error) {
    console.error(error);
    return [];
  } finally {
    await context.browser()?.close();
  }
}

function getSaleEndDate(text: string) {
  const match = text.match(/\(Until\s(.+)\sET\)/);
  if (!match) throw new Error("Unable to match sale end date");
  const date = dayjs.tz(match[1], "MMMM D [at] h:mm A [ET]", "America/New_York");
  return date.utc().toISOString();
}
