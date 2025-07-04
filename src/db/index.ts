import env from "$common/env.ts";
import { relations } from "$db/relations.ts";
import { product, userToProduct } from "$db/schema.ts";
import { CreateProductInput, Product, User } from "$db/types.ts";
import { drizzle } from "drizzle-orm/node-postgres";

const db = drizzle(env.DATABASE_URL, { relations });

export async function saveProduct(values: CreateProductInput): Promise<Product> {
  const [result] = await db
    .insert(product)
    .values(values)
    .onConflictDoUpdate({ target: [product.url, product.saleEndDate], set: values })
    .returning();

  return result;
}

export async function addToClaimedProducts(userId: User["id"], productId: Product["id"]) {
  await db.insert(userToProduct).values({ userId, productId }).onConflictDoNothing();
}

export default db;
