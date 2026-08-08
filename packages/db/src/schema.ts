import { sql } from "drizzle-orm";
import { pgEnum, primaryKey, snakeCase, unique } from "drizzle-orm/pg-core";
import type { StorageState } from "./types.ts";

export const user = snakeCase.table("user", (t) => ({
  id: t.serial().primaryKey(),
  name: t.varchar().notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
}));

const authProviderTypes = ["telegram", "discord", "google"] as const;
export const authProviderType = pgEnum("auth_provider-type", authProviderTypes);

export const authProvider = snakeCase.table(
  "auth_provider",
  (t) => ({
    id: t.serial().primaryKey(),
    userId: t
      .integer()
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    provider: authProviderType().notNull(),
    providerUserId: t.varchar().notNull(),
    createdAt: t.timestamp().defaultNow().notNull(),
  }),
  (t) => [unique().on(t.provider, t.providerUserId)],
);

export const storePlatforms = ["assetstore.unity.com", "fab.com", "itch.io"] as const;
export const storePlatform = pgEnum("store_platform", storePlatforms);

export const storeAccountStatusValues = ["valid", "invalid", "needs_relogin"] as const;
export const storeAccountStatus = pgEnum("store_account_status", storeAccountStatusValues);

export const storeAccount = snakeCase.table(
  "store_account",
  (t) => ({
    id: t.serial().primaryKey(),
    status: storeAccountStatus().notNull().default("valid"),
    platform: storePlatform().notNull(),
    email: t.varchar().notNull(),
    password: t.varchar().notNull(),
    authSecret: t.text(),
    data: t.json().default(sql`'{}'::json`),
    storageState: t.json().$type<StorageState>(),
    userId: t
      .integer()
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
  }),
  (t) => [unique().on(t.userId, t.platform, t.email)],
);

export const product = snakeCase.table(
  "product",
  (t) => ({
    id: t.serial().primaryKey(),
    url: t.text().notNull(),
    title: t.text().notNull(),
    images: t
      .text()
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    saleEndDate: t.timestamp().notNull(),
    platform: storePlatform().notNull(),
    claimable: t.boolean().notNull().default(true),
  }),
  (t) => [unique().on(t.url, t.saleEndDate)],
);

export const claimedProduct = snakeCase.table(
  "claimed_product",
  (t) => ({
    userId: t
      .integer()
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    productId: t
      .integer()
      .references(() => product.id, { onDelete: "cascade" })
      .notNull(),
  }),
  (t) => [primaryKey({ name: "id", columns: [t.userId, t.productId] })],
);
