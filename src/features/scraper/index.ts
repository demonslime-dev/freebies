import logger, { logError } from '@/common/logger.js';
import { getFreeProductsFromItchDotIo } from '@scraper/itchdotio.scraper.js';
import { getFreeAssetsFromUnityAssetStore } from '@scraper/unityassetstore.scraper.js';
import { getFreeAssetsFromUnrealMarketPlace } from '@scraper/unrealmarketplace.scraper.js';
import { SaveProductToDatabase } from '@scraper/utils.scraper.js';
import { noTryAsync } from 'no-try';

const [_, freeAssetsFromUnrealMarketplace = []] = await noTryAsync(() => getFreeAssetsFromUnrealMarketPlace(), logError);
const [_1, freeAssetsFromUnityAssetStore = []] = await noTryAsync(() => getFreeAssetsFromUnityAssetStore(), logError);
const [_2, freeProductsFromItchDotIo = []] = await noTryAsync(() => getFreeProductsFromItchDotIo(), logError);

logger.info('Storing products data to database');
const products = [...freeAssetsFromUnrealMarketplace, ...freeAssetsFromUnityAssetStore, ...freeProductsFromItchDotIo];

for (let i = 0; i < products.length; i++) {
    logger.info(`Storing product ${i + 1}/${products.length}`);
    await noTryAsync(() => SaveProductToDatabase(products[i]), logError)
}

logger.info('Products data saved successfully');
