import { createBrowserContext } from "$common/browser.ts";
import { ProductPropertyNotFoundError } from "$common/errors.ts";
import { product } from "$db/schema.ts";
import { CreateProductInput } from "$db/types.ts";
import { noTryAsync } from "no-try";
import { BrowserContext } from "playwright";

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
      await noTryAsync(() => gridLoader.scrollIntoViewIfNeeded(), console.error);
      await loadingSpinner.waitFor({ state: "hidden" });
      console.log(`${await productsLocator.count()}/${totalProducts} products loaded`);
    }

    const freeAssetLocators = await productsLocator.filter({ has: page.getByText("-100%") }).all();
    console.log(`${freeAssetLocators.length} free products found`);

    const productUrls: string[] = [];
    for (let i = 0; i < freeAssetLocators.length; i++) {
      console.log(`${i + 1}/${freeAssetLocators.length} Getting free product URL`);
      const productUrlLocator = freeAssetLocators[i].locator(".title.game_link");
      const [error, productUrl] = await noTryAsync(() => productUrlLocator.getAttribute("href"));

      if (!productUrl) {
        console.error(error, "Unable to retrieve product URL");
        continue;
      }

      productUrls.push(productUrl);
    }

    await page.close();
    const products: CreateProductInput[] = [];
    for (let i = 0; i < productUrls.length; i++) {
      console.log(`${i + 1}/${productUrls.length} Getting product details for ${productUrls[i]}`);
      const [error, product] = await noTryAsync(() => getProduct(context, productUrls[i]));

      if (!product) {
        console.error(error, "Unable to retrieve product details");
        continue;
      }

      products.push(product);
    }

    console.log(`${products.length} free products retrieved`);
    return products;
  } finally {
    await context.browser()?.close();
  }
}

async function getProduct(context: BrowserContext, url: string): Promise<typeof product.$inferInsert> {
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const title = await page.title();
    const imageLocators = await page.locator(".screenshot_list > a").all();

    const images: string[] = [];
    for (const imageLocator of imageLocators) {
      const [error, imageUrl] = await noTryAsync(() => imageLocator.getAttribute("href"));

      if (!imageUrl) {
        console.error(error, "Unable to retrieve product image");
        continue;
      }

      images.push(imageUrl);
    }

    const getDateString = async () => {
      await page.getByText("Download or claim").locator("visible=true").first().click({ timeout: 1000 });
      return await page.locator(".date_format.end_date").getAttribute("title");
    };

    const [error, date] = await noTryAsync(() => getDateString());
    if (!date) throw new ProductPropertyNotFoundError("saleEndDate", { cause: error });

    return {
      url,
      title,
      images,
      saleEndDate: new Date(date.split(" ")[0]),
      productType: "Itch",
    };
  } finally {
    await page.close();
  }
}
