import { db } from "@freebies/db";
import { sql } from "drizzle-orm";

await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE;`);
await db.execute(sql`CREATE SCHEMA public;`);
