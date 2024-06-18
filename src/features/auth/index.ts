import prisma from '@/common/database.js';
import { logError } from '@/common/logger.js';
import { authenticateAndSaveStorageState } from '@auth/utils.auth.js';
import { noTryAsync } from 'no-try';

const users = await prisma.user.findMany({ include: { productEntries: true } });

for (const { email, password, productEntries } of users) {
    for (const { productType, authSecret } of productEntries) {
        await noTryAsync(() => authenticateAndSaveStorageState(email, password, authSecret, productType), logError);
    }
}
