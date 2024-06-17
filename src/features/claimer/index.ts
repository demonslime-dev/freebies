import { createBrowserContext } from '@/common/browser.js';
import prisma from '@/common/database.js';
import { AlreadyClaimedError } from '@/common/errors.js';
import logger, { logError } from '@/common/logger.js';
import { notifyFailure, notifySuccess } from '@/common/notifier.js';
import { authenticateAndSaveStorageState, getAuthChecker } from '@auth/utils.auth.js';
import { AddToClaimedProducts, getClaimer } from '@claimer/utils.claimer.js';
import { Product, ProductType } from '@prisma/client';
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

const users = await prisma.user.findMany({ include: { productEntries: { include: { products: true } } } });

for (const { productEntries, ...user } of users) {
    for (const { productType, storageState, authSecret, products: claimedProducts } of productEntries) {
        logger.info(`Claiming products from ${productType} as ${user.email}`);
        let context = await createBrowserContext(storageState);

        const authenticate = () => authenticateAndSaveStorageState({ user, authSecret, productType });
        const isAuthenticated = getAuthChecker(productType);

        logger.info(`Checking authentication state for ${productType} as ${user.email}`);
        if (!await isAuthenticated(context)) {
            context.browser()?.close();

            logger.info(`${user.email} is not logged in to ${productType}`);
            const [_, storageState] = await noTryAsync(authenticate, logError);
            if (!storageState) continue;

            context = await createBrowserContext(storageState);
        }

        const assets = groupedProducts[productType];
        const claim = getClaimer(productType);

        const successfullyClaimedProducts: Product[] = [];
        const failedToClaimProducts: Product[] = [];
        for (const product of assets) {
            logger.info(`Claiming ${product.url}`);

            if (claimedProducts.includes(product)) {
                logger.info('Already claimed');
                continue;
            }

            const [error] = await noTryAsync(() => claim(product.url, context), logError);

            if (!error) {
                await noTryAsync(() => AddToClaimedProducts(product.id, user.id, productType), logError);
                successfullyClaimedProducts.push(product);
            } else {
                if (error instanceof AlreadyClaimedError) continue;
                failedToClaimProducts.push(product);
            }
        }

        await context.browser()?.close();
        await noTryAsync(() => notifyFailure(user.email, productType, failedToClaimProducts), logError);
        await noTryAsync(() => notifySuccess(user.email, productType, successfullyClaimedProducts), logError);
    }
}
