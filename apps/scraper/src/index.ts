import { saveProduct } from "@freebies/db";
import type { CreateProductInput } from "@freebies/db/types";
import { expandGlob } from "@std/fs";
import type { Scraper } from "./types.ts";

let products: CreateProductInput[] = [];
for await (const file of expandGlob("./sources/*.ts", { root: import.meta.dirname })) {
  const module = await import(file.path);
  const scraper: Scraper = module.default;
  // For testing purpose
  // if (scraper.productType !== "Unity") continue;
  const scrapedProducts = await scraper.scrape();
  products = [...products, ...scrapedProducts];
}

console.log("Saving products...");
products.forEach((product, index) => {
  console.log(`${index + 1}/${products.length} Saving product ${product.url}`);
  saveProduct(product).then(() => console.log(`${index + 1}/${products.length} Product Saved: ${product.url}`));
});
