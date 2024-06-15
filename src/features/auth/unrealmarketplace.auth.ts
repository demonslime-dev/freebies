import { createBrowserContext } from '@/common/browser.js';
import logger from '@/common/logger.js';
import { authenticator } from 'otplib';
import { BrowserContext, Page } from 'playwright';

export async function loginToUnrealMarketPlace(email: string, password: string, authSecret: string | null): Promise<PrismaJson.StorageState> {
    const context = await createBrowserContext({ cookies: [], origins: [] });
    try {
        const page = await context.newPage();
        logger.info('Navigating to login page');
        await page.goto('https://www.unrealengine.com/id/login?lang=en_US');
        logger.info('Filling login credentials');
        await page.fill('#email', email);
        // TODO: Bypass or solve captcha
        await page.click('button[type=submit]');
        await page.fill('#password', password);
        logger.info('Logging in');
        await page.click('button[type=submit]');

        if (authSecret) {
            logger.info('Filling in 2FA code');
            const otp = authenticator.generate(authSecret);

            for (let i = 0; i < otp.length; i++) {
                await page.fill(`input[name="code-input-${i}"]`, otp[i]);
            }

            await page.click('button[type=submit]');
        }

        await page.waitForURL('https://www.epicgames.com/account/personal');
        logger.info('Logged in successfully');
        return await context.storageState();
    } finally { await context.browser()?.close(); }
}

export async function checkIsLoggedInToUnrealMarketplaceUsingPage(page: Page) {
    try {
        return await page.locator('unrealengine-navigation[isloggedin="true"]').isVisible();
    } catch (error) { return false; }
}

export async function isLoggedInToUnrealMarketplace(context: BrowserContext) {
    const page = await context.newPage();

    try {
        return await checkIsLoggedInToUnrealMarketplaceUsingPage(page);
    } finally { await page.close(); }
}
