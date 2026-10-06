import { useRef, useState, useTransition } from "react";

import type { MonthlyTransactionSummary } from "@/definitions";

import { useMonthInvalidation } from "./useMonthInvalidation";

import { updateTransactionCategoryAction } from "./actions";
import {
  getCategoryIdFromSelectValue,
  getInitialCategorySelectValue,
  UNCATEGORIZED_CATEGORY_VALUE
} from "./transactionCategoryOptions";

export function useTransactionCategoryAssignment(
  transaction: MonthlyTransactionSummary,
  onSelectedCategoryChange: (selectedCategoryValue: string) => void
) {
  const monthCache = useMonthInvalidation();
  const [isPending, startTransition] = useTransition();
  const requestIdRef = useRef(0);
  const [selectedCategoryValue, setSelectedCategoryValue] = useState(
    getInitialCategorySelectValue(transaction)
  );
  const [sourceCategory, setSourceCategory] = useState(
    getInitialCategorySelectValue(transaction)
  );
  if (sourceCategory !== getInitialCategorySelectValue(transaction)) {
    setSourceCategory(getInitialCategorySelectValue(transaction));
    setSelectedCategoryValue(getInitialCategorySelectValue(transaction));
  }
  const [saveError, setSaveError] = useState<string | null>(null);

  function updateSelectedCategory(nextValue: string | null) {
    const nextCategoryValue = nextValue ?? UNCATEGORIZED_CATEGORY_VALUE;
    const previousCategoryValue = selectedCategoryValue;
    const requestId = requestIdRef.current + 1;

    requestIdRef.current = requestId;
    setSelectedCategoryValue(nextCategoryValue);
    onSelectedCategoryChange(nextCategoryValue);
    setSaveError(null);

    startTransition(async () => {
      const month = transaction.reporting_date?.slice(0, 7);
      await monthCache.cancel(month ? [month] : undefined);
      const result = await updateTransactionCategoryAction({
        transactionId: transaction.id,
        categoryId: getCategoryIdFromSelectValue(nextCategoryValue)
      }).catch(() => null);
      monthCache.checkResult(result);
      if (requestId !== requestIdRef.current) return;
      if (!result?.ok) {
        setSelectedCategoryValue(previousCategoryValue);
        onSelectedCategoryChange(previousCategoryValue);
        setSaveError(
          result?.reason ??
            "No se pudo guardar la categoría. Inténtalo de nuevo."
        );
      }
      await monthCache.invalidate(month ? [month] : undefined);
    });
  }

  return {
    isPending,
    saveError,
    selectedCategoryValue,
    updateSelectedCategory
  };
}
