import { defineConfig } from "drizzle-kit";

const DATABASE_URL = Deno.env.get("DATABASE_URL");

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL,
  },
});
