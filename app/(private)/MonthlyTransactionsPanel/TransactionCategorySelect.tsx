import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import type {
  MonthlyTransactionSummary,
  TransactionCategoryGroupSummary
} from "@/definitions";

import { getTransactionConcept } from "./formatters";
import {
  getSelectedCategoryLabel,
  UNCATEGORIZED_CATEGORY_VALUE
} from "./transactionCategoryOptions";
import { useTransactionCategoryAssignment } from "./useTransactionCategoryAssignment";

export function TransactionCategorySelect({
  transaction,
  categoryGroups
}: {
  transaction: MonthlyTransactionSummary;
  categoryGroups: TransactionCategoryGroupSummary[];
}) {
  const {
    isPending,
    saveError,
    selectedCategoryValue,
    updateSelectedCategory
  } = useTransactionCategoryAssignment(transaction);

  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      <Select
        value={selectedCategoryValue}
        onValueChange={updateSelectedCategory}
        disabled={isPending}
      >
        <SelectTrigger
          size="sm"
          aria-label={`Categoría de ${getTransactionConcept(transaction)}`}
          className="h-auto max-w-52 py-0 text-xs text-muted-foreground"
        >
          <SelectValue placeholder="Sin categoría">
            {(value) =>
              getSelectedCategoryLabel(value, categoryGroups, transaction)
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start" className="min-w-64">
          <SelectItem value={UNCATEGORIZED_CATEGORY_VALUE}>
            Sin categoría
          </SelectItem>
          {categoryGroups.map((group) => (
            <SelectGroup key={group.id}>
              <SelectLabel>{group.name}</SelectLabel>
              {group.categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      {saveError ? (
        <span className="text-xs text-destructive" role="status">
          {saveError}
        </span>
      ) : null}
    </div>
  );
}
