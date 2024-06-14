import { createBrowserContext } from '@/common/browser.js';
import logger from '@/common/logger.js';
import { authenticator } from 'otplib';
import { BrowserContext } from 'playwright';

export async function loginToItchDotIo(email: string, password: string, authSecret: string | null): Promise<PrismaJson.StorageState> {
    const context = await createBrowserContext({ cookies: [], origins: [] });
    try {
        const page = await context.newPage();
        logger.info('Navigating to login page');
        await page.goto('https://itch.io/login');
        logger.info('Filling login credentials');
        await page.getByLabel('Username or email').fill(email);
        await page.getByLabel('Password').fill(password);

        // logger.info('Waiting to reCaptcha to complete successfully');
        // const reCaptchaFrame = page.frameLocator('iframe[title="reCAPTCHA"]');
        // const checkbox = reCaptchaFrame.locator('#recaptcha-anchor[aria-checked="true"]');
        // await checkbox.waitFor({ state: 'visible', timeout: 10 * 60 * 1000 });

        logger.info('Logging in');
        await page.getByRole('button', { name: 'Log in', exact: true }).click();

        if (authSecret) {
            logger.info('Filling in 2FA code');
            await page.getByLabel('Verification code').fill(authenticator.generate(authSecret))
            await page.getByRole('button', { name: 'Log in', exact: true }).click();
        }

        logger.info('Waiting for redirect after login');
        await page.waitForURL(/https:\/\/itch\.io\/(my-feed|dashboard)/);
        logger.info('Logged in successfully');
        return await context.storageState();
    } finally { await context.browser()?.close(); }
}

export async function isLoggedInToItchDotIo(context: BrowserContext) {
    logger.info('Checking authentication state for ItchDotIo');
    const page = await context.newPage();

    try {
        await page.goto('https://itch.io/');
        return await page.locator('.logged_in').isVisible();
    } finally { await page.close() }
}
