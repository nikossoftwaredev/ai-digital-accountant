import type { BrowserContext, Page } from "playwright";
import type { Platform, DebtCategory, Priority } from "@repo/shared";
import type { ClientCredentials } from "../utils/credentials";
import { logger } from "../utils/logger";

// ── Types ─────────────────────────────────────────────────────────

export interface ScrapedDebt {
  category: DebtCategory;
  amount: number;
  platform: Platform;
  priority: Priority;
  description: string | null;
  dueDate: Date | null;
  documentUrl?: string | null;
}

export interface ScrapeResult {
  success: boolean;
  debts: ScrapedDebt[];
  error?: string;
  errorType?: "LOGIN_FAILED" | "CAPTCHA" | "TIMEOUT" | "UI_CHANGED";
}

// ── Base Scraper ──────────────────────────────────────────────────

export abstract class BaseScraper {
  protected context: BrowserContext;
  protected page: Page | null = null;
  protected credentials: ClientCredentials;

  abstract readonly platform: Platform;
  abstract readonly name: string;

  constructor(context: BrowserContext, credentials: ClientCredentials) {
    this.context = context;
    this.credentials = credentials;
  }

  protected abstract login(): Promise<void>;
  protected abstract extractDebts(): Promise<ScrapedDebt[]>;
  protected abstract logout(): Promise<void>;

  private static readonly SCRAPE_TIMEOUT = 120_000;

  run = async (): Promise<ScrapeResult> => {
    const log = logger.child({ scraper: this.name });

    const scrapePromise = this.doScrape(log);
    const timeoutPromise = new Promise<ScrapeResult>((_, reject) =>
      setTimeout(() => reject(new Error("Scrape timeout exceeded (30s)")), BaseScraper.SCRAPE_TIMEOUT)
    );

    try {
      return await Promise.race([scrapePromise, timeoutPromise]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      log.error({ error: message }, "Scrape failed");
      const errorType = this.classifyError(message);
      return { success: false, debts: [], error: message, errorType };
    } finally {
      if (this.page) {
        await this.page.close().catch(() => {});
        this.page = null;
      }
    }
  };

  private doScrape = async (log: typeof logger): Promise<ScrapeResult> => {
    this.page = await this.context.newPage();
    log.info("Starting scrape");

    await this.login();
    log.info("Login successful");

    const debts = await this.extractDebts();
    log.info({ count: debts.length }, "Debts extracted");

    try {
      await this.logout();
    } catch {
      log.warn("Logout failed, continuing");
    }

    return { success: true, debts };
  };

  private classifyError = (
    message: string
  ): ScrapeResult["errorType"] => {
    const lower = message.toLowerCase();
    if (lower.includes("captcha")) return "CAPTCHA";
    if (lower.includes("login") || lower.includes("credentials"))
      return "LOGIN_FAILED";
    if (lower.includes("timeout") || lower.includes("navigation"))
      return "TIMEOUT";
    return "UI_CHANGED";
  };
}
