import type { StorageState } from "@freebies/db/types";
import { chromium } from "patchright";

const launchBrowser = async () => {
  return await chromium.launch({
    channel: "chrome",
    headless: true,
  });
};

export const createBrowserContext = async (storageState?: StorageState | null) => {
  const browser = await launchBrowser();

  return await browser.newContext({
    viewport: null,
    storageState: storageState ?? undefined,
  });
};
