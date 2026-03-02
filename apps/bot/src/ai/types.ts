/** What Claude returns as structured JSON for a single debt entry */
export interface AIExtractedDebt {
  category: string;
  amount: number;
  description: string | null;
  dueDate: string | null;
  rfCode: string | null;
  wireCode: string | null;
}

/** A downloadable document identified by the AI on the page */
export interface AIIdentifiedDocument {
  /** CSS selector or text to click to trigger download */
  selector: string;
  /** What the AI thinks this document is */
  description: string;
  /** Expected file type */
  fileType: "pdf" | "xlsx" | "doc" | "other";
}

/** Phase 1 result: page analysis (debts + documents to download) */
export interface AIPageAnalysisResult {
  debts: AIExtractedDebt[];
  totalAmount: number;
  /** Clickable documents the AI found on the page */
  downloadableDocuments: AIIdentifiedDocument[];
  rawNotes: string | null;
}

/** Phase 2 result: document analysis (enriched debts from a downloaded file) */
export interface AIDocumentAnalysisResult {
  debts: AIExtractedDebt[];
  totalAmount: number;
  rawNotes: string | null;
}

/** A file buffer + metadata collected during scraping, before upload */
export interface ScrapedFile {
  buffer: Buffer;
  fileName: string;
  contentType: string;
}
