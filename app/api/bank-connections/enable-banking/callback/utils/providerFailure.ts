import type { StoredBankConnection } from "@/definitions";
import { failEnableBankingConnection } from "@/lib/db/enableBankingConnections";

export async function storeProviderError(input: {
  connection: StoredBankConnection;
  providerError: string;
  providerErrorDescription: string | null;
}) {
  await failEnableBankingConnection({
    userId: input.connection.user_id,
    bankConnectionId: input.connection.id,
    providerStatus: input.providerError,
    message: "Enable Banking returned an authorization error.",
    metadata: {
      error: input.providerError,
      error_description: input.providerErrorDescription
    }
  });
}

export async function storeMissingCode(connection: StoredBankConnection) {
  await failEnableBankingConnection({
    userId: connection.user_id,
    bankConnectionId: connection.id,
    providerStatus: "missing-code",
    message: "Enable Banking callback did not include an authorization code."
  });
}
