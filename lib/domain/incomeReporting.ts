import type { MonthlyTransactionCategory } from "@/definitions";

import { isSavingsTransferCategory } from "./savingsTransfers";

export function isExcludedFromIncomeReports({
  category
}: {
  category: MonthlyTransactionCategory | null;
}): boolean {
  return isSavingsTransferCategory({ category });
}
