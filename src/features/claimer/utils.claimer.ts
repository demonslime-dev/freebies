import { claimFromFab } from "$claimer/fab.claimer.ts";
import { claimFromItchDotIo } from "$claimer/itch.claimer.ts";
import { claimFromUnityAssetStore } from "$claimer/unity.claimer.ts";
import db from "$db/index.ts";
import { userToProduct } from "$db/schema.ts";
import { Product, ProductType, User } from "$db/types.ts";

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

export async function addToClaimedProducts(productId: Product["id"], userId: User["id"]) {
  await db.insert(userToProduct).values({ userId, productId }).onConflictDoNothing();
}
