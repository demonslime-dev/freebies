import { authState, product, productType, user } from "$db/schema.ts";

export type Product = typeof product.$inferSelect;

export type CreateProductInput = typeof product.$inferInsert;

export type ProductType = (typeof productType.enumValues)[number];

export type AuthState = typeof authState.$inferSelect;

export type User = typeof user.$inferSelect;
