"use client";

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Result } from "@/definitions";
import { usePrivateQuerySession } from "../PrivateQueryProvider";
import { invalidateTransactionMonths, monthKey } from "./monthCache";

export function useMonthInvalidation() {
  const client = useQueryClient();
  const { userId, rejectAccess } = usePrivateQuerySession();
  return useMemo(
    () => ({
      cancel: (months?: string[]) =>
        months
          ? Promise.all(
              [...new Set(months)].map((month) =>
                client.cancelQueries({
                  queryKey: monthKey(userId, month),
                  exact: true
                })
              )
            )
          : client.cancelQueries({ queryKey: monthKey(userId) }),
      invalidate: (months?: string[]) =>
        invalidateTransactionMonths(client, userId, months),
      checkResult: <T>(result: Result<T> | null) => {
        if (result && !result.ok && result.status) rejectAccess(result.status);
      }
    }),
    [client, userId, rejectAccess]
  );
}
