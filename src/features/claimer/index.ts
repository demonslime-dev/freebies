import { authenticateAndSaveStorageState, getAuthChecker } from "$auth/utils.auth.ts";
import { addToClaimedProducts, getClaimer } from "$claimer/utils.claimer.ts";
import { createBrowserContext } from "$common/browser.ts";
import { AlreadyClaimedError } from "$common/errors.ts";
import { notifyFailure, notifySuccess } from "$common/notifier.ts";
import db from "$db/index.ts";
import { Product } from "$db/types.ts";
import { noTryAsync } from "no-try";

const productsToClaim = await db.query.product.findMany({
  where: { saleEndDate: { gt: new Date() } },
});

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
    const claim = getClaimer(productType);

    const successfullyClaimedProducts: Product[] = [];
    const failedToClaimProducts: Product[] = [];
    for (let i = 0; i < products.length; i++) {
      console.log(`${i + 1}/${products.length} Claiming ${products[i].url}`);

      // obj1 != obj2, even if both are identical
      // if (claimedProducts.includes(products[i])) {
      if (claimedProducts.some(({ id }) => products[i].id === id)) {
        console.log("Already claimed");
        continue;
      }

      const [error] = await noTryAsync(() => claim(products[i].url, context), console.error);

      if (!error) {
        await noTryAsync(() => addToClaimedProducts(products[i].id, userId), console.error);
        successfullyClaimedProducts.push(products[i]);
      } else {
        if (error instanceof AlreadyClaimedError) {
          await noTryAsync(() => addToClaimedProducts(products[i].id, userId), console.error);
          continue;
        }

        failedToClaimProducts.push(products[i]);
      }
    }

    await context.browser()?.close();
    await noTryAsync(() => notifyFailure(email, productType, failedToClaimProducts), console.error);
    await noTryAsync(() => notifySuccess(email, productType, successfullyClaimedProducts), console.error);
  }
}
