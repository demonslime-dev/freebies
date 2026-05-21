import { and, eq } from "drizzle-orm";
import { db } from "./index.ts";
import { claimedProduct, product, storeAccount } from "./schema.ts";
import type { CreateProductInput, Product, StorageState, StorePlatform, User } from "./types.ts";

export async function saveProduct(values: CreateProductInput): Promise<Product> {
  const [result] = await db
    .insert(product)
    .values(values)
    .onConflictDoUpdate({
      target: [product.url, product.saleEndDate],
      set: values,
    })
    .returning();

  return result;
}

export async function saveStorageState(
  userId: User["id"],
  email: string,
  platform: StorePlatform,
  storageState: StorageState,
) {
  // TODO: Implement this function to save the storage state for a user's product source.
  return await db
    .update(storeAccount)
    .set({ storageState })
    .where(and(eq(storeAccount.userId, userId), eq(storeAccount.email, email), eq(storeAccount.platform, platform)));

  // return await db
  //   .insert(authState)
  //   .values({ userId, platform, storageState })
  //   .onConflictDoUpdate({
  //     target: [authState.userId, authState.platform],
  //     set: { storageState },
  //   });
}

export async function addToClaimedProducts(userId: User["id"], productId: Product["id"]) {
  await db.insert(claimedProduct).values({ userId, productId }).onConflictDoNothing();
}

export function getUnclaimedProducts(products: Product[], claimed: Product[]) {
  return products.filter((p) => !claimed.some(({ url }) => p.url === url));
}

export function getProductsToClaim() {
  return db.query.product.findMany({ where: { saleEndDate: { gt: new Date() } } });
}
