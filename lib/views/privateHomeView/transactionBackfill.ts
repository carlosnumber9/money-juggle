import type {
  BankConnectionSummary,
  ProviderStatusView,
  Result,
  TransactionBackfillView
} from "@/definitions";

export function buildTransactionBackfillView({
  connectionsResult,
  completedConnectionIdsResult,
  providerStatus
}: {
  connectionsResult: Result<BankConnectionSummary[]>;
  completedConnectionIdsResult: Result<string[]>;
  providerStatus: ProviderStatusView;
}): TransactionBackfillView {
  if (
    providerStatus.status !== "success" ||
    providerStatus.isDemo ||
    !connectionsResult.ok
  ) {
    return { status: "hidden" };
  }

  const eligibleConnections = connectionsResult.value.filter(
    (connection) =>
      connection.status === "linked" && connection.accounts.length > 0
  );

  if (eligibleConnections.length === 0) {
    return { status: "hidden" };
  }

  if (!completedConnectionIdsResult.ok) {
    return { status: "hidden" };
  }

  const completedConnectionIds = new Set(completedConnectionIdsResult.value);
  const pendingConnectionCount = eligibleConnections.filter(
    (connection) => !completedConnectionIds.has(connection.id)
  ).length;

  return pendingConnectionCount > 0
    ? { status: "available" }
    : { status: "hidden" };
}
