import { createBrowserContext } from '@/common/browser.js';
import prisma from '@/common/database.js';
import { AlreadyClaimedError } from '@/common/errors.js';
import logger, { logError } from '@/common/logger.js';
import { notifyFailure, notifySuccess } from '@/common/notifier.js';
import { authenticateAndSaveStorageState, getAuthChecker } from '@auth/utils.auth.js';
import { AddToClaimedProducts, getClaimer } from '@claimer/utils.claimer.js';
import { Product, ProductType } from '@prisma/client';
import { noTryAsync } from 'no-try';

const productsToClaim = await prisma.product.findMany({ where: { saleEndDate: { gt: new Date() } } });

const groupedProducts: Record<ProductType, typeof productsToClaim> = {
    [ProductType.Unreal]: [],
    [ProductType.Unity]: [],
    [ProductType.Itch]: []
}

for (const product of productsToClaim) {
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

for (const { id, email, password, productEntries, } of users) {
    for (const { productType, storageState, authSecret, products: claimedProducts } of productEntries) {
        logger.info(`Claiming products from ${productType} as ${email}`);
        let context = await createBrowserContext(storageState);

        const authenticate = () => authenticateAndSaveStorageState(email, password, authSecret, productType);
        const checkAuthState = () => getAuthChecker(productType)(context);

        logger.info(`Checking authentication state for ${productType} as ${email}`);
        const [_, isAuthenticated] = await noTryAsync(checkAuthState, logError);
        if (!isAuthenticated) {
            context.browser()?.close();

            logger.info(`${email} is not logged in to ${productType}`);
            const [_, storageState] = await noTryAsync(authenticate, logError);
            if (!storageState) continue;

            context = await createBrowserContext(storageState);
        }

        const products = groupedProducts[productType];
        const claim = getClaimer(productType);

        const successfullyClaimedProducts: Product[] = [];
        const failedToClaimProducts: Product[] = [];
        for (let i = 0; i < products.length; i++) {
            logger.info(`${i + 1}/${products.length} Claiming ${products[i].url}`);

            if (claimedProducts.includes(products[i])) {
                logger.info('Already claimed');
                continue;
            }

            const [error] = await noTryAsync(() => claim(products[i].url, context), logError);

            if (!error) {
                await noTryAsync(() => AddToClaimedProducts(products[i].id, id, productType), logError);
                successfullyClaimedProducts.push(products[i]);
            } else {
                if (error instanceof AlreadyClaimedError) {
                    await noTryAsync(() => AddToClaimedProducts(products[i].id, id, productType), logError);
                    continue;
                }

                failedToClaimProducts.push(products[i]);
            }
        }

        await context.browser()?.close();
        await noTryAsync(() => notifyFailure(email, productType, failedToClaimProducts), logError);
        await noTryAsync(() => notifySuccess(email, productType, successfullyClaimedProducts), logError);
    }
}
