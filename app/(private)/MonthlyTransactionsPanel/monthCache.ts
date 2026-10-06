import { QueryClient } from "@tanstack/react-query";
import type { TransactionMonthData } from "@/definitions";

export const MONTH_STALE_MS = 5 * 60 * 1000;
export const MONTH_GC_MS = 30 * 60 * 1000;
export const monthKey = (userId: string, month?: string) =>
  month === undefined
    ? (["transaction-month", userId] as const)
    : (["transaction-month", userId, month] as const);

export function createPrivateQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: MONTH_STALE_MS,
        gcTime: MONTH_GC_MS,
        retry: false,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchInterval: false
      }
    }
  });
}

export async function patchMonthRows(
  client: QueryClient,
  userId: string,
  month: string,
  update: (rows: TransactionMonthData["rows"]) => TransactionMonthData["rows"]
) {
  const queryKey = monthKey(userId, month);
  await client.cancelQueries({ queryKey, exact: true });
  client.setQueryData<TransactionMonthData>(queryKey, (data) =>
    data ? { ...data, rows: update(data.rows) } : data
  );
}

export async function invalidateTransactionMonths(
  client: QueryClient,
  userId: string,
  months?: string[]
) {
  const filters = months
    ? [...new Set(months)].map((month) => ({
        queryKey: monthKey(userId, month),
        exact: true
      }))
    : [{ queryKey: monthKey(userId) }];
  await Promise.all(filters.map((filter) => client.cancelQueries(filter)));
  await Promise.all(filters.map((filter) => client.invalidateQueries(filter)));
}
