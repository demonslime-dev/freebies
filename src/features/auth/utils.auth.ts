import { isLoggedInToFab, loginToFab } from "$auth/fab.auth.ts";
import { isLoggedInToItchDotIo, loginToItchDotIo } from "$auth/itch.auth.ts";
import { isLoggedInToUnityAssetStore, loginToUnityAssetStore } from "$auth/unity.auth.ts";
import db from "$db/index.ts";
import { authState } from "$db/schema.ts";
import { ProductType } from "$db/types.ts";

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

export function getAuthChecker(productType: ProductType) {
  switch (productType) {
    case "Itch":
      return isLoggedInToItchDotIo;
    case "Unity":
      return isLoggedInToUnityAssetStore;
    case "Fab":
      return isLoggedInToFab;
  }
}

export function getAuthenticator(productType: ProductType) {
  switch (productType) {
    case "Itch":
      return loginToItchDotIo;
    case "Unity":
      return loginToUnityAssetStore;
    case "Fab":
      return loginToFab;
  }
}
