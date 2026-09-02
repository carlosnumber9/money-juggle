import type { MonthlyTransactionCategory } from "@/definitions";

export function isSavingsTransferCategory({
  category
}: {
  category: MonthlyTransactionCategory | null;
}): boolean {
  return category?.slug === "savings_transfer";
}
