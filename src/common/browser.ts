import { devices, firefox } from 'playwright';

const launchBrowser = async () => await firefox.launch({ headless: true });

export const createBrowserContext = async (storageState?: PrismaJson.StorageState | null) => {
    const browser = await launchBrowser();
    const server = process.env.PROXY_SERVER;
    const proxy = server && storageState ? { server } : undefined;

    const context = await browser.newContext({
        ...devices['Desktop Firefox'],
        storageState: storageState ?? undefined,
        proxy
    });

    context.setDefaultNavigationTimeout(60 * 1000);
    return context;
}
