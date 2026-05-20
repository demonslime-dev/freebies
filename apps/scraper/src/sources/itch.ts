import type { CreateProductInput } from "@freebies/db/types";
import { createBrowserContext, ProductPropertyNotFoundError } from "@freebies/utils";
import { fromPromise } from "neverthrow";
import type { BrowserContext } from "patchright";
import type { Scraper } from "../types.ts";

const albumsSaleUrl = "https://itch.io/soundtracks/on-sale";
const assetsSaleUrl = "https://itch.io/game-assets/on-sale";
const gamesSaleUrl = "https://itch.io/games/on-sale";

export async function getFreeAssetsFromItchDotIo() {
  const freeAssets = await getFreeProducts(assetsSaleUrl);
  const freeAlbums = await getFreeAlbumsFromItchDotIo();
  return freeAssets.concat(freeAlbums);
}

export function getFreeAlbumsFromItchDotIo() {
  return getFreeProducts(albumsSaleUrl);
}

export function getFreeGamesFromItchDotIo() {
  return getFreeProducts(gamesSaleUrl);
}

export async function getFreeProductsFromItchDotIo() {
  const freeAssets = await getFreeAssetsFromItchDotIo();
  const freeGames = await getFreeGamesFromItchDotIo();
  return freeAssets.concat(freeGames);
}

async function getFreeProducts(productSaleUrl: string): Promise<CreateProductInput[]> {
  const context = await createBrowserContext();

  try {
    // We still open a page because we need its execution context to parse HTML incredibly fast
    const page = await context.newPage();
    const productUrls: string[] = [];

    let pageNum = 1;
    let hasMore = true;

    console.log(`Getting free products from ${productSaleUrl} via background pagination...`);

    while (hasMore) {
      // 1. Fetch the raw JSON payload instead of waiting for infinite scroll UI
      const targetUrl = `${productSaleUrl}?page=${pageNum}&format=json`;
      const response = await context.request.get(targetUrl);

      if (!response.ok()) {
        console.error(`Failed to fetch page ${pageNum}`);
        break;
      }

      const data = await response.json();

      // If itch.io returns no content text, we've hit the end of the sale list
      if (!data.content || data.content.trim() === "") {
        hasMore = false;
        break;
      }

      // 2. Offload parsing to the browser's native engine in a single round-trip
      const urlsFromPage = await page.evaluate((htmlString) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, "text/html");
        const extractedUrls: string[] = [];

        const cells = doc.querySelectorAll(".game_cell");
        for (const cell of cells) {
          // Check if the item is 100% off
          if (cell.textContent?.includes("-100%")) {
            const href = cell.querySelector(".title.game_link")?.getAttribute("href");
            if (href) extractedUrls.push(href);
          }
        }
        return extractedUrls;
      }, data.content);

      productUrls.push(...urlsFromPage);
      console.log(`Page ${pageNum} parsed. Total free URLs collected: ${productUrls.length}`);

      pageNum++;
    }

    await page.close();
    console.log(`URL extraction complete. Found ${productUrls.length} total target items.`);

    // 3. Process the product details in concurrent batches to avoid a sequential bottleneck
    const products: CreateProductInput[] = [];
    const BATCH_SIZE = 3; // Opens 15 tabs at once. Adjust based on your system RAM.

    for (let i = 0; i < productUrls.length; i += BATCH_SIZE) {
      const batch = productUrls.slice(i, i + BATCH_SIZE);
      console.log(
        `Processing batch ${i / BATCH_SIZE + 1} (${i + 1} to ${Math.min(i + BATCH_SIZE, productUrls.length)})`,
      );

      const batchPromises = batch.map(async (url) => {
        const result = await fromPromise(getProduct(context, url), console.error);
        return result.isOk() ? result.value : null;
      });

      const batchResults = await Promise.all(batchPromises);

      // Filter out any pages that failed or returned null, then save
      const successfulProducts = batchResults.filter((p): p is CreateProductInput => p !== null);
      products.push(...successfulProducts);
    }

    console.log(`Successfully retrieved details for ${products.length} free products.`);
    return products;
  } catch (error) {
    console.error("Critical error inside getFreeProducts:", error);
    return [];
  } finally {
    await context.browser()?.close();
  }
}

