import { StorageState } from "$db/types.ts";
import { chromium, devices } from "playwright";

const launchBrowser = async () => await chromium.launch({ headless: true });

export const createBrowserContext = async (storageState?: StorageState | null) => {
  const browser = await launchBrowser();

  return await browser.newContext({
    ...devices["Desktop Chrome"],
    storageState: storageState ?? undefined,
  });
};
