import { authState, product, user, userToProduct } from "@/db/schema.ts";
import { defineRelations } from "drizzle-orm";

export const relations = defineRelations({ authState, product, user, userToProduct }, (r) => ({
  user: {
    authStates: r.many.authState({ from: r.user.id, to: r.authState.userId }),
    claimedProducts: r.many.product({
      from: r.user.id.through(r.userToProduct.userId),
      to: r.product.id.through(r.userToProduct.productId),
    }),
  },
}));
