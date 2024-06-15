import prisma from '@/common/database.js';
import logger, { logError } from '@/common/logger.js';
import { authenticateAndSaveStorageState } from '@auth/utils.auth.js';
import { noTryAsync } from 'no-try';

const users = await prisma.user.findMany({ include: { productEntries: true } });

for (const { productEntries, ...user } of users) {
    for (const { productType, authSecret } of productEntries) {
        logger.info(`Logging in to ${productType} as ${user.email}`);
        await noTryAsync(() => authenticateAndSaveStorageState({ user, authSecret, productType }), logError);
    }
}
