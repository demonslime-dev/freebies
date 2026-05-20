import { defineRelations } from "drizzle-orm";
import { product, productSource, user, userToProduct } from "./schema.ts";

export const relations = defineRelations({ productSource, product, user, userToProduct }, (r) => ({
  user: {
    productSources: r.many.productSource({ from: r.user.id, to: r.productSource.userId }),
    claimedProducts: r.many.product({
      from: r.user.id.through(r.userToProduct.userId),
      to: r.product.id.through(r.userToProduct.productId),
    }),
  },
}));
