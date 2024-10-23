import { createBrowserContext } from "@/common/browser.js";
import { ProductPropertyNotFoundError } from '@/common/errors.js';
import logger from '@/common/logger.js';
import { Prisma } from '@prisma/client';

export async function getFreeAssetsFromUnityAssetStore(): Promise<Prisma.ProductCreateInput[]> {
    const assetUrl = 'https://assetstore.unity.com/publisher-sale';
    const context = await createBrowserContext();
    try {
        logger.info(`Getting free products from ${assetUrl}`);
        const page = await context.newPage();
        await page.goto(assetUrl, { waitUntil: 'domcontentloaded', });

        logger.info('Getting sale end date');
        const endTimeText = await page.getByText('* Sale and related free asset promotion end').innerText();
        const regex = /(\w+)\s(\d+),\s(\d+)\sat\s(\d+:\d+)(am|pm)\s(\w+)/i;
        const [_1, month, date, year, time, modifier, timezone] = regex.exec(endTimeText)!;
        const dateString = `${month} ${date}, ${year} ${convertTo24HourFormat(time, modifier)} ${timezone.replace('PT', 'GMT-0700')}`;

        const getYourGiftLocator = page.getByRole('link', { name: 'Get your gift' });
        const saleContainerLocator = getYourGiftLocator.locator('../..');

        logger.info('Getting product image');
        const imageUrl = await saleContainerLocator.locator('img').getAttribute('src');
        if (!imageUrl) throw new ProductPropertyNotFoundError('images');

        logger.info('Getting product URL');
        await getYourGiftLocator.click();
        const url = page.url();

        logger.info('Getting product title');
        const title = await page.getByRole('heading', { level: 1 }).textContent();
        // const title = (await page.title()).split("|").shift()?.trim();
        if (!title) throw new ProductPropertyNotFoundError('title');

        logger.info('1 free product retrieved');

        return [{
            url: url,
            title: title,
            images: [imageUrl],
            saleEndDate: new Date(dateString)
        }];
    } finally { await context.browser()?.close(); }
}

function convertTo24HourFormat(time: string, modifier: string | 'am' | 'pm') {
    const [hours, minutes] = time.split(':');
    let hoursIn24 = parseInt(hours, 10);

    if (modifier === 'pm' && hoursIn24 < 12) hoursIn24 += 12;
    if (modifier === 'am' && hoursIn24 === 12) hoursIn24 = 0;

    return `${hoursIn24}:${minutes}`;
}
