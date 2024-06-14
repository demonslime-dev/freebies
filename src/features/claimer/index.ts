import { createBrowserContext } from '@/common/browser.js';
import prisma from '@/common/database.js';
import { AlreadyClaimedError } from '@/common/errors.js';
import { logError } from '@/common/logger.js';
import { notifyFailure, notifySuccess } from '@/common/notifier.js';
import { authenticateAndSaveStorageState, getAuthChecker } from '@/features/auth/index.js';
import { claimFromItchDotIo } from '@/features/claimer/itchdotio.claimer.js';
import { claimFromUnityAssetStore } from '@/features/claimer/unityassetstore.claimer.js';
import { claimFromUnrealMarketplace } from '@/features/claimer/unrealmarketplace.claimer.js';
import { ProductType } from '@prisma/client';
import { noTryAsync } from 'no-try';

const products = await prisma.product.findMany({ where: { saleEndDate: { gt: new Date() } } });

const groupedProducts: Record<ProductType, typeof products> = {
    [ProductType.Unreal]: [],
    [ProductType.Unity]: [],
    [ProductType.Itch]: []
}

for (const product of products) {
    switch (true) {
        case /^https:\/\/.+\.itch\.io/.test(product.url):
            groupedProducts[ProductType.Itch].push(product);
            break;
        case /^https:\/\/assetstore\.unity\.com/.test(product.url):
            groupedProducts[ProductType.Unity].push(product);
            break;
        case /^https:\/\/www\.unrealengine\.com/.test(product.url):
            groupedProducts[ProductType.Unreal].push(product);
            break;
    }
}

const users = await prisma.user.findMany({ include: { productEntries: true } });

for (const { productEntries, ...user } of users) {
    for (const { productType, storageState, authSecret } of productEntries) {
        let context = await createBrowserContext(storageState);

        const authenticate = () => authenticateAndSaveStorageState({ user, authSecret, productType });
        const isAuthenticated = getAuthChecker(productType);

        if (!await isAuthenticated(context)) {
            context.browser()?.close();

            const [error] = await noTryAsync(authenticate, logError);
            if (error) continue;

            const { storageState } = await prisma.productEntry.findUniqueOrThrow({
                where: { id: { userId: user.id, productType } },
                select: { storageState: true }
            });

            context = await createBrowserContext(storageState);
        }

        const assets = groupedProducts[productType];
        const claim = getClaimer(productType);

        for (const product of assets) {
            const [error] = await noTryAsync(() => claim(product.url, context), logError);
            if (!error) await noTryAsync(() => notifySuccess(user.email, product), logError);
            else {
                if (error instanceof AlreadyClaimedError) continue;
                await noTryAsync(() => notifyFailure(user.email, product, error), logError);
            }
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
