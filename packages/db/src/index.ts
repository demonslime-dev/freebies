import "@std/dotenv/load";
import { drizzle } from "drizzle-orm/node-postgres";
import { relations } from "./relations.ts";

const DATABASE_URL = Deno.env.get("DATABASE_URL");

if (!DATABASE_URL) {
  throw new Error("Missing DATABASE_URL environment variable");
}

export const db = drizzle(DATABASE_URL, { relations });

export * from "./relations.ts";
export * from "./schema.ts";
export * from "./utils.ts";
