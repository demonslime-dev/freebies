import { createBrowserContext } from '@/common/browser.js';
import logger from '@/common/logger.js';

export async function loginToUnityAssetStore(email: string, password: string, authSecret: string | null): Promise<PrismaJson.StorageState> {
    const context = await createBrowserContext({ cookies: [], origins: [] });
    try {
        const page = await context.newPage();
        logger.info('Navigating to login page');
        await page.goto('https://id.unity.com/en');
        logger.info('Filling login credentials');
        await page.getByLabel('Email').fill(email);
        await page.getByLabel('Password').fill(password);
        logger.info('Logging in');
        await page.click('input[type=submit]');
        logger.info('Waiting for redirect after logging in');
        await page.waitForURL('https://id.unity.com/en/account/edit');
        logger.info('Logged in successfully');
        return await context.storageState();
    } finally { await context.browser()?.close(); }
}
