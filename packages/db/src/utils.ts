import { and, eq } from "drizzle-orm";
import { type ResultAsync, errAsync, okAsync } from "neverthrow";
import { db } from "./index.ts";
import { authProvider, claimedProduct, product, storeAccount, user } from "./schema.ts";
import type {
  AuthProviderType,
  CreateProductInput,
  Product,
  StorageState,
  StoreAccount,
  StorePlatform,
  User,
} from "./types.ts";

export async function getOrCreateUser(
  providerUserId: string,
  provider: AuthProviderType,
  name: string,
): Promise<ResultAsync<User, Error>> {
  const existingUser = await db.query.user.findFirst({
    where: { authProviders: { provider, providerUserId } },
  });

  if (existingUser) return okAsync(existingUser);
  const [newUser] = await db.insert(user).values({ name }).returning();
  await db.insert(authProvider).values({ userId: newUser.id, provider, providerUserId });
  return okAsync(newUser);
}

export async function getStoreAccounts(
  providerUserId: string,
  provider: AuthProviderType,
): Promise<ResultAsync<StoreAccount[], Error>> {
  const user = await db.query.user.findFirst({
    where: { authProviders: { provider, providerUserId } },
    with: { storeAccounts: true },
  });

  if (!user) {
    return errAsync(
      new Error(`No user found for the given provider: ${provider} and providerUserId: ${providerUserId}`),
    );
  }

  return okAsync(user.storeAccounts);
}

export async function saveProduct(values: CreateProductInput): Promise<Product> {
  const [result] = await db
    .insert(product)
    .values(values)
    .onConflictDoUpdate({
      target: [product.url, product.saleEndDate],
      set: values,
    })
    .returning();

  return result;
}

export async function saveStorageState(
  userId: User["id"],
  email: string,
  platform: StorePlatform,
  storageState: StorageState,
) {
  return await db
    .update(storeAccount)
    .set({ storageState })
    .where(and(eq(storeAccount.userId, userId), eq(storeAccount.email, email), eq(storeAccount.platform, platform)));
}

export async function addToClaimedProducts(userId: User["id"], productId: Product["id"]) {
  await db.insert(claimedProduct).values({ userId, productId }).onConflictDoNothing();
}

export function getUnclaimedProducts(products: Product[], claimed: Product[]) {
  return products.filter((p) => !claimed.some(({ url }) => p.url === url));
}

export function getProductsToClaim() {
  return db.query.product.findMany({ where: { saleEndDate: { gt: new Date() } } });
}
