import type {
  BankingDataSource,
  InstitutionAvailability,
  MonthlyTransactionRange,
  MonthlyTransactionSummary,
  ProviderStatusView,
  Result,
  TransactionCategoryGroupSummary
} from "@/definitions";

import { getPublicErrorReason } from "./publicError";

export async function loadProviderStatus(
  dataSource: BankingDataSource
): Promise<Result<ProviderStatusView>> {
  try {
    const application = await dataSource.getProviderApplication();

    return {
      ok: true,
      value: {
        status: "success",
        applicationName: application.name,
        isDemo: dataSource.mode === "demo"
      }
    };
  } catch (error) {
    return getFailedResult(
      error,
      "No se pudo comprobar la conexión con Enable Banking."
    );
  }
}

export async function loadInstitutions(
  dataSource: BankingDataSource
): Promise<Result<InstitutionAvailability[]>> {
  try {
    return { ok: true, value: await dataSource.listAvailableInstitutions() };
  } catch (error) {
    return getFailedResult(error, "No se pudo cargar la lista de bancos.");
  }
}

export async function loadMonthlyTransactions(
  dataSource: BankingDataSource,
  userId: string,
  range: MonthlyTransactionRange
): Promise<Result<MonthlyTransactionSummary[]>> {
  try {
    return {
      ok: true,
      value: await dataSource.listMonthlyTransactions(userId, range)
    };
  } catch (error) {
    return getFailedResult(error, "No se pudieron cargar los movimientos.");
  }
}

export async function loadTransactionCategoryGroups(
  dataSource: BankingDataSource,
  userId: string
): Promise<Result<TransactionCategoryGroupSummary[]>> {
  try {
    return {
      ok: true,
      value: await dataSource.listTransactionCategoryGroups(userId)
    };
  } catch (error) {
    return getFailedResult(error, "No se pudieron cargar las categorías.");
  }
}

function getFailedResult(error: unknown, fallback: string) {
  return {
    ok: false,
    reason: getPublicErrorReason(error, fallback)
  } as const;
}
