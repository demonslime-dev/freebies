import { createBrowserContext } from '@/common/browser.js';
import logger from '@/common/logger.js';
import { authenticator } from 'otplib';
import { BrowserContext, Page } from 'playwright';

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
        await page.waitForLoadState('load');
        const pageTitle = await page.title();

        if (pageTitle.includes("Verify your code")) {
            if (authSecret) {
                logger.info('Entering 2FA code');
                const otp = authenticator.generate(authSecret);
                await page.fill('input.verify_code', otp);
                await page.click('input[type=submit]');
            } else throw new Error("OTP required");
        }

        logger.info('Waiting for redirect after logging in');
        await page.waitForURL('https://id.unity.com/en/account/edit');
        logger.info('Logged in successfully');
        return await context.storageState();
    } finally { await context.browser()?.close(); }
}

export async function checkIsLoggedInToUnityAssetStoreUsingPage(page: Page) {
    try {
        await page.locator('[data-test="avatar"]').click();
        const isLoggedIn = await page.locator('#profile-option').isVisible();
        await page.locator('[data-test="avatar"]').click();
        return isLoggedIn;
    } catch (error) { return false; }
}

export async function isLoggedInToUnityAssetStore(context: BrowserContext) {
    const page = await context.newPage();

    try {
        return await checkIsLoggedInToUnityAssetStoreUsingPage(page);
    } finally { await page.close(); }
}
