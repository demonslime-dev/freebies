import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { saveProduct } from "@freebies/db";
import type { CreateProductInput } from "@freebies/db/types";
import type { Scraper } from "./types.ts";

let products: CreateProductInput[] = [];
const sourceFiles = await readdir(join(import.meta.dirname, "sources"), { withFileTypes: true });
for (const file of sourceFiles.filter((entry) => entry.name.endsWith(".ts") && entry.name !== "types.ts")) {
  const module = await import(join(import.meta.dirname, "sources", file.name));
  const scraper: Scraper = module.default;
  // For testing purpose
  // if (scraper.platform !== "Unity") continue;
  const scrapedProducts = await scraper.scrape();
  products = [...products, ...scrapedProducts];
}

console.log("Saving products...");
products.forEach((product, index) => {
  console.log(`${index + 1}/${products.length} Saving product ${product.url}`);
  saveProduct(product).then(() => console.log(`${index + 1}/${products.length} Product Saved: ${product.url}`));
});
