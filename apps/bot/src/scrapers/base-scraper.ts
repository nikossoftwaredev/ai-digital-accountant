import type { BrowserContext, Page } from "playwright";
import type { Platform, DebtCategory, Priority } from "@repo/shared";
import type { ClientCredentials } from "../utils/credentials";
import type { ScrapedFile } from "../ai";
import { logger } from "../utils/logger";
import { resetDebugLog, saveDebugMarkdown } from "../utils/debug-log";

// ── Types ─────────────────────────────────────────────────────────

export interface ScrapedDebt {
  category: DebtCategory;
  amount: number;
  platform: Platform;
  priority: Priority;
  description: string | null;
  dueDate: Date | null;
  documentUrl?: string | null;
  rfCode?: string | null;
  wireCode?: string | null;
}

export interface ScrapeResult {
  success: boolean;
  debts: ScrapedDebt[];
  /** Files collected during scraping (screenshots, PDFs, etc.) to upload to storage */
  files: ScrapedFile[];
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
  protected abstract extractDebts(): Promise<{ debts: ScrapedDebt[]; files: ScrapedFile[] }>;
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
      return { success: false, debts: [], files: [], error: message, errorType };
    } finally {
      if (this.page) {
        await this.page.close().catch(() => {});
        this.page = null;
      }
    }
  };

  private doScrape = async (log: typeof logger): Promise<ScrapeResult> => {
    resetDebugLog();
    this.page = await this.context.newPage();
    log.info("Starting scrape");

    saveDebugMarkdown(this.name, "start", {
      notes: `Scraper: ${this.name}\nPlatform: ${this.platform}\nStarted: ${new Date().toISOString()}`,
    });

    await this.login();
    log.info("Login successful");

    saveDebugMarkdown(this.name, "login-success", {
      notes: "Login completed successfully",
    });

    const { debts, files } = await this.extractDebts();
    log.info({ count: debts.length, files: files.length }, "Debts extracted");

    saveDebugMarkdown(this.name, "extraction-complete", {
      parsedResult: { debts, fileCount: files.length, fileNames: files.map((f) => f.fileName) },
      notes: `Debts: ${debts.length}\nFiles: ${files.length}\nTotal amount: ${debts.reduce((s, d) => s + d.amount, 0)}`,
    });

    try {
      await this.logout();
    } catch {
      log.warn("Logout failed, continuing");
    }

    return { success: true, debts, files };
  };

  /** Generate a compact filename: PLATFORM_LastName_DD-MM-YY */
  protected buildFileName = (label: string, ext: string): string => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yy = String(now.getFullYear()).slice(-2);
    const lastName = this.credentials.clientLastName.replace(/\s+/g, "-");
    return `${this.name}_${lastName}_${label}_${dd}-${mm}-${yy}.${ext}`;
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
