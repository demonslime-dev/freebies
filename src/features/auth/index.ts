import { authenticateAndSaveStorageState } from "$auth/utils.auth.ts";
import db from "$db/index.ts";
import { noTryAsync } from "no-try";

const users = await db.query.user.findMany({ with: { authStates: true } });

for (const { email, password, authStates } of users) {
  for (const { productType, authSecret } of authStates) {
    await noTryAsync(() => authenticateAndSaveStorageState(email, password, authSecret, productType), console.error);
  }
}
