import { createBrowserContext } from '@/common/browser.js';
import prisma from '@/common/database.js';
import logger, { logError } from '@/common/logger.js';
import { notifyFailure, notifySuccess } from '@/common/notifier.js';
import { claimFromItchDotIo } from '@/features/claimer/itchdotio.claimer.js';
import { claimFromUnityAssetStore } from '@/features/claimer/unityassetstore.claimer.js';
import { claimFromUnrealMarketplace } from '@/features/claimer/unrealmarketplace.claimer.js';
import { groupedProducts } from '@/features/scraper/index.js';
import { ProductType } from '@prisma/client';
import { noTryAsync } from 'no-try';

const users = await prisma.user.findMany({ include: { productEntries: true } });

for (const user of users) {
    const userLogger = logger.child({ userID: user.id });

    userLogger.info('Checking for auth sessions');
    for (const { productType, storageState } of user.productEntries) {
        const sessionLogger = userLogger.child({ productType })
        const context = await createBrowserContext(storageState);
        const assets = groupedProducts[productType];
        const claimer = getClaimer(productType);

        sessionLogger.info('Claiming products');
        for (const product of assets) {
            const [error] = await noTryAsync(() => claimer(product.url, context), logError);
            if (!error) await noTryAsync(() => notifySuccess(user.email, product), logError);
            else await noTryAsync(() => notifyFailure(user.email, product, error), logError);
        }

        await context.browser()?.close();
    }
}

function getClaimer(productType: ProductType) {
    switch (productType) {
        case ProductType.Itch:
            return claimFromItchDotIo
        case ProductType.Unity:
            return claimFromUnityAssetStore
        case ProductType.Unreal:
            return claimFromUnrealMarketplace
    }
}
