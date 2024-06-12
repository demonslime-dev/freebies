import { firefox } from 'playwright';

const launchBrowser = async () => await firefox.launch({ headless: true });

export const createBrowserContext = async (storageState?: PrismaJson.StorageState) => {
    const browser = await launchBrowser();
    const context = await browser.newContext({ storageState });
    context.setDefaultNavigationTimeout(10 * 60 * 1000);
    return context;
}
