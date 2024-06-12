import prisma from '@/common/database.js';
import logger, { logError } from '@/common/logger.js';
import { getFreeAlbumsFromItchDotIo, getFreeAssetsFromItchDotIo } from '@/features/scraper/itchdotio.scraper.js';
import { getFreeAssetsFromUnityAssetStore } from '@/features/scraper/unityassetstore.scraper.js';
import { getFreeAssetsFromUnrealMarketPlace } from '@/features/scraper/unrealmarketplace.scraper.js';
import { Prisma, ProductType } from '@prisma/client';
import { noTryAsync } from 'no-try';

logger.info("Loading assets from itch.io");
const [_, freeAssetsFromItchDotIo = []] = await noTryAsync(() => getFreeAssetsFromItchDotIo(), logError);

logger.info("Loading albums from itch.io");
const [_1, freeAlbumsFromItchDotIo = []] = await noTryAsync(() => getFreeAlbumsFromItchDotIo(), logError);

logger.info("Loading assets from unityassetstore");
const [_2, freeAssetsFromUnityAssetStore = []] = await noTryAsync(() => getFreeAssetsFromUnityAssetStore(), logError);

logger.info("Loading assets from unrealmarketplace");
const [_3, freeAssetsFromUnrealMarketplace = []] = await noTryAsync(() => getFreeAssetsFromUnrealMarketPlace(), logError);

logger.info('Storing products data to database');
const products = [...freeAssetsFromItchDotIo, ...freeAlbumsFromItchDotIo, ...freeAssetsFromUnityAssetStore, ...freeAssetsFromUnrealMarketplace]
for (const product of products) {
    await noTryAsync(() => prisma.product.upsert({
        where: { url_saleEndDate: { url: product.url, saleEndDate: product.saleEndDate } },
        update: {},
        create: product,
    }), logError)
}

export const groupedProducts: Record<ProductType, Prisma.ProductCreateInput[]> = {
    [ProductType.Itch]: freeAssetsFromItchDotIo.concat(freeAlbumsFromItchDotIo),
    [ProductType.Unity]: freeAssetsFromUnityAssetStore,
    [ProductType.Unreal]: freeAssetsFromUnrealMarketplace
}
