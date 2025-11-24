import type { StorageState } from "@freebies/db/types";
import { chromium, devices } from "patchright";

const launchBrowser = async () => {
  return await chromium.launch({
    channel: "chrome",
    headless: true,
  });
};

export const createBrowserContext = async (storageState?: StorageState | null) => {
  const browser = await launchBrowser();

  return await browser.newContext({
    ...devices["Desktop Chrome"],
    storageState: storageState ?? undefined,
  });
};
