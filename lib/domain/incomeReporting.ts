import type { MonthlyTransactionCategory } from "@/definitions";

const EXCLUDED_INCOME_CATEGORY_SLUGS = new Set(["savings_transfer"]);

export function isExcludedFromIncomeReports({
  category
}: {
  category: MonthlyTransactionCategory | null;
}): boolean {
  return category ? EXCLUDED_INCOME_CATEGORY_SLUGS.has(category.slug) : false;
}
