import { isLoggedInToFab, loginToFab } from "@/fab/auth.ts";
import { claimFromFab } from "@/fab/claimer.ts";
import { isLoggedInToItchDotIo, loginToItchDotIo } from "@/itch/auth.ts";
import { claimFromItchDotIo } from "@/itch/claimer.ts";
import { isLoggedInToUnityAssetStore, loginToUnityAssetStore } from "@/unity/auth.ts";
import { claimFromUnityAssetStore } from "@/unity/claimer.ts";
import { db } from "@freebies/db";
import { authState, product, userToProduct } from "@freebies/db/schema";
import type { CreateProductInput, Product, ProductType, StorageState, User } from "@freebies/db/types";
import type { BrowserContext } from "patchright";

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

export async function addToClaimedProducts(userId: User["id"], productId: Product["id"]) {
  await db.insert(userToProduct).values({ userId, productId }).onConflictDoNothing();
}

export async function authenticateAndSaveStorageState(
  email: string,
  password: string,
  authSecret: string | null,
  productType: ProductType,
) {
  console.log(`Logging in to ${productType} as ${email}`);

  const authenticate = getAuthenticator(productType);
  const storageState = await authenticate(email, password, authSecret);
  const { id: userId } = await db.query.user
    .findFirst({ where: { email } })
    .then((user) => (user ? user : Promise.reject("User not found")));

  await db
    .insert(authState)
    .values({ userId, productType, storageState })
    .onConflictDoUpdate({
      target: [authState.userId, authState.productType],
      set: { storageState },
    });

  return storageState;
}

export type Authenticator = (email: string, password: string, authSecret: string | null) => Promise<StorageState>;
export function getAuthenticator(productType: ProductType): Authenticator {
  switch (productType) {
    case "Fab":
      return loginToFab;
    case "Unity":
      return loginToUnityAssetStore;
    case "Itch":
      return loginToItchDotIo;
  }
}

export type AuthChecker = (context: BrowserContext) => Promise<boolean>;
export function getAuthChecker(productType: ProductType): AuthChecker {
  switch (productType) {
    case "Fab":
      return isLoggedInToFab;
    case "Unity":
      return isLoggedInToUnityAssetStore;
    case "Itch":
      return isLoggedInToItchDotIo;
  }
}

export function getClaimer(productType: ProductType) {
  switch (productType) {
    case "Itch":
      return claimFromItchDotIo;
    case "Unity":
      return claimFromUnityAssetStore;
    case "Fab":
      return claimFromFab;
  }
}

export function getUnclaimedProducts(products: Product[], claimed: Product[]) {
  return products.filter((p) => !claimed.some(({ url }) => p.url === url));
}

export function getProductsToClaim() {
  return db.query.product.findMany({ where: { saleEndDate: { gt: new Date() } } });
}
