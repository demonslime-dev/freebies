import logger, { logError } from '@/common/logger.js';
import { getFreeAssetsFromFab } from '@scraper/fab.scraper.js';
import { getFreeAssetsFromItchDotIo } from '@scraper/itchdotio.scraper.js';
import { getFreeAssetsFromUnityAssetStore } from '@scraper/unityassetstore.scraper.js';
import { saveProductToDatabase } from '@scraper/utils.scraper.js';
import { noTryAsync } from 'no-try';

const [_, freeAssetsFromFab = []] = await noTryAsync(() => getFreeAssetsFromFab(), logError);
const [_1, freeAssetsFromUnityAssetStore = []] = await noTryAsync(() => getFreeAssetsFromUnityAssetStore(), logError);
const [_2, freeProductsFromItchDotIo = []] = await noTryAsync(() => getFreeAssetsFromItchDotIo(), logError);

const products = [...freeAssetsFromFab, ...freeAssetsFromUnityAssetStore, ...freeProductsFromItchDotIo];
logger.info(`Total free products retrieved: ${products.length}`);
logger.info('Storing products data to database');
for (let i = 0; i < products.length; i++) {
    logger.info(`Storing product ${i + 1}/${products.length}`);
    await noTryAsync(() => saveProductToDatabase(products[i]), logError)
}

logger.info('Products data saved successfully');
