import { devices, firefox } from 'playwright';

const launchBrowser = async () => await firefox.launch({ headless: true });

export const createBrowserContext = async (storageState?: PrismaJson.StorageState) => {
    const browser = await launchBrowser();
    const server = process.env.PROXY_SERVER;
    const proxy = server && storageState ? { server } : undefined;

    const context = await browser.newContext({
        ...devices['Desktop Firefox'],
        storageState,
        proxy
    });

    context.setDefaultNavigationTimeout(10 * 60 * 1000);
    return context;
}
