import { defineRelations } from "drizzle-orm";
import { authState, coupon, product, user, userToProduct } from "./schema.ts";

export const relations = defineRelations({ authState, product, user, userToProduct, coupon }, (r) => ({
  user: {
    authStates: r.many.authState({ from: r.user.id, to: r.authState.userId }),
    claimedProducts: r.many.product({
      from: r.user.id.through(r.userToProduct.userId),
      to: r.product.id.through(r.userToProduct.productId),
    }),
  },
  coupon: {
    user: r.one.user({ from: r.coupon.userId, to: r.user.id }),
  },
}));
