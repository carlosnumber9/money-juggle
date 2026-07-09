import "server-only";

import type { TransactionCategoryGroupSummary } from "@/definitions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type StoredTransactionCategoryGroupRow = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  transaction_categories:
    StoredTransactionCategoryRow[] | StoredTransactionCategoryRow | null;
};

type StoredTransactionCategoryRow = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_archived: boolean;
};

export async function listTransactionCategoryGroups({
  userId
}: {
  userId: string;
}): Promise<TransactionCategoryGroupSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("transaction_category_groups")
    .select(
      `
      id,
      name,
      slug,
      sort_order,
      transaction_categories (
        id,
        name,
        slug,
        sort_order,
        is_archived
      )
    `
    )
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Could not list transaction categories: ${error.message}`);
  }

  return ((data ?? []) as StoredTransactionCategoryGroupRow[])
    .map(mapStoredCategoryGroup)
    .filter((group) => group.categories.length > 0);
}

function mapStoredCategoryGroup(
  row: StoredTransactionCategoryGroupRow
): TransactionCategoryGroupSummary {
  const categories = Array.isArray(row.transaction_categories)
    ? row.transaction_categories
    : row.transaction_categories
      ? [row.transaction_categories]
      : [];

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    categories: categories
      .filter((category) => !category.is_archived)
      .sort(sortStoredCategories)
      .map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug
      }))
  };
}

function sortStoredCategories(
  left: StoredTransactionCategoryRow,
  right: StoredTransactionCategoryRow
) {
  if (left.sort_order !== right.sort_order) {
    return left.sort_order - right.sort_order;
  }

  return left.name.localeCompare(right.name);
}
