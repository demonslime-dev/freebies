import { AlreadyClaimedError, UnauthorizedError } from '@/common/errors.js';
import logger from "@/common/logger.js";
import { checkIsLoggedInToUnityAssetStoreUsingPage } from '@auth/unityassetstore.auth.js';
import { BrowserContext } from 'playwright';

export async function claimFromUnityAssetStore(url: string, context: BrowserContext) {
    const page = await context.newPage();
    try {
        logger.info('Navigating to product page');
        await page.goto(url, { waitUntil: 'load' });

        if (!await checkIsLoggedInToUnityAssetStoreUsingPage(page)) throw new UnauthorizedError();
        if (await page.getByText('You purchased this item on').isVisible()) throw new AlreadyClaimedError();
        await page.getByRole('button', { name: 'Buy Now' }).click();

        await page.locator('[for="vatRegisteredNo"]').click();
        await page.locator('label[for="order_terms"]:visible').click();
        logger.info('Getting coupon code');
        const couponCode = await getCouponCode(context);
        await page.locator('.summary-coupon input:visible').fill(couponCode);
        logger.info('Applying coupon code');
        await page.locator('.summary-coupon button:visible').click();
        logger.info('Claiming');
        await page.getByRole('button', { name: 'Pay now' }).locator('visible=true').click();
        await page.waitForLoadState();
        logger.info('Claimed successfully');
    } finally { await page.close(); }
}

async function getCouponCode(context: BrowserContext) {
    const page = await context.newPage();

    try {
        await page.goto('https://assetstore.unity.com/publisher-sale');

        const text = await page.getByText('enter the coupon code').innerText();
        const [_, couponCode] = /enter the coupon code (\w+)/.exec(text)!;

        return couponCode;
    } finally { await page.close(); }
}
