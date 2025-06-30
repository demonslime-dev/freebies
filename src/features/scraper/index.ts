import { getFreeAssetsFromFab } from "$scraper/fab.scraper.ts";
import { getFreeAssetsFromItchDotIo } from "$scraper/itch.scraper.ts";
import { getFreeAssetsFromUnityAssetStore } from "$scraper/unity.scraper.ts";
import { saveProductToDatabase } from "$scraper/utils.scraper.ts";
import { noTryAsync } from "no-try";

const [_, freeAssetsFromFab = []] = await noTryAsync(() => getFreeAssetsFromFab(), console.error);

const [_1, freeAssetsFromUnityAssetStore = []] = await noTryAsync(
  () => getFreeAssetsFromUnityAssetStore(),
  console.error,
);

const [_2, freeProductsFromItchDotIo = []] = await noTryAsync(() => getFreeAssetsFromItchDotIo(), console.error);

const products = [...freeAssetsFromFab, ...freeAssetsFromUnityAssetStore, ...freeProductsFromItchDotIo];

console.log(`Total free products retrieved: ${products.length}`);
console.log("Storing products data to database");
for (let i = 0; i < products.length; i++) {
  console.log(`Storing product ${i + 1}/${products.length}`);
  await noTryAsync(() => saveProductToDatabase(products[i]), console.error);
}

console.log("Products data saved successfully");
