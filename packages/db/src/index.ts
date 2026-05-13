import { drizzle } from "drizzle-orm/neon-http";
import { env } from "./env.ts";
import { relations } from "./relations.ts";

export const db = drizzle(env.DATABASE_URL, { relations });

export * from "./relations.ts";
export * from "./schema.ts";
export * from "./utils.ts";
