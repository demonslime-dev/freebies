import type { CreateProductInput } from "@freebies/db/types";
import { createBrowserContext } from "@freebies/utils";

export async function getFreeAssetsFromFab(): Promise<CreateProductInput[]> {
  const apiResponse = "https://www.fab.com/i/listings/prices-infos?*";
  const assetsUrl = "https://www.fab.com/limited-time-free";
  const context = await createBrowserContext();

  try {
    console.log(`Getting free products from ${assetsUrl}`);
    const page = await context.newPage();
    const response = page.waitForResponse(apiResponse);
    await page.goto(assetsUrl);
    const res = await response;
    const json = await res.json();
    const saleEndDate = json.offers[0].discountEndDate;

    const titleLocators = await page.locator("a.fabkit-Typography-root > div").all();
    const thumbnailLocators = await page.locator(".fabkit-Thumbnail-root > img").all();
    console.log(`${thumbnailLocators.length} free products found`);

    const products: CreateProductInput[] = [];
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

      products.push({
        title,
        url,
        images: [imageUrl],
        saleEndDate: new Date(saleEndDate),
        productType: "Fab",
      });
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
