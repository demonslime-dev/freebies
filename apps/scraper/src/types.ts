import type { CreateProductInput, StorePlatform } from "@freebies/db/types";

export interface Scraper {
  platform: StorePlatform;
  scrape(): Promise<CreateProductInput[]>;
}
