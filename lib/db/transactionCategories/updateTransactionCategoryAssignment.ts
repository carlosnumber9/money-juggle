import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";

export type UpdateTransactionCategoryAssignmentInput = {
  userId: string;
  transactionId: string;
  categoryId: string | null;
};

export async function updateTransactionCategoryAssignment({
  userId,
  transactionId,
  categoryId
}: UpdateTransactionCategoryAssignmentInput): Promise<void> {
  if (categoryId) {
    await ensureCategoryBelongsToUser({ userId, categoryId });
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("transactions")
    .update({ category_id: categoryId })
    .eq("id", transactionId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Could not update transaction category: ${error.message}`);
  }

  if (!data) {
    throw new Error(
      "Could not update transaction category: transaction not found."
    );
  }
}

async function ensureCategoryBelongsToUser({
  userId,
  categoryId
}: {
  userId: string;
  categoryId: string;
}) {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("transaction_categories")
    .select("id")
    .eq("id", categoryId)
    .eq("user_id", userId)
    .eq("is_archived", false)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not verify transaction category: ${error.message}`);
  }

  if (!data) {
    throw new Error(
      "Could not verify transaction category: category not found."
    );
  }
}
