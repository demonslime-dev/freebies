import { createBrowserContext } from '@/common/browser.js';
import logger from '@/common/logger.js';
import { authenticator } from 'otplib';

export async function loginToUnrealMarketPlace(email: string, password: string, authSecret: string | null): Promise<PrismaJson.StorageState> {
    const context = await createBrowserContext({ cookies: [], origins: [] });
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
