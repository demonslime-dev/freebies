import type { CreateProductInput, ProductType } from "@freebies/db/types";

export interface Scraper {
  productType: ProductType;
  scrape(): Promise<CreateProductInput[]>;
}
