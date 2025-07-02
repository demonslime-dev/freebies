import { createBrowserContext } from "$common/browser.ts";
import { AlreadyClaimedError } from "$common/errors.ts";
import { notifyFailure, notifySuccess } from "$common/notifier.ts";
import { StorageState } from "$common/types.ts";
import { getUnclaimedProducts } from "$common/utils.ts";
import db, { addToClaimedProducts } from "$db/index.ts";
import { authState } from "$db/schema.ts";
import { Product, ProductType } from "$db/types.ts";
import { isLoggedInToFab, loginToFab } from "$fab/auth.ts";
import { claimFromFab } from "$fab/claimer.ts";
import { getFreeAssetsFromFab } from "$fab/scraper.ts";
import { isLoggedInToItchDotIo, loginToItchDotIo } from "$itch/auth.ts";
import { claimFromItchDotIo } from "$itch/claimer.ts";
import { getFreeAssetsFromItchDotIo } from "$itch/scraper.ts";
import { isLoggedInToUnityAssetStore, loginToUnityAssetStore } from "$unity/auth.ts";
import { claimFromUnityAssetStore } from "$unity/claimer.ts";
import { getFreeAssetsFromUnityAssetStore } from "$unity/scraper.ts";
import { noTryAsync } from "no-try";
import type { BrowserContext } from "playwright";

const fabProducts = await getFreeAssetsFromFab();
const unityProducts = await getFreeAssetsFromUnityAssetStore();
const itchProducts = await getFreeAssetsFromItchDotIo();

// const productsToClaim = await db.query.product.findMany({ where: { saleEndDate: { gt: new Date() } } });
const productsToClaim = [...fabProducts, ...unityProducts, ...itchProducts];
const groupedProducts = Map.groupBy(productsToClaim, (product) => product.productType);
const users = await db.query.user.findMany({ with: { authStates: true, claimedProducts: true } });

for (const { id: userId, email, password, authStates, claimedProducts } of users) {
  for (const { productType, storageState, authSecret } of authStates) {
    console.log(`Claiming products from ${productType} as ${email}`);
    let context = await createBrowserContext(storageState);

    const authenticate = () => authenticateAndSaveStorageState(email, password, authSecret, productType);
    const checkAuthState = () => getAuthChecker(productType)(context);

    console.log(`Checking authentication state for ${productType} as ${email}`);
    const [_, isAuthenticated] = await noTryAsync(checkAuthState, console.error);
    if (!isAuthenticated) {
      context.browser()?.close();

      console.log(`${email} is not logged in to ${productType}`);
      const [_, storageState] = await noTryAsync(authenticate, console.error);
      if (!storageState) continue;

      context = await createBrowserContext(storageState);
    }

    const products = groupedProducts.get(productType) ?? [];
    const unclaimedProducts = getUnclaimedProducts(products, claimedProducts);
    const claim = getClaimer(productType);

    const successfullyClaimedProducts: Product[] = [];
    const failedToClaimProducts: Product[] = [];
    for (const [i, product] of unclaimedProducts.entries()) {
      console.log(`${i + 1}/${products.length} Claiming ${product.url}`);

      if (claimedProducts.some(({ id }) => product.id === id)) {
        console.log("Already claimed");
        continue;
      }

      const [error] = await noTryAsync(() => claim(product.url, context), console.error);

      if (!error) {
        await noTryAsync(() => addToClaimedProducts(userId, product.id), console.error);
        successfullyClaimedProducts.push(product);
      } else {
        if (error instanceof AlreadyClaimedError) {
          await noTryAsync(() => addToClaimedProducts(userId, product.id), console.error);
          continue;
        }

        failedToClaimProducts.push(product);
      }
    }

    await context.browser()?.close();
    await noTryAsync(() => notifyFailure(email, productType, failedToClaimProducts), console.error);
    await noTryAsync(() => notifySuccess(email, productType, successfullyClaimedProducts), console.error);
  }
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
