import prisma from '@/common/database.js';
import logger, { logError } from '@/common/logger.js';
import { isLoggedInToItchDotIo, loginToItchDotIo } from '@/features/auth/itchdotio.auth.js';
import { isLoggedInToUnityAssetStore, loginToUnityAssetStore } from '@/features/auth/unityassetstore.auth.js';
import { isLoggedInToUnrealMarketplace, loginToUnrealMarketPlace } from '@/features/auth/unrealmarketplace.auth.js';
import { ProductType, User } from '@prisma/client';
import { noTryAsync } from 'no-try';

const users = await prisma.user.findMany({ include: { productEntries: true } });

for (const { productEntries, ...user } of users) {
    for (const { productType, authSecret } of productEntries) {
        logger.info(`Logging in to ${productType} with ${user.email}`);
        await noTryAsync(() => authenticateAndSaveStorageState({ user, authSecret, productType }), logError);
    }
}

interface AuthOption {
    user: User,
    productType: ProductType,
    authSecret: string | null,
}

export async function authenticateAndSaveStorageState({ user: { id: userId, email, password }, authSecret, productType }: AuthOption) {
    const authenticate = getAuthenticator(productType);
    const storageState = await authenticate(email, password, authSecret);

    await prisma.productEntry.update({
        where: { id: { userId, productType } },
        data: { storageState }
    });
}

export function getAuthChecker(productType: ProductType) {
    switch (productType) {
        case ProductType.Itch:
            return isLoggedInToItchDotIo
        case ProductType.Unity:
            return isLoggedInToUnityAssetStore
        case ProductType.Unreal:
            return isLoggedInToUnrealMarketplace
    }
}

function getAuthenticator(productType: ProductType) {
    switch (productType) {
        case ProductType.Itch:
            return loginToItchDotIo
        case ProductType.Unity:
            return loginToUnityAssetStore
        case ProductType.Unreal:
            return loginToUnrealMarketPlace
    }
}
