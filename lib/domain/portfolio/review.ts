import type { PortfolioExtraction, PortfolioValues } from "@/definitions";
import { sumDecimals, parseDecimal } from "@/lib/domain/decimal";
import { portfolioInvestments, validatePortfolioValues } from "./values";

export function getPortfolioReview(
  values: PortfolioValues,
  original: PortfolioExtraction
) {
  try {
    const normalized = validatePortfolioValues(values);
    const investments = portfolioInvestments(normalized);
    const total = sumDecimals([normalized.cash, investments]);
    const mismatch =
      parseDecimal(portfolioInvestments(original)) !==
        parseDecimal(original.reportedInvestments) ||
      parseDecimal(
        sumDecimals([original.cash, original.reportedInvestments])
      ) !== parseDecimal(original.reportedTotal);
    const changed =
      JSON.stringify(normalized) !==
      JSON.stringify(validatePortfolioValues(original));
    return { investments, total, mismatch, changed, valid: true };
  } catch {
    return {
      investments: null,
      total: null,
      mismatch: false,
      changed: false,
      valid: false
    };
  }
}
