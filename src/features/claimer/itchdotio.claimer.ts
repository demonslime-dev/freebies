import { UnauthorizedError } from '@/common/errors.js';
import logger from '@/common/logger.js';
import { BrowserContext } from 'playwright';

export async function claimFromItchDotIo(url: string, context: BrowserContext) {
    const page = await context.newPage();
    try {
        logger.info('Navigating to product page');
        await page.goto(url);

        logger.info('Checking for authentication state');
        if (!await page.locator('.logged_in').isVisible()) throw new UnauthorizedError();
        if (await page.getByText(/You own this .+/).isVisible()) {
            logger.info('Already claimed');
            return;
        }

        logger.info('Claiming');
        await page.getByText('Download or claim').locator('visible=true').first().click({ timeout: 1000 });
        await page.getByText('No thanks, just take me to the downloads').click();
        await page.getByRole('button', { name: /Claim .+/ }).click();
        await page.getByText('You claimed this').waitFor();
        logger.info('Claimed successfully');
    } finally { await page.close(); }
}
