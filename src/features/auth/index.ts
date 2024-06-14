import prisma from '@/common/database.js';
import logger from '@/common/logger.js';
import { loginToItchDotIo } from '@/features/auth/itchdotio.auth.js';
import { loginToUnityAssetStore } from '@/features/auth/unityassetstore.auth.js';
import { loginToUnrealMarketPlace } from '@/features/auth/unrealmarketplace.auth.js';
import { ProductType } from '@prisma/client';
import { noTryAsync } from 'no-try';

const users = await prisma.user.findMany({ include: { productEntries: true } });

for (const { id: userId, email, password, productEntries } of users) {
    for (const { productType, authSecret } of productEntries) {
        const authenticate = getAuthenticator(productType);
        const [error, storageState] = await noTryAsync(() => authenticate(email, password, authSecret));

        if (error) {
            logger.error(error, `Failed to login to ${productType}`);
            continue;
        }
        
        await prisma.productEntry.update({
            where: { id: { userId, productType } },
            data: { storageState },
        })
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
