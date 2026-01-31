import type { CreateProductInput } from "@freebies/db/types";
import { createBrowserContext, ProductPropertyNotFoundError } from "@freebies/utils";
import { fromPromise } from "neverthrow";
import type { BrowserContext } from "patchright";

type AlbumsSaleUrl = "https://itch.io/soundtracks/on-sale";
type AssetsSaleUrl = "https://itch.io/game-assets/on-sale";
type GamesSaleUrl = "https://itch.io/games/on-sale";

type ProductSaleUrl = AssetsSaleUrl | AlbumsSaleUrl | GamesSaleUrl;

export async function getFreeAssetsFromItchDotIo() {
  const freeAssets = await getFreeProducts("https://itch.io/game-assets/on-sale");
  const freeAlbums = await getFreeAlbumsFromItchDotIo();
  return freeAssets.concat(freeAlbums);
}

export function getFreeAlbumsFromItchDotIo() {
  return getFreeProducts("https://itch.io/soundtracks/on-sale");
}

export function getFreeGamesFromItchDotIo() {
  return getFreeProducts("https://itch.io/games/on-sale");
}

export async function getFreeProductsFromItchDotIo() {
  const freeAssets = await getFreeAssetsFromItchDotIo();
  const freeGames = await getFreeGamesFromItchDotIo();
  return freeAssets.concat(freeGames);
}

async function getFreeProducts(productSaleUrl: ProductSaleUrl): Promise<CreateProductInput[]> {
  const context = await createBrowserContext();

  try {
    console.log(`Getting free products from ${productSaleUrl}`);
    const page = await context.newPage();
    await page.goto(productSaleUrl);
    const productsFound = await page.locator(".game_count").first().innerText();
    const match = productsFound.match(/(\d+,?)+/);
    if (!match) throw new Error("Unable to get total products count");
    const totalProducts = parseInt(match[0].replace(",", ""));
    console.log(`${totalProducts} products found`);

    const gridLoader = page.locator(".grid_loader");
    const loadingSpinner = gridLoader.locator(".loader_spinner");
    const productsLocator = page.locator(".game_cell");

    while (await gridLoader.isVisible()) {
      console.log("Load more products");
      await fromPromise(gridLoader.scrollIntoViewIfNeeded(), console.error);
      await loadingSpinner.waitFor({ state: "hidden" });
      console.log(`${await productsLocator.count()}/${totalProducts} products loaded`);
    }

    const freeAssetLocators = await productsLocator.filter({ has: page.getByText("-100%") }).all();
    console.log(`${freeAssetLocators.length} free products found`);

    const productUrls: string[] = [];
    for (const [i, freeAssetLocator] of freeAssetLocators.entries()) {
      console.log(`${i + 1}/${freeAssetLocators.length} Getting free product URL`);
      const productUrlLocator = freeAssetLocator.locator(".title.game_link");

      const result = await fromPromise(productUrlLocator.getAttribute("href"), console.error);
      if (result.isErr() || result.value === null) {
        console.error("Unable to retrieve product URL");
        continue;
      } else productUrls.push(result.value);
    }

    await page.close();
    const products: CreateProductInput[] = [];
    for (const [i, productUrl] of productUrls.entries()) {
      console.log(`${i + 1}/${productUrls.length} Getting product details for ${productUrl}`);

      const result = await fromPromise(getProduct(context, productUrl), console.error);
      if (result.isErr() || result.value === null) {
        console.error("Unable to retrieve product details");
        continue;
      } else products.push(result.value);
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
      await page.getByText("Download or claim").locator("visible=true").first().click({ timeout: 1000 });
      return await page.locator(".date_format.end_date").getAttribute("title");
    };

    const result = await fromPromise(getDateString(), console.error);
    if (result.isErr() || result.value === null) throw new ProductPropertyNotFoundError("saleEndDate");

    return {
      url,
      title,
      images,
      saleEndDate: new Date(result.value.split(" ")[0]),
      productType: "Itch",
    };
  } finally {
    await page.close();
  }
}
