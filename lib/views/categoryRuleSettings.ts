import "server-only";
import type { BankingDataSource, CategoryRuleSettings } from "@/definitions";
export async function getCategoryRuleSettings(
  userId: string,
  dataSource: BankingDataSource
): Promise<CategoryRuleSettings> {
  try {
    const [rules, categories, accounts, conflicts] = await Promise.all([
      dataSource.listCategoryRules(userId),
      dataSource.listTransactionCategoryGroups(userId),
      dataSource.listCategoryRuleAccounts(userId),
      dataSource.listCategoryRuleConflicts(userId)
    ]);
    return {
      rules,
      categories: categories.map((group) => ({
        ...group,
        categories: group.categories.filter(
          (category) => category.slug !== "internal_transfer"
        )
      })),
      accounts,
      conflicts,
      error: null
    };
  } catch {
    return {
      rules: [],
      categories: [],
      accounts: [],
      conflicts: [],
      error: "No se pudieron cargar las reglas. Inténtalo de nuevo."
    };
  }
}
