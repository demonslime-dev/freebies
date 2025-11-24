import { db } from "@freebies/db";
import { authState, coupon, user } from "@freebies/db/schema";
import type { ProductType, User } from "@freebies/db/types";
import { eq } from "drizzle-orm";

export async function updateCoupon(couponId: number, userId: User["id"]) {
  await db.update(coupon).set({ userId }).where(eq(coupon.id, couponId));
}

export async function createOrUpdateUser(userId: User["id"] | null | undefined, data: Omit<User, "id">) {
  if (userId) {
    const [{ id }] = await db.update(user).set(data).where(eq(user.id, userId)).returning();
    return id;
  }

  const [{ id }] = await db
    .insert(user)
    .values(data)
    .onConflictDoUpdate({ set: data, target: [user.email] })
    .returning();

  return id;
}

export async function createOrUpdateAuthState(userId: User["id"], productType: ProductType, authSecret?: string) {
  if (!authSecret || !authSecret.trim()) return;

  await db
    .insert(authState)
    .values({ userId, productType, authSecret })
    .onConflictDoUpdate({
      set: { authSecret },
      target: [authState.userId, authState.productType],
    });
}
