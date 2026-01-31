import { saveProduct } from "@freebies/db";
import { getFreeAssetsFromFab } from "./sources/fab.ts";
import { getFreeAssetsFromItchDotIo } from "./sources/itch.ts";
import { getFreeAssetsFromUnityAssetStore } from "./sources/unity.ts";

const fabProducts = await getFreeAssetsFromFab();
const unityProducts = await getFreeAssetsFromUnityAssetStore();
const itchProducts = await getFreeAssetsFromItchDotIo();

const products = [...fabProducts, ...unityProducts, ...itchProducts];

console.log("Saving products...");
products.forEach((product, index) => {
  console.log(`${index + 1}/${products.length} Saving product ${product.url}`);
  saveProduct(product).then(() => console.log(`${index + 1}/${products.length} Product Saved: ${product.url}`));
});
