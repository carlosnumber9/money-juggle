import "server-only";
import type { CategoryRuleInput } from "@/definitions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeRuleText } from "@/lib/domain/categoryRules";

export async function saveCategoryRule(
  userId: string,
  input: CategoryRuleInput
): Promise<void> {
  const db = await createSupabaseServerClient();
  const values = {
    user_id: userId,
    name: input.name.trim(),
    category_id: input.category_id,
    account_id: input.account_id,
    field: input.field,
    operator: input.operator,
    value: normalizeRuleText(input.value),
    currency: input.currency,
    direction: input.direction,
    status: input.status
  };
  const query = input.id
    ? db
        .from("category_rules")
        .update(values)
        .eq("id", input.id)
        .eq("user_id", userId)
        .eq("version", input.version!)
        .not("status", "in", "(deleted,dismissed)")
    : db.from("category_rules").insert(values);
  const { data, error } = await query.select("id").maybeSingle();
  if (error || !data)
    throw new Error("Rule could not be saved or its version changed.");
}

export async function changeCategoryRuleStatus(
  userId: string,
  id: string,
  version: number,
  status: "active" | "paused" | "dismissed" | "deleted"
): Promise<void> {
  const db = await createSupabaseServerClient();
  const query = db
    .from("category_rules")
    .update({ status })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("version", version)
    .not("status", "in", "(deleted,dismissed)");
  if (status === "dismissed") query.eq("status", "proposed");
  if (status === "paused") query.eq("status", "active");
  if (status === "active") query.eq("status", "paused");
  const { data, error } = await query.select("id").maybeSingle();
  if (error || !data)
    throw new Error("Rule could not be changed or its version changed.");
}
