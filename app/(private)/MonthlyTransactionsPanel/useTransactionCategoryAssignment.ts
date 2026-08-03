import { useRef, useState, useTransition } from "react";

import type { MonthlyTransactionSummary } from "@/definitions";

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
  const [isPending, startTransition] = useTransition();
  const requestIdRef = useRef(0);
  const [selectedCategoryValue, setSelectedCategoryValue] = useState(
    getInitialCategorySelectValue(transaction)
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  function updateSelectedCategory(nextValue: string | null) {
    const nextCategoryValue = nextValue ?? UNCATEGORIZED_CATEGORY_VALUE;
    const previousCategoryValue = selectedCategoryValue;
    const requestId = requestIdRef.current + 1;

    requestIdRef.current = requestId;
    setSelectedCategoryValue(nextCategoryValue);
    onSelectedCategoryChange(nextCategoryValue);
    setSaveError(null);

    startTransition(() => {
      void updateTransactionCategoryAction({
        transactionId: transaction.id,
        categoryId: getCategoryIdFromSelectValue(nextCategoryValue)
      })
        .then((result) => {
          if (requestId !== requestIdRef.current || result.ok) {
            return;
          }

          setSelectedCategoryValue(previousCategoryValue);
          onSelectedCategoryChange(previousCategoryValue);
          setSaveError(result.reason);
        })
        .catch(() => {
          if (requestId !== requestIdRef.current) {
            return;
          }

          setSelectedCategoryValue(previousCategoryValue);
          onSelectedCategoryChange(previousCategoryValue);
          setSaveError("No se pudo guardar la categoría. Inténtalo de nuevo.");
        });
    });
  }

  return {
    isPending,
    saveError,
    selectedCategoryValue,
    updateSelectedCategory
  };
}
