import type { TransactionSyncResult } from "@/lib/db/enableBankingTransactions/types";
import { getDashboardSyncResult } from "../dashboard/result";

export function getTransactionSyncResult(
  result: TransactionSyncResult,
  connections: Parameters<typeof getDashboardSyncResult>[0]["connections"]
) {
  return getDashboardSyncResult({
    balances: {
      synced: false,
      succeededConnectionCount: 0,
      failedConnectionCount: 0,
      rateLimitedConnectionCount: 0,
      cooldownConnectionCount: 0,
      cooldownUntil: null
    },
    transactions: result,
    connections
  });
}
