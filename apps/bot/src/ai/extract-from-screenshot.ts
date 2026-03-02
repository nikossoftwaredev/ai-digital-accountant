import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient } from "./client";
import type { AIPageAnalysisResult } from "./types";
import { cleanJson } from "./utils";
import { logger } from "../utils/logger";
import { saveDebugMarkdown } from "../utils/debug-log";

const SYSTEM_PROMPT = `You are a Greek government debt extraction assistant. You will receive a screenshot of a Greek government portal showing debt information.

Your job has TWO parts:
1. Extract ALL debt entries visible on the page
2. Identify ANY clickable links/buttons that would download documents (PDFs, Excel files, etc.) related to debts

Return ONLY valid JSON matching this exact schema (no markdown, no backticks):
{
  "debts": [
    {
      "category": "string (one of: VAT, EFKA, INCOME_TAX, ENFIA, CERTIFIED_DEBTS, VEHICLE_TAX, GEMI, PROFESSIONAL_TAX, TAX_PREPAYMENT, MUNICIPAL_TAX)",
      "amount": number,
      "description": "string or null",
      "dueDate": "ISO date string or null",
      "rfCode": "RF code string or null",
      "wireCode": "wire transfer code string or null"
    }
  ],
  "totalAmount": number,
  "downloadableDocuments": [
    {
      "selector": "CSS selector or exact link text to click, e.g. 'a[href*=\\"pdf\\"]' or 'text=Ειδοποιητήριο'",
      "description": "What this document likely contains",
      "fileType": "pdf | xlsx | doc | other"
    }
  ],
  "rawNotes": "string or null"
}

Rules:
- Greek amounts use dot for thousands separator and comma for decimal: "1.234,56" = 1234.56
- Parse ALL visible rows, even if amounts are zero
- If you see an RF code (starts with "RF"), include it
- If a category is unclear, use "CERTIFIED_DEBTS"
- For downloadable documents, look for: PDF icons, download buttons, links with text like "Εκτύπωση", "Λήψη", "Ειδοποιητήριο", "Βεβαίωση", file icons, or any href containing .pdf/.xlsx/.doc
- Provide the most reliable CSS selector you can identify from the screenshot
- If no debts are visible, return {"debts": [], "totalAmount": 0, "downloadableDocuments": [], "rawNotes": "No debts found"}
- If no downloadable documents are visible, return an empty array for downloadableDocuments`;

export const extractDebtsFromScreenshot = async (
  screenshotBuffer: Buffer,
  context?: string
): Promise<AIPageAnalysisResult> => {
  const log = logger.child({ module: "ai-extract-screenshot" });
  const client = getAnthropicClient();

  const base64 = screenshotBuffer.toString("base64");

  const userContent: Anthropic.MessageCreateParams["messages"][0]["content"] = [
    {
      type: "image",
      source: {
        type: "base64",
        media_type: "image/png",
        data: base64,
      },
    },
    {
      type: "text",
      text: context
        ? `Analyze this page for debt information and downloadable documents. Context: ${context}`
        : "Analyze this page for debt information and downloadable documents.",
    },
  ];

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  log.info(
    { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
    "AI page analysis complete"
  );

  const rawText = textBlock.text;
  const result = JSON.parse(cleanJson(rawText)) as AIPageAnalysisResult;

  // Ensure downloadableDocuments exists (backward compat)
  if (!result.downloadableDocuments) {
    result.downloadableDocuments = [];
  }

  // Debug: save full AI exchange to markdown
  saveDebugMarkdown("ai", "page-analysis", {
    prompt: context ?? "(no context)",
    rawResponse: rawText,
    parsedResult: result,
    screenshotBase64: base64,
    notes: `Model: claude-sonnet-4-20250514 | Input tokens: ${response.usage.input_tokens} | Output tokens: ${response.usage.output_tokens}\nDebts found: ${result.debts.length} | Documents found: ${result.downloadableDocuments.length} | Total: ${result.totalAmount}`,
  });

  return result;
};
