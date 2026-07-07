import type {
  BankingDataSource,
  BankConnectionSummary,
  Result
} from "@/definitions";

import { getPublicErrorReason } from "./publicError";

export async function loadConnections(
  dataSource: BankingDataSource,
  userId: string
): Promise<Result<BankConnectionSummary[]>> {
  try {
    return {
      ok: true,
      value: await dataSource.listBankConnections(userId)
    };
  } catch (error) {
    return {
      ok: false,
      reason: getPublicErrorReason(
        error,
        "No se pudieron cargar las cuentas conectadas."
      )
    };
  }
}
