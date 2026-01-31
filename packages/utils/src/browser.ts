import type { StorageState } from "@freebies/db/types";
import { chromium } from "patchright";

async function launchBrowser() {
  return await chromium.launch({
    channel: "chrome",
    headless: true,
  });
}

export async function createBrowserContext(storageState?: StorageState | null) {
  const browser = await launchBrowser();

  return await browser.newContext({
    viewport: null,
    storageState: storageState ?? undefined,
  });
}
