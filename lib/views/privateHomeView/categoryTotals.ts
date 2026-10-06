import type { ReportingMovement } from "@/lib/domain/reportingMovements";

import { parseDecimal } from "./decimal";

export function buildCategoryTotals(
  movements: Pick<ReportingMovement, "amount" | "category">[]
) {
  const totals = new Map<
    string,
    {
      category: NonNullable<ReportingMovement["category"]>;
      amount: bigint;
      transactionCount: number;
    }
  >();

  for (const movement of movements) {
    const amount = parseDecimal(movement.amount);

    if (!movement.category || amount === 0n) {
      continue;
    }

    const current = totals.get(movement.category.id);
    totals.set(movement.category.id, {
      category: movement.category,
      amount: (current?.amount ?? 0n) + amount,
      transactionCount: (current?.transactionCount ?? 0) + 1
    });
  }

  return Array.from(totals.values());
}
