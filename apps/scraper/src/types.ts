import type { CreateProductInput, SourceType } from "@freebies/db/types";

export interface Scraper {
  sourceType: SourceType;
  scrape(): Promise<CreateProductInput[]>;
}
