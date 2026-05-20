import { sql } from "drizzle-orm";
import {
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
});

export const sources = ["assetstore.unity.com", "fab.com", "itch.io"] as const;

export const sourceType = pgEnum("source_type", sources);

export const productSource = pgTable(
  "product_source",
  {
    id: serial().primaryKey(),
    sourceType: sourceType().notNull(),
    email: varchar().notNull(),
    password: varchar().notNull(),
    authSecret: text(),
    data: json().default(sql`'{}'::json`),
    storageState: json().$type<StorageState>(),
    userId: integer()
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => [unique().on(t.userId, t.sourceType, t.email)],
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
    sourceType: sourceType().notNull(),
  },
  (t) => [unique().on(t.url, t.saleEndDate)],
);

export const userToProduct = pgTable(
  "user_to_product",
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
