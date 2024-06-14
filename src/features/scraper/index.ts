import prisma from '@/common/database.js';
import logger, { logError } from '@/common/logger.js';
import { getFreeProductsFromItchDotIo } from '@/features/scraper/itchdotio.scraper.js';
import { getFreeAssetsFromUnityAssetStore } from '@/features/scraper/unityassetstore.scraper.js';
import { getFreeAssetsFromUnrealMarketPlace } from '@/features/scraper/unrealmarketplace.scraper.js';
import { noTryAsync } from 'no-try';

const [_, freeAssetsFromUnrealMarketplace = []] = await noTryAsync(() => getFreeAssetsFromUnrealMarketPlace(), logError);
const [_1, freeAssetsFromUnityAssetStore = []] = await noTryAsync(() => getFreeAssetsFromUnityAssetStore(), logError);
const [_2, freeProductsFromItchDotIo = []] = await noTryAsync(() => getFreeProductsFromItchDotIo(), logError);

logger.info('Storing products data to database');
const products = [...freeAssetsFromUnrealMarketplace, ...freeAssetsFromUnityAssetStore, ...freeProductsFromItchDotIo];

for (let i = 0; i < products.length; i++) {
    logger.info(`Storing product ${i + 1}/${products.length}`);
    await noTryAsync(() => prisma.product.upsert({
        where: { url_saleEndDate: { url: products[i].url, saleEndDate: products[i].saleEndDate } },
        update: {},
        create: products[i],
    }), logError)
}

logger.info('Products data saved successfully');
