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
  if (providerStatus.status !== "success" || !connectionsResult.ok) {
    return { status: "hidden" };
  }

  const eligibleConnections = getEligibleConnections(connectionsResult.value);

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

export function getDashboardSyncEnabled({
  connectionsResult,
  providerStatus
}: {
  connectionsResult: Result<BankConnectionSummary[]>;
  providerStatus: ProviderStatusView;
}): boolean {
  return (
    providerStatus.status === "success" &&
    connectionsResult.ok &&
    getEligibleConnections(connectionsResult.value).length > 0
  );
}

function getEligibleConnections(connections: BankConnectionSummary[]) {
  return connections.filter(
    (connection) =>
      connection.status === "linked" && connection.accounts.length > 0
  );
}
