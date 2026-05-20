import { and, eq } from "drizzle-orm";
import { db } from "./index.ts";
import { product, productSource, userToProduct } from "./schema.ts";
import type { CreateProductInput, Product, SourceType, StorageState, User } from "./types.ts";

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
  sourceType: SourceType,
  storageState: StorageState,
) {
  // TODO: Implement this function to save the storage state for a user's product source.
  return await db
    .update(productSource)
    .set({ storageState })
    .where(
      and(eq(productSource.userId, userId), eq(productSource.email, email), eq(productSource.sourceType, sourceType)),
    );

  // return await db
  //   .insert(authState)
  //   .values({ userId, sourceType, storageState })
  //   .onConflictDoUpdate({
  //     target: [authState.userId, authState.sourceType],
  //     set: { storageState },
  //   });
}

export async function addToClaimedProducts(userId: User["id"], productId: Product["id"]) {
  await db.insert(userToProduct).values({ userId, productId }).onConflictDoNothing();
}

export function getUnclaimedProducts(products: Product[], claimed: Product[]) {
  return products.filter((p) => !claimed.some(({ url }) => p.url === url));
}

export function getProductsToClaim() {
  return db.query.product.findMany({ where: { saleEndDate: { gt: new Date() } } });
}
