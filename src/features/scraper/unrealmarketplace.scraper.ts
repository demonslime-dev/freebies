import { createBrowserContext } from "@/common/browser.js";
import { ProductPropertyNotFoundError } from '@/common/errors.js';
import logger from '@/common/logger.js';
import { Prisma } from '@prisma/client';
import { noTryAsync } from 'no-try';
import { Locator } from 'playwright';

export async function getFreeAssetsFromUnrealMarketPlace(): Promise<Prisma.ProductCreateInput[]> {
    const assetsUrl = 'https://www.unrealengine.com/marketplace/en-US/assets?count=20&sortBy=effectiveDate&sortDir=DESC&start=0&tag=4910';
    const context = await createBrowserContext();
    try {
        logger.info(`Getting free products from ${assetsUrl}`);
        const page = await context.newPage();
        await page.goto(assetsUrl, { waitUntil: 'networkidle' });
        await page.waitForTimeout(5000);

        const freeAssetLocators = await page.locator('article.asset').all();
        logger.info(`${freeAssetLocators.length} free products found`);

        const products: Prisma.ProductCreateInput[] = [];
        for (let i = 0; i < freeAssetLocators.length; i++) {
            logger.info(`${i + 1}/${freeAssetLocators.length} Getting product details`);
            const [error, product] = await noTryAsync(() => getProduct(freeAssetLocators[i]));

            if (!product) {
                logger.error(error, 'Unable to retrieve product details');
                continue;
            }

            products.push(product);
        }

        return products;
    } finally { await context.browser()?.close(); }
}

async function getProduct(containerLocator: Locator): Promise<Prisma.ProductCreateInput> {
    const titleLocator = containerLocator.locator('.info h3 a');

    const productUrl = await titleLocator.getAttribute('href');
    if (!productUrl) throw new ProductPropertyNotFoundError('url');
    const url = `https://www.unrealengine.com${productUrl}`;

    const title = await titleLocator.textContent();
    if (!title) throw new ProductPropertyNotFoundError('title');

    const imgUrl = await containerLocator.locator('.image-box img').getAttribute('src');
    if (!imgUrl) throw new ProductPropertyNotFoundError('images');

    return {
        url: url,
        title: title,
        images: [imgUrl],
        saleEndDate: getNextMonthTuesdayUTC()
    };
}

function getNextMonthTuesdayUTC() {
    const now = new Date();
    const currentMonth = now.getUTCMonth();
    const currentYear = now.getUTCFullYear();
    const date = new Date(Date.UTC(currentYear, currentMonth + 1, 1));

    // Find the first Tuesday of the next month
    while (date.getUTCDay() !== 2) date.setUTCDate(date.getUTCDate() + 1);

    return date;
}
