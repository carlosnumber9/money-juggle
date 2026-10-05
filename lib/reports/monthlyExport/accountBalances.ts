import type {
  MonthlyReportBalance,
  MonthlyTransactionRange
} from "@/definitions";
import { shouldReplaceLatestBalance } from "@/lib/db/enableBankingConnections/balancePriority";

import { getMadridDate, isInReportRange, shiftReportDate } from "./period";

export function selectReportBalances(
  balances: MonthlyReportBalance[],
  range: MonthlyTransactionRange
) {
  const eligible = balances.filter((balance) =>
    isInReportRange(
      balance.reference_date ?? getMadridDate(balance.fetched_at),
      range
    )
  );
  const captures = new Map<string, MonthlyReportBalance>();
  for (const balance of eligible) {
    const date = balance.reference_date ?? getMadridDate(balance.fetched_at);
    if (!isInReportRange(date, range)) continue;
    const key = `${date}:${balance.fetched_at}`;
    const current = captures.get(key);
    if (!current || shouldReplaceLatestBalance(current, balance)) {
      captures.set(key, balance);
    }
  }
  const available = [...captures.values()].sort((left, right) => {
    const leftDate = left.reference_date ?? getMadridDate(left.fetched_at);
    const rightDate = right.reference_date ?? getMadridDate(right.fetched_at);
    return (
      leftDate.localeCompare(rightDate) ||
      left.fetched_at.localeCompare(right.fetched_at)
    );
  });
  const byLatestCapture = [...eligible].sort((left, right) =>
    right.fetched_at.localeCompare(left.fetched_at)
  );
  const opening = byLatestCapture.find(
    (balance) =>
      balance.balance_type === "OPBD" && balance.reference_date === range.from
  );
  const closing = byLatestCapture.find(
    (balance) =>
      balance.balance_type === "CLBD" &&
      balance.reference_date === shiftReportDate(range.to, -1)
  );
  return {
    first: opening ?? available[0] ?? null,
    last: closing ?? available.at(-1) ?? null,
    comparable: Boolean(opening && closing)
  };
}
