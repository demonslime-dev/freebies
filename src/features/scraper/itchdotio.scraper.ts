import { createBrowserContext } from "@/common/browser.js";
import { ProductPropertyNotFoundError } from '@/common/errors.js';
import logger, { logError } from "@/common/logger.js";
import { Prisma } from '@prisma/client';
import { noTryAsync } from 'no-try';
import { BrowserContext } from 'playwright';

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
    const freeAssets = await getFreeAssetsFromItchDotIo();
    const freeAlbums = await getFreeAlbumsFromItchDotIo();
    const freeGames = await getFreeGamesFromItchDotIo();

    return [...freeAssets, ...freeAlbums, ...freeGames];
}

async function getFreeProducts(productSaleUrl: ProductSaleUrl): Promise<Prisma.ProductCreateInput[]> {
    const context = await createBrowserContext();

    try {
        logger.info(`Getting free products from ${productSaleUrl}`);
        const page = await context.newPage();
        await page.goto(productSaleUrl);
        const productsFound = await page.locator('.game_count').first().innerText();
        const match = productsFound.match(/(\d+,?)+/);
        if (!match) throw new Error("Unable to get total products count");
        const totalProducts = parseInt(match[0].replace(',', ''));
        logger.info(`${totalProducts} products found`);

        const gridLoader = page.locator('.grid_loader');
        const loadingSpinner = gridLoader.locator('.loader_spinner');
        const productsLocator = page.locator('.game_cell');

        while (await gridLoader.isVisible()) {
            logger.info("Load more products")
            await noTryAsync(() => gridLoader.scrollIntoViewIfNeeded(), logError);
            await loadingSpinner.waitFor({ state: 'hidden' });
            logger.info(`${await productsLocator.count()}/${totalProducts} products loaded`);
        }

        const freeAssetLocators = await productsLocator.filter({ has: page.getByText('-100%') }).all();
        logger.info(`${freeAssetLocators.length} free products found`);

        const productUrls: string[] = [];
        for (let i = 0; i < freeAssetLocators.length; i++) {
            logger.info(`${i + 1}/${freeAssetLocators.length} Getting free product URL`);
            const productUrlLocator = freeAssetLocators[i].locator('.title.game_link');
            const [error, productUrl] = await noTryAsync(() => productUrlLocator.getAttribute('href'));

            if (!productUrl) {
                logger.error(error, 'Unable to retrieve product URL');
                continue;
            }

            productUrls.push(productUrl);
        }

        await page.close();
        const products: Prisma.ProductCreateInput[] = [];
        for (let i = 0; i < productUrls.length; i++) {
            logger.info(`${i + 1}/${productUrls.length} Getting product details for ${productUrls[i]}`);
            const [error, product] = await noTryAsync(() => getProduct(context, productUrls[i]));

            if (!product) {
                logger.error(error, 'Unable to retrieve product details');
                continue;
            }

            products.push(product);
        }

        return products;
    } finally { await context.browser()?.close(); }
}

async function getProduct(context: BrowserContext, url: string): Promise<Prisma.ProductCreateInput> {
    const page = await context.newPage();
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        const title = await page.title();
        const imageLocators = await page.locator('.screenshot_list > a').all();

        const images: string[] = [];
        for (const imageLocator of imageLocators) {
            const [error, imageUrl] = await noTryAsync(() => imageLocator.getAttribute('href'));

            if (!imageUrl) {
                logger.error(error, 'Unable to retrieve product image');
                continue;
            }

            images.push(imageUrl);
        }

        const getDateString = async () => {
            await page.getByText('Download or claim').locator('visible=true').first().click({ timeout: 1000 });
            return await page.locator('.date_format.end_date').getAttribute('title');
        };

        const [error, date] = await noTryAsync(() => getDateString());
        if (!date) throw new ProductPropertyNotFoundError('saleEndDate', { cause: error });

        return { url, title, images, saleEndDate: new Date(date.split(' ')[0]) };
    } finally { await page.close() }
}
