import "server-only";

import { getErrorMessage } from "../shared/getErrorMessage";
import { persistTransactionRows } from "./persistTransactionRows";
import { finishSyncRun } from "./syncRuns";
import { updateConnectionSyncTimestamp } from "./updateSyncTimestamp";
import type {
  StoredConnectionForTransactionSync,
  TransactionRow
} from "./types";

type FinishConnectionSyncInput = {
  userId: string;
  connection: StoredConnectionForTransactionSync;
  syncRunId: string;
  fetchedAt: string;
  rows: TransactionRow[];
  failures: unknown[];
};

export async function persistRowsAndFinishRun(
  input: FinishConnectionSyncInput
) {
  try {
    await persistTransactionRows(input.rows, input.fetchedAt);
  } catch (error) {
    await finishSyncRun({
      syncRunId: input.syncRunId,
      status: "failed",
      errorCode: "transaction-upsert-failed",
      errorMessage: getErrorMessage(error),
      metadata: {
        transaction_count: input.rows.length,
        failures: input.failures
      }
    });
    throw error;
  }

  await finishSuccessfulRun(input);
}

async function finishSuccessfulRun(input: FinishConnectionSyncInput) {
  const status =
    input.failures.length > 0 && input.rows.length === 0
      ? "failed"
      : input.failures.length > 0
        ? "partial"
        : "succeeded";

  await finishSyncRun({
    syncRunId: input.syncRunId,
    status,
    metadata: {
      transaction_count: input.rows.length,
      failures: input.failures
    }
  });

  if (input.rows.length > 0 || input.failures.length === 0) {
    await updateConnectionSyncTimestamp({
      userId: input.userId,
      bankConnectionId: input.connection.id,
      fetchedAt: input.fetchedAt
    });
  }
}
