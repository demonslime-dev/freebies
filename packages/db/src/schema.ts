import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  json,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import type { StorageState } from "./types.ts";

export const user = pgTable("user", {
  id: serial().primaryKey(),
  name: varchar().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
});

const authProviderTypes = ["telegram", "discord", "google"] as const;
export const authProviderType = pgEnum("auth_provider-type", authProviderTypes);

export const authProvider = pgTable(
  "auth_provider",
  {
    id: serial().primaryKey(),
    userId: integer()
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    provider: authProviderType().notNull(),
    providerUserId: varchar().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (t) => [unique().on(t.provider, t.providerUserId)],
);

export const storePlatforms = ["assetstore.unity.com", "fab.com", "itch.io"] as const;
export const storePlatform = pgEnum("store_platform", storePlatforms);

export const storeAccountStatusValues = ["valid", "invalid", "needs_relogin"] as const;
export const storeAccountStatus = pgEnum("store_account_status", storeAccountStatusValues);

export const storeAccount = pgTable(
  "store_account",
  {
    id: serial().primaryKey(),
    status: storeAccountStatus().notNull().default("valid"),
    platform: storePlatform().notNull(),
    email: varchar().notNull(),
    password: varchar().notNull(),
    authSecret: text(),
    data: json().default(sql`'{}'::json`),
    storageState: json().$type<StorageState>(),
    userId: integer()
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => [unique().on(t.userId, t.platform, t.email)],
);

export const product = pgTable(
  "product",
  {
    id: serial().primaryKey(),
    url: text().notNull(),
    title: text().notNull(),
    images: text()
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    saleEndDate: timestamp().notNull(),
    platform: storePlatform().notNull(),
    claimable: boolean().notNull().default(true),
  },
  (t) => [unique().on(t.url, t.saleEndDate)],
);

export const claimedProduct = pgTable(
  "claimed_product",
  {
    userId: integer()
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    productId: integer()
      .references(() => product.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => [primaryKey({ name: "id", columns: [t.userId, t.productId] })],
);
