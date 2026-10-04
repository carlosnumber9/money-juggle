import "server-only";

import {
  getEnableBankingSession,
  EnableBankingRequestError
} from "@/lib/enableBanking/client";
import { getSuffix } from "../shared/getSuffix";

export async function recoverAccountIdentifications(input: {
  sessionId?: string | null;
  aspsp: { name: string; country: string };
  accounts: Array<{ id: string; provider_account_id: string }>;
  identities: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  if (
    !input.sessionId ||
    input.accounts.every(
      (account) =>
        Array.isArray(input.identities[account.id]) &&
        (input.identities[account.id] as unknown[]).length > 0
    )
  )
    return input.identities;
  try {
    const session = await getEnableBankingSession(input.sessionId);
    if (
      session.aspsp.name !== input.aspsp.name ||
      session.aspsp.country !== input.aspsp.country
    )
      throw new Error("Historical session institution mismatch.");
    const recovered = { ...input.identities };
    for (const account of input.accounts) {
      const candidates =
        session.accounts_data?.filter(
          (item) => item.uid === account.provider_account_id
        ) ?? [];
      if (candidates.length !== 1 || !candidates[0].identification_hash)
        continue;
      if (
        !Array.isArray(recovered[account.id]) ||
        (recovered[account.id] as unknown[]).length === 0
      )
        recovered[account.id] = [candidates[0].identification_hash];
    }
    return recovered;
  } catch (error) {
    console.warn(
      "Enable Banking historical account identity recovery unavailable",
      {
        session_id_suffix: getSuffix(input.sessionId),
        phase: "historical-identity-recovery",
        reason: "session-unavailable",
        http_status:
          error instanceof EnableBankingRequestError ? error.status : undefined,
        provider_error:
          error instanceof EnableBankingRequestError
            ? error.providerError?.error
            : undefined
      }
    );
    return input.identities;
  }
}
