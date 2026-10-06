import type { TransactionMonthData } from "@/definitions";

export class MonthRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

export async function requestTransactionMonth(
  month: string,
  signal: AbortSignal
): Promise<TransactionMonthData> {
  const response = await fetch(
    `/api/transactions/month?month=${encodeURIComponent(month)}`,
    { signal, cache: "no-store" }
  );
  const payload = await response.json();
  if (!response.ok)
    throw new MonthRequestError(
      payload.reason ?? "No se pudieron cargar los movimientos.",
      response.status
    );
  if (
    !payload.data ||
    payload.data.error ||
    payload.data.selectedMonth.value !== month
  )
    throw new MonthRequestError("No se pudo cargar el mes seleccionado.", 500);
  return payload.data;
}
