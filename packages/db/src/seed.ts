import { db } from "./index.ts";
import { authProvider, storeAccount, user } from "./schema.ts";
import { storeAccountCredentials, telegramUserId } from "./seed-data.ts";
import type { CreateStoreAccountInput, StorePlatform } from "./types.ts";

const [{ id: userId }] = await db.insert(user).values({ name: "DEFAULT" }).returning({ id: user.id });
await db.insert(authProvider).values({ userId, provider: "telegram", providerUserId: telegramUserId.toString() });

for (const { email, password, authSecrets } of storeAccountCredentials) {
  for (const [platform, authSecret] of Object.entries(authSecrets)) {
    const data: CreateStoreAccountInput = {
      userId,
      platform: platform as StorePlatform,
      email,
      password,
      authSecret,
    };

    await db.insert(storeAccount).values(data);
  }
}
