import { and, eq } from "drizzle-orm";
import { type ResultAsync, errAsync, okAsync } from "neverthrow";
import { db } from "./index.ts";
import { authProvider, claimedProduct, product, storeAccount, user } from "./schema.ts";
import type {
  AuthProviderType,
  CreateProductInput,
  CreateStoreAccountInput,
  Product,
  StorageState,
  StoreAccount,
  StorePlatform,
  User,
} from "./types.ts";

export async function createUser(
  provider: AuthProviderType,
  providerUserId: string,
  userData: typeof user.$inferInsert,
): Promise<ResultAsync<User, Error>> {
  try {
    const [newUser] = await db.insert(user).values(userData).onConflictDoNothing().returning();
    await db.insert(authProvider).values({ provider, providerUserId, userId: newUser.id });
    return okAsync(newUser);
  } catch (error) {
    return errAsync(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function getUser(provider: AuthProviderType, providerUserId: string): Promise<ResultAsync<User, Error>> {
  try {
    const userOrNull = await db.query.user.findFirst({
      where: { authProviders: { provider, providerUserId } },
    });

    if (userOrNull) return okAsync(userOrNull);
    return errAsync(
      new Error(`No user found for the given provider: ${provider} and providerUserId: ${providerUserId}`),
    );
  } catch (error) {
    return errAsync(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function getOrCreateUser(
  provider: AuthProviderType,
  providerUserId: string,
  userData: typeof user.$inferInsert,
): Promise<ResultAsync<User, Error>> {
  try {
    const userResult = await getUser(provider, providerUserId);
    if (userResult.isOk()) return userResult;

    return await createUser(provider, providerUserId, userData);
  } catch (error) {
    return errAsync(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function getStoreAccounts(
  provider: AuthProviderType,
  providerUserId: string,
): Promise<ResultAsync<StoreAccount[], Error>> {
  try {
    const user = await getUser(provider, providerUserId);

    if (user.isErr()) {
      return errAsync(user.error);
    }

    const storeAccounts = await db.query.storeAccount.findMany({
      where: { userId: user.value.id },
    });

    return okAsync(storeAccounts);
  } catch (error) {
    return errAsync(error instanceof Error ? error : new Error(String(error)));
  }
}

export async function addStoreAccount(
  provider: AuthProviderType,
  providerUserId: string,
  credentials: Omit<CreateStoreAccountInput, "userId">,
): Promise<ResultAsync<StoreAccount, Error>> {
  try {
    const user = await getUser(provider, providerUserId);

    if (user.isErr()) {
      return errAsync(user.error);
    }

    const [linkedStoreAccount] = await db
      .insert(storeAccount)
      .values({ ...credentials, userId: user.value.id })
      .returning();

    return okAsync(linkedStoreAccount);
  } catch (error) {
    return errAsync(error instanceof Error ? error : new Error(String(error)));
  }
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
  return db.query.product.findMany({ where: { saleEndDate: { gt: new Date() }, claimable: { eq: true } } });
}

export function markNotClaimable(productId: Product["id"]) {
  return db.update(product).set({ claimable: false }).where(eq(product.id, productId));
}
