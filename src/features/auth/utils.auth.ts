import prisma from '@/common/database.js';
import logger from '@/common/logger.js';
import { isLoggedInToItchDotIo, loginToItchDotIo } from '@auth/itchdotio.auth.js';
import { isLoggedInToUnityAssetStore, loginToUnityAssetStore } from '@auth/unityassetstore.auth.js';
import { isLoggedInToUnrealMarketplace, loginToUnrealMarketPlace } from '@auth/unrealmarketplace.auth.js';
import { ProductType } from '@prisma/client';

export async function authenticateAndSaveStorageState(email: string, password: string, authSecret: string | null, productType: ProductType) {
    logger.info(`Logging in to ${productType} as ${email}`);

    const authenticate = getAuthenticator(productType);
    const storageState = await authenticate(email, password, authSecret);
    const { id: userId } = await prisma.user.findUniqueOrThrow({ where: { email } });

    await prisma.productEntry.upsert({
        where: { userId_productType: { userId, productType } },
        create: { userId, productType, storageState },
        update: { storageState },
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
