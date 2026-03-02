import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient } from "./client";
import type { AIDocumentAnalysisResult } from "./types";
import { cleanJson } from "./utils";
import { logger } from "../utils/logger";
import { saveDebugMarkdown } from "../utils/debug-log";

const SYSTEM_PROMPT = `You are a Greek government document extraction assistant. You will receive a PDF document from a Greek government portal. Extract ALL financial information: amounts owed, descriptions, RF payment codes, wire codes, due dates.

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
  "rawNotes": "string or null"
}

Rules:
- Greek amounts use dot for thousands separator and comma for decimal: "1.234,56" = 1234.56
- Extract the exact amount owed, descriptions, vehicle plate numbers, and any RF/wire payment codes
- If no amount is found, set amount to 0`;

export const extractDebtsFromPdf = async (
  pdfBuffer: Buffer,
  context?: string
): Promise<AIDocumentAnalysisResult> => {
  const log = logger.child({ module: "ai-extract-pdf" });
  const client = getAnthropicClient();

  const base64 = pdfBuffer.toString("base64");

  const userContent: Anthropic.MessageCreateParams["messages"][0]["content"] = [
    {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: base64,
      },
    },
    {
      type: "text",
      text: context
        ? `Extract financial information from this document. Context: ${context}`
        : "Extract financial information from this document.",
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
    "AI document analysis complete"
  );

  const rawText = textBlock.text;
  const result = JSON.parse(cleanJson(rawText)) as AIDocumentAnalysisResult;

  // Debug: save full AI exchange to markdown
  saveDebugMarkdown("ai", "pdf-analysis", {
    prompt: context ?? "(no context)",
    rawResponse: rawText,
    parsedResult: result,
    notes: `Model: claude-sonnet-4-20250514 | Input tokens: ${response.usage.input_tokens} | Output tokens: ${response.usage.output_tokens}\nDebts found: ${result.debts.length} | Total: ${result.totalAmount}`,
  });

  return result;
};
