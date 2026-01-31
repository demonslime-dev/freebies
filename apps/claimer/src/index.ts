import { addToClaimedProducts, db, getProductsToClaim, getUnclaimedProducts } from "@freebies/db";
import type { Product } from "@freebies/db/types";
import { AlreadyClaimedError, createBrowserContext, notifyFailure, notifySuccess } from "@freebies/utils";
import { fromPromise } from "neverthrow";
import { authenticateAndSaveStorageState, getAuthChecker, getClaimer } from "./utils.ts";

const productsToClaim = await getProductsToClaim();
const groupedProducts = Map.groupBy(productsToClaim, (product) => product.productType);
const users = await db.query.user.findMany({ with: { authStates: true, claimedProducts: true } });

for (const { id: userId, email, password, authStates, claimedProducts } of users) {
  for (const { productType, storageState, authSecret } of authStates) {
    console.log(`Claiming products from ${productType} as ${email}`);

    const products = groupedProducts.get(productType) ?? [];
    const unclaimedProducts = getUnclaimedProducts(products, claimedProducts);
    const claim = getClaimer(productType);

    if (unclaimedProducts.length === 0) {
      console.log("No products to claim");
      continue;
    }

    let context = await createBrowserContext(storageState);

    const authenticate = () => authenticateAndSaveStorageState(email, password, authSecret, productType);
    const checkAuthState = () => getAuthChecker(productType)(context);

    console.log(`Checking authentication state for ${productType} as ${email}`);
    const result = await fromPromise(checkAuthState(), console.error);
    const isAuthenticated = result.isOk() && result.value;

    if (!isAuthenticated) {
      context.browser()?.close();

      console.log(`${email} is not logged in to ${productType}`);
      const result = await fromPromise(authenticate(), console.error);
      if (result.isErr() || !result.value) continue;

      context = await createBrowserContext(storageState);
    }

    const successfullyClaimedProducts: Product[] = [];
    const failedToClaimProducts: Product[] = [];
    for (const [i, product] of unclaimedProducts.entries()) {
      console.log(`${i + 1}/${unclaimedProducts.length} Claiming ${product.url}`);

      if (claimedProducts.some(({ id }) => product.id === id)) {
        console.log("Already claimed");
        continue;
      }

      const result = await fromPromise(claim(product.url, context), (error) => error);

      if (result.isOk()) {
        await fromPromise(addToClaimedProducts(userId, product.id), console.log);
        successfullyClaimedProducts.push(product);
      } else {
        if (result.error instanceof AlreadyClaimedError) {
          await fromPromise(addToClaimedProducts(userId, product.id), console.log);
          continue;
        }

        failedToClaimProducts.push(product);
      }
    }

    await context.browser()?.close();
    await fromPromise(notifyFailure(email, productType, failedToClaimProducts), console.error);
    await fromPromise(notifySuccess(email, productType, successfullyClaimedProducts), console.error);
  }
}
