import type { product, storeAccount, storePlatform, user } from "./schema.ts";

export type Product = typeof product.$inferSelect;

export type CreateProductInput = typeof product.$inferInsert;

export type CreateStoreAccountInput = typeof storeAccount.$inferInsert;

export type StorePlatform = (typeof storePlatform.enumValues)[number];

export type StoreAccount = typeof storeAccount.$inferSelect;

export type User = typeof user.$inferSelect;

export interface StorageState {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "Strict" | "Lax" | "None";
  }>;

  origins: Array<{
    origin: string;
    localStorage: Array<{ name: string; value: string }>;
  }>;
}
