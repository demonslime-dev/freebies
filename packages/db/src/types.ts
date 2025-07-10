import type { authState, product, productType, user } from "./schema.ts";

export type Product = typeof product.$inferSelect;

export type CreateProductInput = typeof product.$inferInsert;

export type ProductType = (typeof productType.enumValues)[number];

export type AuthState = typeof authState.$inferSelect;

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
