import type { DebtCategory, Platform, Priority } from "@repo/shared";
import type { ScrapedDebt } from "../scrapers/base-scraper";
import type { AIExtractedDebt } from "./types";

const VALID_CATEGORIES = new Set<string>([
  "VAT", "EFKA", "INCOME_TAX", "ENFIA", "CERTIFIED_DEBTS",
  "VEHICLE_TAX", "GEMI", "PROFESSIONAL_TAX", "TAX_PREPAYMENT", "MUNICIPAL_TAX",
]);

export const mapAIDebtToScrapedDebt = (
  aiDebt: AIExtractedDebt,
  platform: Platform
): ScrapedDebt => {
  const category: DebtCategory = VALID_CATEGORIES.has(aiDebt.category)
    ? (aiDebt.category as DebtCategory)
    : "CERTIFIED_DEBTS";

  const amount =
    typeof aiDebt.amount === "number" && !isNaN(aiDebt.amount)
      ? aiDebt.amount
      : 0;

  const priority: Priority =
    amount > 5000 ? "HIGH" : amount > 1000 ? "MEDIUM" : "LOW";

  return {
    category,
    amount,
    platform,
    priority,
    description: aiDebt.description ?? null,
    dueDate: aiDebt.dueDate ? new Date(aiDebt.dueDate) : null,
    rfCode: aiDebt.rfCode ?? null,
    wireCode: aiDebt.wireCode ?? null,
  };
};
