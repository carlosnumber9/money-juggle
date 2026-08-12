import type { RequestHeaders, StoredBankConnection } from "@/definitions";
import {
  completeEnableBankingConnection,
  failEnableBankingConnection
} from "@/lib/db/enableBankingConnections";
import { authorizeEnableBankingSession } from "@/lib/enableBanking/client";
import { getInteractivePsuHeadersByConnection } from "@/lib/db/enableBankingSync/interactivePsuHeaders";

import { getPublicErrorMetadata, getPublicErrorStatus } from "./errors";

export async function authorizeAndCompleteSession({
  connection,
  code,
  requestHeaders
}: {
  connection: StoredBankConnection;
  code: string;
  requestHeaders: RequestHeaders;
}) {
  try {
    const session = await authorizeEnableBankingSession(code);

    if (session.accounts.length === 0) {
      const status = "no-accounts-added";
      const metadata = {
        account_count: 0,
        session_id: session.session_id
      };

      await failEnableBankingConnection({
        userId: connection.user_id,
        bankConnectionId: connection.id,
        providerStatus: status,
        message:
          "Enable Banking authorized the session without returning any accounts.",
        metadata
      });

      return { ok: false, status, metadata } as const;
    }

    const psuHeadersByConnectionId = await getInteractivePsuHeadersByConnection(
      {
        userId: connection.user_id,
        bankConnectionIds: new Set([connection.id]),
        requestHeaders
      }
    );

    await completeEnableBankingConnection({
      userId: connection.user_id,
      bankConnectionId: connection.id,
      session,
      psuHeaders: psuHeadersByConnectionId.get(connection.id)
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