// async function getFreeProducts(productSaleUrl: ProductSaleUrl): Promise<CreateProductInput[]> {
//   const context = await createBrowserContext();

//   try {
//     console.log(`Getting free products from ${productSaleUrl}`);
//     const page = await context.newPage();
//     await page.goto(productSaleUrl);
//     const productsFound = await page.locator(".game_count").first().innerText();
//     const match = productsFound.match(/(\d+,?)+/);
//     if (!match) throw new Error("Unable to get total products count");
//     const totalProducts = parseInt(match[0].replace(",", ""));
//     console.log(`${totalProducts} products found`);

//     const gridLoader = page.locator(".grid_loader");
//     const loadingSpinner = gridLoader.locator(".loader_spinner");
//     const productsLocator = page.locator(".game_cell");

//     while (await gridLoader.isVisible()) {
//       console.log("Load more products");
//       await fromPromise(gridLoader.scrollIntoViewIfNeeded(), console.error);
//       await loadingSpinner.waitFor({ state: "hidden" });
//       console.log(`${await productsLocator.count()}/${totalProducts} products loaded`);
//     }

//     console.log("Extracting free product URLs...");

//     const productUrls = await page.evaluate(() => {
//       const urls: string[] = [];
//       // Grab all product containers currently in the DOM
//       const cells = document.querySelectorAll(".game_cell");

//       for (const cell of cells) {
//         // Check if the cell contains the 100% off text
//         if (cell.textContent?.includes("-100%")) {
//           const link = cell.querySelector(".title.game_link");
//           const href = link?.getAttribute("href");

//           if (href) {
//             urls.push(href);
//           }
//         }
//       }
//       return urls;
//     });

//     console.log(`${productUrls.length} free products found and URLs extracted`);

//     // const freeAssetLocators = await productsLocator.filter({ has: page.getByText("-100%") }).all();
//     // console.log(`${freeAssetLocators.length} free products found`);

//     // const productUrls: string[] = [];
//     // for (const [i, freeAssetLocator] of freeAssetLocators.entries()) {
//     //   console.log(`${i + 1}/${freeAssetLocators.length} Getting free product URL`);
//     //   const productUrlLocator = freeAssetLocator.locator(".title.game_link");

//     //   const result = await fromPromise(productUrlLocator.getAttribute("href"), console.error);
//     //   if (result.isErr() || result.value === null) {
//     //     console.error("Unable to retrieve product URL");
//     //     continue;
//     //   } else productUrls.push(result.value);
//     // }

//     await page.close();
//     const products: CreateProductInput[] = [];
//     for (const [i, productUrl] of productUrls.entries()) {
//       console.log(`${i + 1}/${productUrls.length} Getting product details for ${productUrl}`);

//       const result = await fromPromise(getProduct(context, productUrl), console.error);
//       if (result.isErr() || result.value === null) {
//         console.error("Unable to retrieve product details");
//         continue;
//       } else products.push(result.value);
//     }

//     console.log(`${products.length} free products retrieved`);
//     return products;
//   } catch (error) {
//     console.error(error);
//     return [];
//   } finally {
//     await context.browser()?.close();
//   }
// }

async function getProduct(context: BrowserContext, url: string): Promise<CreateProductInput> {
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const title = await page.title();
    const imageLocators = await page.locator(".screenshot_list > a").all();

    const images: string[] = [];
    for (const imageLocator of imageLocators) {
      const result = await fromPromise(imageLocator.getAttribute("href"), console.error);
      if (result.isErr() || result.value === null) {
        console.error("Unable to retrieve product image");
        continue;
      } else images.push(result.value);
    }

    const getDateString = async () => {
      await page.getByText("Download or claim").locator("visible=true").first().click({ timeout: 5000 });
      return await page.locator(".date_format.end_date").getAttribute("title");
    };

    const result = await fromPromise(getDateString(), console.error);
    if (result.isErr() || result.value === null) throw new ProductPropertyNotFoundError("saleEndDate");

    return {
      url,
      title,
      images,
      saleEndDate: new Date(result.value.split(" ")[0]),
      sourceType: "itch.io",
    };
  } finally {
    await page.close();
  }
}

export default {
  sourceType: "itch.io",
  scrape: getFreeAssetsFromItchDotIo,
  // scrape: getFreeAlbumsFromItchDotIo,
} satisfies Scraper;
