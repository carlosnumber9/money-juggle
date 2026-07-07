import type { StoredBankConnection } from "@/definitions";
import {
  completeEnableBankingConnection,
  failEnableBankingConnection
} from "@/lib/db/enableBankingConnections";
import { authorizeEnableBankingSession } from "@/lib/enableBanking/client";

import { getPublicErrorMetadata, getPublicErrorStatus } from "./errors";

export async function authorizeAndCompleteSession({
  connection,
  code
}: {
  connection: StoredBankConnection;
  code: string;
}) {
  try {
    const session = await authorizeEnableBankingSession(code);

    await completeEnableBankingConnection({
      userId: connection.user_id,
      bankConnectionId: connection.id,
      session
    });

    return { ok: true } as const;
  } catch (error) {
    await failEnableBankingConnection({
      userId: connection.user_id,
      bankConnectionId: connection.id,
      providerStatus: getPublicErrorStatus(error),
      message: "Enable Banking session authorization failed.",
      metadata: getPublicErrorMetadata(error)
    });

    return {
      ok: false,
      status: getPublicErrorStatus(error),
      metadata: getPublicErrorMetadata(error)
    } as const;
  }
}
