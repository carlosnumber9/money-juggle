import type { RequestHeaders, StoredBankConnection } from "@/definitions";
import {
  completeEnableBankingConnection,
  failEnableBankingConnection
} from "@/lib/db/enableBankingConnections";
import { authorizeEnableBankingSession } from "@/lib/enableBanking/client";
import { getInteractivePsuHeadersByConnection } from "@/lib/db/enableBankingSync/interactivePsuHeaders";

import { withConnectionSyncLeases } from "@/lib/db/enableBankingSync/connectionLease";

import { getPublicErrorMetadata, getPublicErrorStatus } from "./errors";

type AuthorizationInput = {
  connection: StoredBankConnection;
  code: string;
  requestHeaders: RequestHeaders;
};

export async function authorizeAndCompleteSession(input: AuthorizationInput) {
  const result = await withConnectionSyncLeases({
    userId: input.connection.user_id,
    bankConnectionIds: [input.connection.id],
    run: async (acquiredIds) =>
      acquiredIds.has(input.connection.id)
        ? completeAuthorizedSession(input)
        : ({ ok: false, status: "connection-busy" } as const)
  });
  return result.value;
}

async function completeAuthorizedSession({
  connection,
  code,
  requestHeaders
}: AuthorizationInput) {
  let phase = "session-authorization";
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
        providerState: connection.provider_state,
        providerStatus: status,
        message:
          "Enable Banking authorized the session without returning any accounts.",
        metadata
      });

      return { ok: false, status, metadata } as const;
    }

    phase = "psu-headers";
    const psuHeadersByConnectionId = await getInteractivePsuHeadersByConnection(
      {
        userId: connection.user_id,
        bankConnectionIds: new Set([connection.id]),
        requestHeaders
      }
    );

    phase = "connection-completion";
    await completeEnableBankingConnection({
      userId: connection.user_id,
      bankConnectionId: connection.id,
      session,
      providerState: connection.provider_state,
      psuHeaders: psuHeadersByConnectionId.get(connection.id)
    });

    return { ok: true } as const;
  } catch (error) {
    await failEnableBankingConnection({
      userId: connection.user_id,
      bankConnectionId: connection.id,
      providerState: connection.provider_state,
      providerStatus: getPublicErrorStatus(error),
      message:
        phase === "session-authorization"
          ? "Enable Banking session authorization failed."
          : "Enable Banking session was authorized but connection completion failed.",
      metadata: { phase, ...getPublicErrorMetadata(error) }
    });

    return {
      ok: false,
      status: getPublicErrorStatus(error),
      metadata: getPublicErrorMetadata(error)
    } as const;
  }
}
