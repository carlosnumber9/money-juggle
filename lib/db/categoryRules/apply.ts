import "server-only";
import type { CategoryRule, CategoryRuleTransaction } from "@/definitions";
import { evaluateCategoryRules } from "@/lib/domain/categoryRules";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";

export async function applyCategoryRulesAfterSync(
  userId: string,
  connectionId: string
): Promise<void> {
  const db = createSupabaseServiceRoleClient();
  const { data: connection, error: connectionError } = await db
    .from("bank_connections")
    .select("id")
    .eq("id", connectionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (connectionError || !connection)
    throw new Error("Rule sync connection is not owned.");
  const { data: storedRules, error: ruleError } = await db
    .from("category_rules")
    .select("*,transaction_categories!inner(is_archived,slug)")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("transaction_categories.is_archived", false)
    .neq("transaction_categories.slug", "internal_transfer")
    .order("activated_at")
    .order("id");
  if (ruleError) throw new Error("Could not read owned sync rules.");
  const rules = (storedRules ?? []) as CategoryRule[];
  const oldest = rules[0]?.activated_at;
  let afterId: string | null = null;
  for (;;) {
    const query = db
      .from("transactions")
      .select(
        "id,account_id,booking_status,booking_date,first_seen_at,amount,currency,description,merchant_name,counterparty_name,category_id,category_source,category_rule_conflict,accounts!inner(bank_connection_id)"
      )
      .eq("user_id", userId)
      .eq("accounts.bank_connection_id", connectionId)
      .eq("booking_status", "booked")
      .is("category_id", null)
      .is("category_source", null)
      .order("id")
      .limit(500);
    if (oldest)
      query.or(
        `first_seen_at.gte.${new Date(oldest).toISOString()},category_rule_conflict.eq.true`
      );
    else query.eq("category_rule_conflict", true);
    if (afterId) query.gt("id", afterId);
    const { data, error } = await query;
    if (error) throw new Error("Could not read owned rule candidates.");
    const rows = (data ?? []) as Array<
      Omit<CategoryRuleTransaction, "excluded"> & {
        category_rule_conflict: boolean;
      }
    >;
    const ids = rows
      .filter(
        (row) =>
          row.category_rule_conflict ||
          evaluateCategoryRules({ ...row, excluded: false }, rules).kind !==
            "none"
      )
      .map((row) => row.id);
    if (ids.length) {
      const { error: writeError } = await db.rpc(
        "apply_category_rule_assignments",
        {
          p_user_id: userId,
          p_connection_id: connectionId,
          p_transaction_ids: ids
        }
      );
      if (writeError) throw new Error("Could not apply category rules.");
    }
    if (rows.length < 500) return;
    afterId = rows.at(-1)!.id;
  }
}
