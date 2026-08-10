import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { StoredOwnAccountForTransferMatching } from "./types";

export const MONTHLY_TRANSACTION_SELECT = `
  id,
  account_id,
  booking_status,
  booking_date,
  reporting_date,
  amount,
  currency,
  description,
  merchant_name,
  counterparty_name,
  counterparty_account_last4,
  counterparty_account_fingerprint,
  category_id,
  transaction_categories (
    id,
    name,
    slug,
    transaction_category_groups (
      id,
      name
    )
  ),
  transaction_label_assignments (
    created_at,
    transaction_labels (
      id,
      name
    )
  ),
  accounts!inner (
    id,
    name,
    iban_last4,
    iban_fingerprint,
    bank_connections!inner (
      institutions!inner (
        provider_institution_id,
        name
      )
    )
  )
`;

export async function listOwnAccountsForTransferMatching(
  userId: string
): Promise<StoredOwnAccountForTransferMatching[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("id, iban_last4, iban_fingerprint")
    .eq("user_id", userId);

  if (error) {
    throw new Error(
      `Could not list accounts for internal transfer matching: ${error.message}`
    );
  }

  return (data ?? []) as StoredOwnAccountForTransferMatching[];
}
