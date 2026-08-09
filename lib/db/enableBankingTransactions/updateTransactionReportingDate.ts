import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";

export async function updateTransactionReportingDate({
  userId,
  transactionId,
  reportingDate
}: {
  userId: string;
  transactionId: string;
  reportingDate: string;
}): Promise<string> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("transactions")
    .update({ reporting_date: reportingDate })
    .eq("id", transactionId)
    .eq("user_id", userId)
    .select("reporting_date")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Could not update transaction reporting date: ${error.message}`
    );
  }

  if (!data?.reporting_date) {
    throw new Error(
      "Could not update transaction reporting date: transaction not found."
    );
  }

  return data.reporting_date;
}
