import env from "$common/env.ts";
import { relations } from "$db/relations.ts";
import { drizzle } from "drizzle-orm/node-postgres";

const db = drizzle(env.DATABASE_URL, { relations });

export default db;
