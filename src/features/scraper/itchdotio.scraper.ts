import { createBrowserContext } from "@/common/browser.js";
import { ProductPropertyNotFoundError } from '@/common/errors.js';
import logger from "@/common/logger.js";
import { Prisma } from '@prisma/client';
import { noTryAsync } from 'no-try';
import { Locator } from 'playwright';

type AlbumsSaleUrl = 'https://itch.io/soundtracks/on-sale';
type AssetsSaleUrl = 'https://itch.io/game-assets/on-sale';
type GamesSaleUrl = 'https://itch.io/games/on-sale';

type ProductSaleUrl = AssetsSaleUrl | AlbumsSaleUrl | GamesSaleUrl;

export async function getFreeAssetsFromItchDotIo() {
    return getFreeProducts('https://itch.io/game-assets/on-sale');
}

export async function getFreeAlbumsFromItchDotIo() {
    return getFreeProducts('https://itch.io/soundtracks/on-sale');
}

export async function getFreeGamesFromItchDotIo() {
    return getFreeProducts('https://itch.io/games/on-sale');
}

export async function getFreeProductsFromItchDotIo() {
    logger.info('Getting free assets');
    const freeAssets = await getFreeAssetsFromItchDotIo();
    logger.info('Getting free albums & sounds');
    const freeAlbums = await getFreeAlbumsFromItchDotIo();
    logger.info('Getting free games');
    const freeGames = await getFreeGamesFromItchDotIo();

    return [...freeAssets, ...freeAlbums, ...freeGames];
}

async function getFreeProducts(productSaleUrl: ProductSaleUrl): Promise<Prisma.ProductCreateInput[]> {
    const context = await createBrowserContext();

    try {
        const page = await context.newPage();
        logger.info("Navigating to products page")
        await page.goto(productSaleUrl);
        const productsFound = await page.locator('.game_count').first().innerText();
        const match = productsFound.match(/(\d+,?)+/);
        if (!match) throw new Error("Unable to get total products count");
        const totalProducts = parseInt(match[0].replace(',', ''));
        logger.info(`${totalProducts} products found`);

        const gridLoader = page.locator('.grid_loader');
        const loadingSpinner = gridLoader.locator('.loader_spinner');
        const productsLocator = page.locator('.game_cell');

        logger.info(`${await productsLocator.count()} products loaded`);
        // TODO: Find difference between `gridLoader.count() > 0` & `gridLoader.isVisible()`
        while (await gridLoader.count() > 0) {
            logger.info("Load more products")
            await gridLoader.scrollIntoViewIfNeeded();
            if (await loadingSpinner.isVisible()) await loadingSpinner.waitFor({ state: 'hidden' });
            logger.info(`${await productsLocator.count()}/${totalProducts} products loaded`);
        }

        const freeAssetLocators = await productsLocator.filter({ has: page.getByText('-100%') }).all();
        logger.info(`${freeAssetLocators.length} free products found`);
        return await freeAssetLocators.reduce(reduceToProductsCallback, Promise.resolve([]));
    } finally { await context.browser()?.close(); }
}

async function reduceToProductsCallback(prev: Promise<Prisma.ProductCreateInput[]>, curr: Locator): Promise<Prisma.ProductCreateInput[]> {
    const prevValue = await prev;

    logger.info('Getting product url');
    const getHrefAttribute = () => curr.locator('.title.game_link').getAttribute('href');
    const [error, productUrl] = await noTryAsync(getHrefAttribute);

    if (!productUrl) {
        logger.error(error, 'Unable to retrieve product url');
        return prevValue;
    }

    logger.info('Getting product details');
    const [error1, product] = await noTryAsync(() => getProduct(productUrl));

    if (!product) {
        logger.error(error1, 'Unable to retrieve product details');
        return prevValue;
    }

    prevValue.push(product);
    return prevValue;
}

async function getProduct(url: string): Promise<Prisma.ProductCreateInput> {
    const context = await createBrowserContext();
    try {
        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        const title = await page.title();
        const imageLocators = await page.locator('.screenshot_list > a').all();

        const images = await imageLocators.reduce(reduceToImageUrlsCallback, Promise.resolve([]));

        const getDateString = async () => {
            await page.getByText('Download or claim').locator('visible=true').first().click({ timeout: 1000 });
            return await page.locator('.date_format.end_date').getAttribute('title');
        };

        const [error, date] = await noTryAsync(() => getDateString());

        if (!date) throw new ProductPropertyNotFoundError('saleEndDate', { cause: error });

        return {
            url,
            title,
            images,
            saleEndDate: new Date(date.split(' ')[0]),
        };
    } finally { await context.browser()?.close(); }
}

async function reduceToImageUrlsCallback(prev: Promise<string[]>, curr: Locator): Promise<string[]> {
    const prevValue = await prev;
    const [error, imageUrl] = await noTryAsync(() => curr.getAttribute('href'));

    if (!imageUrl) {
        logger.error(error, 'Unable to retrieve product image');
        return prevValue;
    }

    prevValue.push(imageUrl);
    return prevValue;
}
