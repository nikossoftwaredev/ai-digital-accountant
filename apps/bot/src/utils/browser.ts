import { chromium, type Browser, type BrowserContext } from "playwright";
import { logger } from "./logger";

// ── Constants ─────────────────────────────────────────────────────

const MAX_CONCURRENT = 3;
const BROWSER_TIMEOUT = 30_000;
const HEADLESS = process.env.BROWSER_HEADLESS !== "false"; // headless by default, set BROWSER_HEADLESS=false for debugging

// ── Browser Pool ──────────────────────────────────────────────────

let browser: Browser | null = null;
let activeContexts = 0;

const getBrowser = async (): Promise<Browser> => {
  if (!browser || !browser.isConnected()) {
    logger.info("Launching Chromium browser");
    browser = await chromium.launch({
      headless: HEADLESS,
      args: ["--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage"],
    });
  }
  return browser;
};

export const createBrowserContext = async (): Promise<BrowserContext> => {
  if (activeContexts >= MAX_CONCURRENT) {
    throw new Error(
      `Max concurrent browser contexts reached (${MAX_CONCURRENT})`
    );
  }

  const b = await getBrowser();
  const context = await b.newContext({
    locale: "el-GR",
    timezoneId: "Europe/Athens",
    viewport: { width: 1280, height: 720 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  context.setDefaultTimeout(BROWSER_TIMEOUT);
  activeContexts++;

  logger.info({ activeContexts }, "Browser context created");
  return context;
};

export const closeBrowserContext = async (
  context: BrowserContext
): Promise<void> => {
  await context.close();
  activeContexts = Math.max(0, activeContexts - 1);
  logger.info({ activeContexts }, "Browser context closed");
};

export const shutdownBrowser = async (): Promise<void> => {
  if (browser) {
    await browser.close();
    browser = null;
    activeContexts = 0;
    logger.info("Browser shut down");
  }
};
