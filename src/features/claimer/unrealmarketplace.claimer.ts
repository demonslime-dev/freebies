import { UnauthorizedError } from '@/common/errors.js';
import logger from '@/common/logger.js';
import { BrowserContext } from 'playwright';

export async function claimFromUnrealMarketplace(url: string, context: BrowserContext) {
    const page = await context.newPage();
    try {
        logger.info('Navigating to product page');
        await page.goto(url, { waitUntil: 'networkidle' });

        logger.info('Checking for authentication state');
        if (!await page.locator('unrealengine-navigation[isloggedin="true"]').isVisible()) throw new UnauthorizedError();
        if (await page.getByRole('link', { name: 'Open in Launcher' }).isVisible()) {
            logger.info('Already claimed');
            return;
        }

        logger.info('Claiming');
        await page.getByRole('button', { name: 'Buy Now' }).click();
        const frameLocator = page.frameLocator('#webPurchaseContainer iframe');
        await frameLocator.getByRole('button', { name: 'Place Order' }).click();
        await frameLocator.getByText('Thank you!').waitFor();
        logger.info('Claimed successfully');
    } finally { await page.close(); }
}
