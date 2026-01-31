import { db } from "./index.ts";
import { authState, product, userToProduct } from "./schema.ts";
import type { CreateProductInput, Product, ProductType, StorageState, User } from "./types.ts";

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

export async function saveStorageState(userId: User["id"], productType: ProductType, storageState: StorageState) {
  return await db
    .insert(authState)
    .values({ userId, productType, storageState })
    .onConflictDoUpdate({
      target: [authState.userId, authState.productType],
      set: { storageState },
    });
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
