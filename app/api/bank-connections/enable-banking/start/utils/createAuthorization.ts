import { randomUUID } from "node:crypto";

import type { User } from "@supabase/supabase-js";

import { startEnableBankingAuthorization } from "@/lib/enableBanking/client";

import { getConsentValidUntil } from "./consent";

export async function createAuthorization(input: {
  user: User;
  aspsp: Awaited<ReturnType<typeof import("./findAspsp").findAspsp>>;
  callbackUrl: string;
}) {
  const state = randomUUID();
  const access = {
    balances: true,
    transactions: true,
    valid_until: getConsentValidUntil(input.aspsp.maximum_consent_validity)
  };
  const authorization = await startEnableBankingAuthorization({
    access,
    aspsp: {
      name: input.aspsp.name,
      country: input.aspsp.country
    },
    state,
    redirect_url: input.callbackUrl,
    psu_type: "personal",
    language: "es",
    psu_id: input.user.id
  });

  return { state, access, authorization };
}
