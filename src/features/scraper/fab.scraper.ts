import { createBrowserContext } from "@/common/browser.js";
import logger from '@/common/logger.js';
import { Prisma } from '@prisma/client';
import { convertTo24HourFormat } from '@scraper/utils.scraper.js';

export async function getFreeAssetsFromFab(): Promise<Prisma.ProductCreateInput[]> {
    const assetsUrl = 'https://www.fab.com';
    const context = await createBrowserContext();
    try {
        logger.info(`Getting free products from ${assetsUrl}`);
        const page = await context.newPage();
        await page.goto(assetsUrl);
        await page.getByRole('link', {name: 'Limited-Time Free'}).click();
        await page.waitForTimeout(5000);

        const saleEndDateText = await page.getByText('Limited-Time Free').innerText();
        const [_ , month, day, hours, period, zone] = saleEndDateText.match(/(\d+)\/(\d+)\s(\d+)(AM|PM)\s(\w+)/)!;
        const datetimeString = `${new Date().getUTCFullYear()}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${convertTo24HourFormat(hours, '0', period)}:00-05:00`;

        const titleLocators = await page.locator('a.fabkit-Typography-root > div').all();
        const thumbnailLocators = await page.locator('.fabkit-Thumbnail-root > img').all();
        logger.info(`${thumbnailLocators.length} free products found`);

        const products: Prisma.ProductCreateInput[] = [];
        for (let i = 0; i < thumbnailLocators.length; i++) {
            const title = await titleLocators[i].innerText();
            let url = await titleLocators[i].locator('..').getAttribute('href');

            if (!url) {
                logger.error("Unable to retrieve product url");
                continue;
            }

            url = `https://www.fab.com${url}`;
            const imageUrl = await thumbnailLocators[i].getAttribute('src');

            if (!imageUrl) {
                logger.error("Unable to retrieve product url");
                continue;
            }

            products.push({
                title,
                url,
                images: [imageUrl],
                saleEndDate: new Date(datetimeString)
            });
        }

        logger.info(`${products.length} free products retrieved`);
        return products;
    } finally { await context.browser()?.close(); }
}
