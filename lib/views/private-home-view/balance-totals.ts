import type { BankConnectionSummary } from "@/definitions";

import { formatDecimal, parseDecimal } from "./decimal";

export function buildBalanceTotals(connection: BankConnectionSummary) {
  const totalsByCurrency = new Map<
    string,
    {
      amount: bigint;
      fetchedAt: string | null;
    }
  >();

  for (const account of connection.accounts) {
    const balance = account.latest_balance;

    if (!balance) {
      continue;
    }

    const current = totalsByCurrency.get(balance.currency) ?? {
      amount: 0n,
      fetchedAt: null
    };

    totalsByCurrency.set(balance.currency, {
      amount: current.amount + parseDecimal(balance.amount),
      fetchedAt: getLatestFetchedAt(current.fetchedAt, balance.fetched_at)
    });
  }

  return Array.from(totalsByCurrency.entries()).map(([currency, total]) => ({
    amount: formatDecimal(total.amount),
    currency,
    fetchedAt: total.fetchedAt
  }));
}

function getLatestFetchedAt(current: string | null, candidate: string) {
  return !current || candidate > current ? candidate : current;
}
