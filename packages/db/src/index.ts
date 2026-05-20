// import { drizzle } from 'drizzle-orm/neon-http';
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "./env.ts";
import { relations } from "./relations.ts";
import * as schema from "./schema.ts";

export const db = drizzle(env.DATABASE_URL, {
  schema,
  relations,
  casing: "snake_case",
});

export * from "./relations.ts";
export * from "./schema.ts";
export * from "./utils.ts";
