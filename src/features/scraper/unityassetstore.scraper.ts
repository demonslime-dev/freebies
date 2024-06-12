import { createBrowserContext } from "@/common/browser.js";
import { ProductPropertyNotFoundError } from '@/common/errors.js';
import logger from '@/common/logger.js';
import { Prisma } from '@prisma/client';

export async function getFreeAssetsFromUnityAssetStore(): Promise<Prisma.ProductCreateInput[]> {
    const assetUrl = 'https://assetstore.unity.com/publisher-sale';
    const context = await createBrowserContext();
    try {
        const page = await context.newPage();
        logger.info('Navigating to publisher sale page');
        await page.goto(assetUrl, { waitUntil: 'domcontentloaded', });

        logger.info('Getting product url');
        const getYourGiftLocator = page.getByRole('link', { name: 'Get your gift' });
        const url = await getYourGiftLocator.getAttribute('href');
        if (!url) throw new ProductPropertyNotFoundError('url');

        logger.info('Getting product title');
        const productDetailsLocator = getYourGiftLocator.locator('../..');
        const title = await productDetailsLocator.locator(':first-child > :first-child').textContent();
        if (!title) throw new ProductPropertyNotFoundError('title');

        logger.info('Getting product image');
        const productDetailsContainerLocator = productDetailsLocator.locator('..');
        const style = await productDetailsContainerLocator.locator('[style^="background-image:url"]').getAttribute('style');
        const [_, imageUrl] = /background-image:url\("(.*)"\);/.exec(style!)!;

        logger.info('Getting sale end date');
        const endTimeText = await page.getByText('* Sale and related free asset promotion end').innerText();
        const regex = /(\w+)\s(\d+),\s(\d+)\sat\s(\d+:\d+)(am|pm)\s(\w+)/i;
        const [_1, month, date, year, time, modifier, timezone] = regex.exec(endTimeText)!;
        const dateString = `${month} ${date}, ${year} ${convertTo24HourFormat(time, modifier)} ${timezone.replace('PT', 'GMT-0700')}`;

        logger.info('Product details retrieved successfully');

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
