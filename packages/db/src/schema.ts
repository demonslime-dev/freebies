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

export const productType = pgEnum("productType", ["Fab", "Unity", "Itch"]);

export const user = pgTable("user", {
  id: serial().primaryKey(),
  name: varchar().notNull(),
  email: varchar().notNull().unique(),
  password: varchar().notNull(),
});

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
    productType: productType().notNull(),
  },
  (t) => [unique().on(t.url, t.saleEndDate)],
);

export const userToProduct = pgTable(
  "userToProduct",
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

export const authState = pgTable(
  "authState",
  {
    id: serial().primaryKey(),
    productType: productType().notNull(),
    storageState: json().$type<StorageState>(),
    authSecret: text(),
    userId: integer()
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => [unique().on(t.userId, t.productType)],
);

export const coupon = pgTable("coupon", {
  id: serial().primaryKey(),
  code: varchar().unique().notNull(),
  userId: integer().references(() => user.id, { onDelete: "cascade" }),
});
