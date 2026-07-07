import "server-only";

import type { StoredBankConnection } from "@/definitions";
import { ENABLE_BANKING_PROVIDER } from "@/definitions";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

import { getSuffix } from "../shared/get-suffix";

export async function getLinkingConnectionByState({
  state
}: {
  state: string;
}): Promise<StoredBankConnection | null> {
  const supabase = createSupabaseServiceRoleClient();

  console.info("Loading Enable Banking linking connection by state", {
    state_suffix: getSuffix(state)
  });

  const { data, error } = await supabase
    .from("bank_connections")
    .select("id,user_id,institution_id,status,provider_state")
    .eq("provider", ENABLE_BANKING_PROVIDER)
    .eq("provider_state", state)
    .eq("status", "linking")
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load bank connection: ${error.message}`);
  }

  console.info("Enable Banking linking connection lookup completed", {
    state_suffix: getSuffix(state),
    found: Boolean(data),
    bank_connection_id_suffix: getSuffix(data?.id),
    user_id_suffix: getSuffix(data?.user_id),
    status: data?.status ?? null
  });

  return data;
}
