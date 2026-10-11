import "server-only";
import type { CategoryRule } from "@/definitions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listCategoryRules(
  userId: string
): Promise<CategoryRule[]> {
  const db = await createSupabaseServerClient();
  const rows: CategoryRule[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db
      .from("category_rules")
      .select("*")
      .eq("user_id", userId)
      .not("status", "in", "(deleted,dismissed)")
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 499);
    if (error) throw new Error("Could not read category rules.");
    rows.push(...((data ?? []) as CategoryRule[]));
    if (!data || data.length < 500) return rows;
  }
}

export async function listCategoryRuleAccounts(userId: string) {
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from("accounts")
    .select("id,name,currency")
    .eq("user_id", userId)
    .order("name");
  if (error) throw new Error("Could not read rule accounts.");
  return (data ?? []) as Array<{ id: string; name: string; currency: string }>;
}

export async function listCategoryRuleConflicts(userId: string) {
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from("transactions")
    .select("id,description,booking_date,currency")
    .eq("user_id", userId)
    .eq("category_rule_conflict", true)
    .is("category_id", null)
    .is("category_source", null)
    .order("booking_date", { ascending: false })
    .limit(100);
  if (error) throw new Error("Could not read rule conflicts.");
  return (data ?? []) as Array<{
    id: string;
    description: string | null;
    booking_date: string | null;
    currency: string;
  }>;
}
