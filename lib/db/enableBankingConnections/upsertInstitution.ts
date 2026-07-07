import "server-only";

import type { EnableBankingAspsp } from "@/definitions";
import { ENABLE_BANKING_PROVIDER } from "@/definitions";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";

import { getEnableBankingInstitutionProviderId } from "./institutionProviderId";

export async function upsertInstitution(
  aspsp: EnableBankingAspsp
): Promise<string> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("institutions")
    .upsert(
      {
        provider: ENABLE_BANKING_PROVIDER,
        provider_institution_id: getEnableBankingInstitutionProviderId(aspsp),
        name: aspsp.name,
        country: aspsp.country,
        logo_url: aspsp.logo,
        status: "active"
      },
      {
        onConflict: "provider,provider_institution_id"
      }
    )
    .select("id")
    .single();

  if (error) {
    throw new Error(`Could not upsert institution: ${error.message}`);
  }

  return data.id;
}
