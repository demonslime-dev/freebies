import { createBrowserContext } from '@/common/browser.js';
import logger from '@/common/logger.js';

export async function loginToItchDotIo(email: string, password: string): Promise<PrismaJson.StorageState> {
    const context = await createBrowserContext();
    try {
        const page = await context.newPage();
        logger.info('Navigating to login page');
        await page.goto('https://itch.io/login');
        logger.info('Filling login credentials');
        await page.getByLabel('Username or email').fill(email);
        await page.getByLabel('Password').fill(password);

        // TODO: Don't wait if captcha doesn't show up
        // logger.info('Waiting to reCaptcha to complete successfully');
        // const reCaptchaFrame = page.frameLocator('iframe[title="reCAPTCHA"]');
        // const checkbox = reCaptchaFrame.locator('#recaptcha-anchor[aria-checked="true"]');
        // await checkbox.waitFor({ state: 'visible', timeout: 10 * 60 * 1000 });

        logger.info('ReCaptcha completed successfully, logging in');
        await page.getByRole('button', { name: 'Log in', exact: true }).click();
        logger.info('Waiting for redirect after login');
        await page.waitForURL(/https:\/\/itch\.io\/(my-feed|dashboard)/);
        logger.info('Logged in successfully');
        return await context.storageState();
    } finally { await context.browser()?.close(); }
}
