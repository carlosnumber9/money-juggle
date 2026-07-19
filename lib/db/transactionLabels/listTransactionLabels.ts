import "server-only";

import type { TransactionLabelSummary } from "@/definitions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listTransactionLabels({
  userId
}: {
  userId: string;
}): Promise<TransactionLabelSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("transaction_labels")
    .select("id, name")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Could not list transaction labels: ${error.message}`);
  }

  return (data ?? []) as TransactionLabelSummary[];
}
