import { createBrowserContext } from '@/common/browser.js';
import logger from '@/common/logger.js';

export async function loginToUnrealMarketPlace(email: string, password: string): Promise<PrismaJson.StorageState> {
    const context = await createBrowserContext();
    try {
        const page = await context.newPage();
        logger.info('Navigating to login page');
        await page.goto('https://www.unrealengine.com/id/login?lang=en_US');
        logger.info('Filling login credentials');
        await page.fill('#email', email);
        await page.click('button[type=submit]');
        await page.fill('#password', password);
        logger.info('Logging in');
        await page.click('button[type=submit]');
        await page.waitForURL('https://www.epicgames.com/account/personal');
        logger.info('Logged in successfully');
        return await context.storageState();
    } finally { await context.browser()?.close(); }
}
