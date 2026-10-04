import "server-only";

import { ENABLE_BANKING_PROVIDER, type RequestHeaders } from "@/definitions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { withConnectionSyncLeases } from "@/lib/db/enableBankingSync/connectionLease";
import { getEnableBankingSession } from "@/lib/enableBanking/client";
import { getInteractivePsuHeadersByConnection } from "@/lib/db/enableBankingSync/interactivePsuHeaders";
import { completeEnableBankingConnection } from "./completeConnection";
import { readPendingReconnection } from "./pendingSession";
import { getRecord } from "./records";

export async function loadBankAccountReview(
  userId: string,
  bankConnectionId: string
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bank_connections")
    .select(
      "id,provider_state,status,provider_metadata,accounts(id,name,currency,iban_last4)"
    )
    .eq("id", bankConnectionId)
    .eq("user_id", userId)
    .eq("provider", ENABLE_BANKING_PROVIDER)
    .eq("status", "error")
    .maybeSingle();
  if (error) throw new Error("Could not load bank account review.");
  const pending = readPendingReconnection(
    getRecord(data?.provider_metadata).pending_reconnection
  );
  return data && pending ? { connection: data, pending } : null;
}

export async function confirmBankAccountReview(input: {
  userId: string;
  bankConnectionId: string;
  reviewId: string;
  matches: Array<string | null>;
  requestHeaders: RequestHeaders;
}) {
  const result = await withConnectionSyncLeases({
    userId: input.userId,
    bankConnectionIds: [input.bankConnectionId],
    run: async (acquired) => {
      if (!acquired.has(input.bankConnectionId))
        throw new Error("Bank connection is busy.");
      const review = await loadBankAccountReview(
        input.userId,
        input.bankConnectionId
      );
      if (!review || review.pending.reviewId !== input.reviewId)
        throw new Error("Bank account review has expired or changed.");
      const session = await getEnableBankingSession(
        review.pending.session.session_id
      );
      if (
        session.status !== "AUTHORIZED" ||
        session.aspsp.name !== review.pending.session.aspsp.name ||
        session.aspsp.country !== review.pending.session.aspsp.country
      )
        throw new Error("Pending bank session is no longer authorized.");
      const psuHeaders = await getInteractivePsuHeadersByConnection({
        userId: input.userId,
        bankConnectionIds: new Set([input.bankConnectionId]),
        requestHeaders: input.requestHeaders
      });
      await completeEnableBankingConnection({
        userId: input.userId,
        bankConnectionId: input.bankConnectionId,
        providerState: review.connection.provider_state,
        session: review.pending.session,
        psuHeaders: psuHeaders.get(input.bankConnectionId),
        confirmation: { reviewId: input.reviewId, matches: input.matches }
      });
    }
  });
  return result.value;
}
