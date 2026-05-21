import { defineRelations } from "drizzle-orm";
import * as schema from "./schema.ts";

export const relations = defineRelations(schema, (r) => ({
  user: {
    authProviders: r.many.authProvider({ from: r.user.id, to: r.authProvider.userId }),
    storeAccounts: r.many.storeAccount({ from: r.user.id, to: r.storeAccount.userId }),
    claimedProducts: r.many.product({
      from: r.user.id.through(r.claimedProduct.userId),
      to: r.product.id.through(r.claimedProduct.productId),
    }),
  },
  userAuthProvider: {
    user: r.one.user({ from: r.authProvider.userId, to: r.user.id }),
  },
}));
