import { db, saveStorageState } from "@freebies/db";
import type { ProductType, StorageState } from "@freebies/db/types";
import type { BrowserContext } from "patchright";
import { isLoggedInToFab, loginToFab } from "./sources/fab/auth.ts";
import { claimFromFab } from "./sources/fab/claimer.ts";
import { isLoggedInToItchDotIo, loginToItchDotIo } from "./sources/itch/auth.ts";
import { claimFromItchDotIo } from "./sources/itch/claimer.ts";
import { isLoggedInToUnityAssetStore, loginToUnityAssetStore } from "./sources/unity/auth.ts";
import { claimFromUnityAssetStore } from "./sources/unity/claimer.ts";

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

  await saveStorageState(userId, productType, storageState);

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
