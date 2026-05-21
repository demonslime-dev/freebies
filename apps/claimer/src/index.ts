import { addToClaimedProducts, db, getProductsToClaim, getUnclaimedProducts, saveStorageState } from "@freebies/db";
import type { Product, StorePlatform } from "@freebies/db/types";
import { AlreadyClaimedError, createBrowserContext, notifyFailure, notifySuccess } from "@freebies/utils";
import { expandGlob } from "@std/fs";
import { fromPromise } from "neverthrow";
import type { Claimer } from "./types.ts";

const productsToClaim = await getProductsToClaim();
const groupedProducts = Map.groupBy(productsToClaim, (product) => product.platform);
const users = await db.query.user.findMany({ with: { storeAccounts: true, claimedProducts: true } });

const claimers = new Map<StorePlatform, Claimer>();
for await (const file of expandGlob("./sources/*.ts", { root: import.meta.dirname })) {
  const module = await import(file.path);
  const claimer: Claimer = module.default;
  claimers.set(claimer.platform, claimer);
}

for (const { id, name, storeAccounts, claimedProducts } of users) {
  for (const { userId, email, password, authSecret, storageState, platform } of storeAccounts) {
    console.log(`Claiming products from ${platform} as ${email}`);

    const products = groupedProducts.get(platform) ?? [];
    const unclaimedProducts = getUnclaimedProducts(products, claimedProducts);

    if (unclaimedProducts.length === 0) {
      console.log("No products to claim");
      continue;
    }

    const context = await createBrowserContext(storageState);
    const claimer = claimers.get(platform);
    if (!claimer) throw Error(`Couldn't get the claimer for ${platform}`);
    await claimer.authenticate({ email, password, authSecret }, context);
    await saveStorageState(userId, email, platform, await context.storageState());

    const successfullyClaimedProducts: Product[] = [];
    const failedToClaimProducts: Product[] = [];
    for (const [i, product] of unclaimedProducts.entries()) {
      console.log(`${i + 1}/${unclaimedProducts.length} Claiming ${product.url}`);

      if (claimedProducts.some(({ id }) => product.id === id)) {
        console.log("Already claimed");
        continue;
      }

      const result = await fromPromise(claimer.claim(product.url, context, authSecret), (error) => error);

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
    await fromPromise(notifyFailure(email, platform, failedToClaimProducts), console.error);
    await fromPromise(notifySuccess(email, platform, successfullyClaimedProducts), console.error);
  }
}
