import { createBrowserContext } from "$common/browser.ts";
import { saveProduct } from "$db/index.ts";
import { Product } from "$db/types.ts";
import { DateTime } from "luxon";

export async function getFreeAssetsFromFab(): Promise<Product[]> {
  const assetsUrl = "https://www.fab.com/limited-time-free";
  const context = await createBrowserContext();

  try {
    console.log(`Getting free products from ${assetsUrl}`);
    const page = await context.newPage();
    await page.goto(assetsUrl);
    // await page.getByRole("link", { name: "Limited-Time Free", exact: true }).click();
    await page.waitForTimeout(5000);

    const saleEndDateText = await page.getByText(/Limited-Time\sFree\s\(Until.+\)/).innerText();
    console.log(saleEndDateText);

    const dateTimeIsoStr = getDateFromString(saleEndDateText);

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
        saleEndDate: new Date(dateTimeIsoStr),
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

function getDateFromString(dateTimeString: string) {
  const match = dateTimeString.match(/(\w+)\s(\d+)\sat\s(\d+):(\d+)\s(AM|PM)\s(\w+)/);
  if (!match) throw new Error("Invalid date string");
  const [_, month, day, hours, minutes, period] = match;
  const year = new Date().getUTCFullYear();
  const formattedDateTimeStr = `${year} ${month} ${day} ${hours}:${minutes} ${period}`;
  const dateTime = DateTime.fromFormat(formattedDateTimeStr, "yyyy MMM d t").setZone("America/New_York");
  const dateTimeIsoStr = dateTime.toUTC().toISO();
  console.log(dateTimeIsoStr);

  if (!dateTimeIsoStr) throw Error("Invalid date string");
  return dateTimeIsoStr;
}
