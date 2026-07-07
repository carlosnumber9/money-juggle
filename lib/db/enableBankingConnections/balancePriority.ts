import type { AccountBalanceSummary } from "@/definitions";

const BALANCE_TYPE_PRIORITY = [
  "CLBD",
  "CLAV",
  "ITBD",
  "ITAV",
  "XPCD",
  "VALU",
  "INFO",
  "OPBD",
  "OPAV",
  "PRCD",
  "FWAV",
  "OTHR"
];

export function shouldReplaceLatestBalance(
  current: AccountBalanceSummary,
  candidate: AccountBalanceSummary
): boolean {
  if (candidate.fetched_at > current.fetched_at) {
    return true;
  }

  if (candidate.fetched_at < current.fetched_at) {
    return false;
  }

  return (
    getBalanceTypePriority(candidate.balance_type) <
    getBalanceTypePriority(current.balance_type)
  );
}

function getBalanceTypePriority(balanceType: string): number {
  const index = BALANCE_TYPE_PRIORITY.indexOf(balanceType);

  return index === -1 ? BALANCE_TYPE_PRIORITY.length : index;
}
