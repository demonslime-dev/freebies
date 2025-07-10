import { createBrowserContext } from "@/common/browser.ts";
import { AlreadyClaimedError } from "@/common/errors.ts";
import { notifyFailure, notifySuccess } from "@/common/notifier.ts";
import {
  addToClaimedProducts,
  authenticateAndSaveStorageState,
  getAuthChecker,
  getClaimer,
  getUnclaimedProducts,
} from "@/common/utils.ts";
import { getFreeAssetsFromFab } from "@/fab/scraper.ts";
import { getFreeAssetsFromItchDotIo } from "@/itch/scraper.ts";
import { getFreeAssetsFromUnityAssetStore } from "@/unity/scraper.ts";
import { db } from "@freebies/db";
import type { Product } from "@freebies/db/types";
import { noTryAsync } from "no-try";

const fabProducts = await getFreeAssetsFromFab();
const unityProducts = await getFreeAssetsFromUnityAssetStore();
const itchProducts = await getFreeAssetsFromItchDotIo();

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
