import type { Page } from "playwright";
import { extractDebtsFromPdf } from "./extract-from-pdf";
import type {
  AIIdentifiedDocument,
  AIExtractedDebt,
  ScrapedFile,
} from "./types";
import { logger } from "../utils/logger";
import { saveDebugMarkdown } from "../utils/debug-log";

const log = logger.child({ module: "download-analyze" });

/** Content type → extension mapping */
const EXTENSION_MAP: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-excel": ".xls",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

const guessContentType = (fileName: string): string => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/octet-stream";
};

interface DownloadResult {
  /** Additional debts extracted from downloaded documents */
  enrichedDebts: AIExtractedDebt[];
  /** File buffers to upload to storage */
  files: ScrapedFile[];
}

/**
 * Download documents identified by AI on a page, analyze them, and collect files.
 * Returns enriched debt data and file buffers for storage upload.
 */
export const downloadAndAnalyzeDocuments = async (
  page: Page,
  documents: AIIdentifiedDocument[],
  platformContext: string
): Promise<DownloadResult> => {
  const enrichedDebts: AIExtractedDebt[] = [];
  const files: ScrapedFile[] = [];

  for (const doc of documents) {
    try {
      log.info({ selector: doc.selector, description: doc.description }, "Downloading document");

      const result = await downloadSingleDocument(page, doc, platformContext);
      if (result) {
        files.push(result.file);
        enrichedDebts.push(...result.debts);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.warn({ selector: doc.selector, error: message }, "Failed to download document, skipping");
    }
  }

  log.info(
    { filesDownloaded: files.length, enrichedDebts: enrichedDebts.length },
    "Document download and analysis complete"
  );

  // Debug: save summary of all document downloads
  saveDebugMarkdown("ai", "download-summary", {
    parsedResult: {
      documentsAttempted: documents.length,
      filesDownloaded: files.length,
      enrichedDebtsCount: enrichedDebts.length,
      enrichedDebts,
      documents,
    },
    notes: `Platform: ${platformContext}\nDocuments attempted: ${documents.length}\nFiles downloaded: ${files.length}\nEnriched debts: ${enrichedDebts.length}`,
  });

  return { enrichedDebts, files };
};

async function downloadSingleDocument(
  page: Page,
  doc: AIIdentifiedDocument,
  platformContext: string
): Promise<{ file: ScrapedFile; debts: AIExtractedDebt[] } | null> {
  // Try to click the element and capture the download
  const element = await resolveElement(page, doc.selector);
  if (!element) {
    log.warn({ selector: doc.selector }, "Element not found on page");
    return null;
  }

  // Listen for download event before clicking
  const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
  await element.click();

  const download = await downloadPromise;
  const suggestedName = download.suggestedFilename() || `document.${doc.fileType}`;
  const contentType = guessContentType(suggestedName);

  // Read download into buffer
  const stream = await download.createReadStream();
  if (!stream) {
    log.warn({ suggestedName }, "Could not read download stream");
    return null;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  log.info({ suggestedName, size: buffer.length }, "Document downloaded");

  // Build the file record
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const ext = EXTENSION_MAP[contentType] || "";
  const fileName = `${timestamp}_${suggestedName}${suggestedName.includes(".") ? "" : ext}`;

  const file: ScrapedFile = { buffer, fileName, contentType };

  // Analyze PDF with AI
  let debts: AIExtractedDebt[] = [];
  if (contentType === "application/pdf") {
    try {
      const analysis = await extractDebtsFromPdf(
        buffer,
        `${platformContext}. Document: ${doc.description}`
      );
      debts = analysis.debts;
      log.info({ debtCount: debts.length }, "AI extracted debts from downloaded PDF");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.warn({ error: message }, "AI PDF analysis failed, keeping file without enrichment");
    }
  }

  return { file, debts };
}

/**
 * Try multiple strategies to find the element on the page.
 * The AI might return a CSS selector, text content, or a Playwright-style locator.
 */
async function resolveElement(page: Page, selector: string) {
  // Strategy 1: Direct CSS selector
  try {
    const el = await page.$(selector);
    if (el) return el;
  } catch {
    // Not a valid CSS selector, try other strategies
  }

  // Strategy 2: text= prefix (Playwright locator style)
  if (selector.startsWith("text=")) {
    const text = selector.slice(5);
    const locator = page.locator(`text=${text}`);
    if ((await locator.count()) > 0) {
      return locator.first().elementHandle();
    }
  }

  // Strategy 3: Try as an XPath
  if (selector.startsWith("//")) {
    try {
      const el = await page.$(selector);
      if (el) return el;
    } catch {
      // Not valid XPath
    }
  }

  // Strategy 4: Treat as link text and find <a> containing it
  try {
    const locator = page.locator(`a:has-text("${selector}"), button:has-text("${selector}")`);
    if ((await locator.count()) > 0) {
      return locator.first().elementHandle();
    }
  } catch {
    // Give up
  }

  return null;
}

/**
 * Capture a page screenshot as a ScrapedFile for storage.
 */
export const captureScreenshotFile = async (
  page: Page,
  label: string
): Promise<ScrapedFile> => {
  const buffer = await page.screenshot({ fullPage: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return {
    buffer,
    fileName: `${timestamp}_${label}.png`,
    contentType: "image/png",
  };
};
