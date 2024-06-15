import prisma from '@/common/database.js';
import logger from '@/common/logger.js';
import { isLoggedInToItchDotIo, loginToItchDotIo } from '@auth/itchdotio.auth.js';
import { isLoggedInToUnityAssetStore, loginToUnityAssetStore } from '@auth/unityassetstore.auth.js';
import { isLoggedInToUnrealMarketplace, loginToUnrealMarketPlace } from '@auth/unrealmarketplace.auth.js';
import { ProductType, User } from '@prisma/client';

interface AuthOption {
    user: User,
    authSecret: string | null,
    productType: ProductType
}

export async function authenticateAndSaveStorageState({ user: { id: userId, email, password }, authSecret, productType }: AuthOption) {
    logger.info(`Logging in to ${productType} as ${email}`);

    const authenticate = getAuthenticator(productType);
    const storageState = await authenticate(email, password, authSecret);

    await prisma.productEntry.update({
        where: { userId_productType: { userId, productType } },
        data: { storageState }
    });

    return storageState;
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

export function getAuthenticator(productType: ProductType) {
    switch (productType) {
        case ProductType.Itch:
            return loginToItchDotIo
        case ProductType.Unity:
            return loginToUnityAssetStore
        case ProductType.Unreal:
            return loginToUnrealMarketPlace
    }
}
