import { useState } from "react";

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
import { getSelectedCategoryLabel } from "./transactionCategoryOptions";

export function TransactionCategorySelect({
  transaction,
  categoryGroups
}: {
  transaction: MonthlyTransactionSummary;
  categoryGroups: TransactionCategoryGroupSummary[];
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    transaction.category?.id ?? null
  );

  return (
    <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
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
  );
}
