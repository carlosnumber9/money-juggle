import "server-only";

import { BANKS } from "@/definitions";
import type {
  BankingDataSource,
  BankConnectionSummary,
  BankInstitutionCard,
  InstitutionAvailability,
  MonthlyTransactionSummary,
  PrivateHomeView,
  ProviderStatusView,
  Result
} from "@/definitions";
import { getBankingDataSource } from "@/lib/data/get-banking-data-source";
import { getCurrentMonthTransactionRange } from "@/lib/domain/transaction-ranges";

const DECIMAL_SCALE = 6;
const DECIMAL_FACTOR = 1_000_000n;
const STALE_LINKING_AFTER_MS = 15 * 60 * 1000;

export async function getPrivateHomeView(): Promise<PrivateHomeView> {
  const dataSource = getBankingDataSource();
  const user = await dataSource.getCurrentUser();

  if (!user) {
    return { kind: "unauthenticated" };
  }

  if (!user.isAllowed) {
    return { kind: "forbidden" };
  }

  const transactionRange = getCurrentMonthTransactionRange();
  const [connectionsResult, providerResult, transactionsResult] =
    await Promise.all([
      loadConnections(dataSource, user.id),
      loadProviderStatus(dataSource),
      loadMonthlyTransactions(dataSource, user.id, transactionRange)
    ]);
  const providerStatus: ProviderStatusView = providerResult.ok
    ? providerResult.value
    : {
        status: "error",
        reason: providerResult.reason,
        isDemo: dataSource.mode === "demo"
      };
  const institutionsResult =
    providerStatus.status === "success"
      ? await loadInstitutions(dataSource)
      : undefined;
  const bankCards = buildBankCards({
    connectionsResult,
    institutionsResult,
    providerStatus
  });
  const monthlyTransactionRows = transactionsResult.ok
    ? transactionsResult.value
    : [];

  return {
    kind: "ready",
    user: {
      email: user.email
    },
    providerStatus,
    bankCards,
    monthlyTransactions: {
      range: transactionRange,
      rows: monthlyTransactionRows,
      error: transactionsResult.ok ? null : transactionsResult.reason
    }
  };
}

async function loadConnections(
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

async function loadProviderStatus(
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
    return {
      ok: false,
      reason: getPublicErrorReason(
        error,
        "No se pudo comprobar la conexión con Enable Banking."
      )
    };
  }
}

async function loadInstitutions(
  dataSource: BankingDataSource
): Promise<Result<InstitutionAvailability[]>> {
  try {
    return {
      ok: true,
      value: await dataSource.listAvailableInstitutions()
    };
  } catch (error) {
    return {
      ok: false,
      reason: getPublicErrorReason(
        error,
        "No se pudo cargar la lista de bancos."
      )
    };
  }
}

async function loadMonthlyTransactions(
  dataSource: BankingDataSource,
  userId: string,
  range: { from: string; to: string }
): Promise<Result<MonthlyTransactionSummary[]>> {
  try {
    return {
      ok: true,
      value: await dataSource.listMonthlyTransactions(userId, range)
    };
  } catch (error) {
    return {
      ok: false,
      reason: getPublicErrorReason(
        error,
        "No se pudieron cargar los movimientos."
      )
    };
  }
}

function buildBankCards({
  connectionsResult,
  institutionsResult,
  providerStatus
}: {
  connectionsResult: Result<BankConnectionSummary[]>;
  institutionsResult?: Result<InstitutionAvailability[]>;
  providerStatus?: ProviderStatusView;
}): BankInstitutionCard[] {
  return BANKS.map((bank): BankInstitutionCard => {
    if (bank.provider === "manual") {
      return {
        ...bank,
        state: "unavailable",
        tooltip:
          "Trade Republic todavía no está disponible en esta conexión automática."
      };
    }

    const connection = connectionsResult.ok
      ? connectionsResult.value.find((candidate) =>
          candidate.institution?.name
            .toLowerCase()
            .includes(bank.name.toLowerCase())
        )
      : undefined;

    if (connection?.status === "linked") {
      return {
        ...bank,
        state: "connected",
        tooltip: `${bank.name} conectado correctamente.`,
        balanceTotals: buildBalanceTotals(connection),
        accounts: connection.accounts.map((account) => ({
          id: account.id,
          name: account.name,
          ibanLast4: account.iban_last4,
          accountType: account.account_type,
          latestBalance: account.latest_balance
            ? {
                amount: account.latest_balance.amount,
                currency: account.latest_balance.currency,
                balanceType: account.latest_balance.balance_type,
                referenceDate: account.latest_balance.reference_date,
                fetchedAt: account.latest_balance.fetched_at
              }
            : null
        }))
      };
    }

    if (connection?.status === "linking") {
      const isStaleLinking = isStaleLinkingConnection(connection);

      return {
        ...bank,
        aspspName: connection.institution?.name ?? bank.name,
        country: connection.institution?.country ?? undefined,
        state: isStaleLinking ? "stale-linking" : "linking",
        tooltip: isStaleLinking
          ? `La conexión con ${bank.name} parece atascada. Puedes reintentarla.`
          : `Conexión con ${bank.name} en curso.`
      };
    }

    if (connection?.status === "error") {
      return {
        ...bank,
        aspspName: connection.institution?.name ?? bank.name,
        country: connection.institution?.country ?? undefined,
        state: "error",
        tooltip: `La conexión con ${bank.name} terminó con error.`
      };
    }

    if (!connectionsResult.ok) {
      return {
        ...bank,
        state: "error",
        tooltip: connectionsResult.reason
      };
    }

    if (providerStatus?.status === "error") {
      return {
        ...bank,
        state: "error",
        tooltip: providerStatus.reason
      };
    }

    if (!institutionsResult) {
      return {
        ...bank,
        state: "error",
        tooltip: "No se pudo comprobar la disponibilidad del banco."
      };
    }

    if (!institutionsResult.ok) {
      return {
        ...bank,
        state: "error",
        tooltip: institutionsResult.reason
      };
    }

    const institution = institutionsResult.value.find((candidate) =>
      candidate.name.toLowerCase().includes(bank.name.toLowerCase())
    );

    if (!institution) {
      return {
        ...bank,
        state: "unavailable",
        tooltip: `${bank.name} no aparece ahora mismo en la lista de Enable Banking.`
      };
    }

    return {
      ...bank,
      aspspName: institution.name,
      country: institution.country,
      state: "idle",
      tooltip: `${bank.name} disponible en Enable Banking.`
    };
  });
}

function isStaleLinkingConnection(connection: BankConnectionSummary): boolean {
  const lastChangedAt = new Date(connection.updated_at).getTime();

  return (
    Number.isFinite(lastChangedAt) &&
    Date.now() - lastChangedAt > STALE_LINKING_AFTER_MS
  );
}

function buildBalanceTotals(connection: BankConnectionSummary) {
  const totalsByCurrency = new Map<
    string,
    {
      amount: bigint;
      fetchedAt: string | null;
    }
  >();

  for (const account of connection.accounts) {
    const balance = account.latest_balance;

    if (!balance) {
      continue;
    }

    const current = totalsByCurrency.get(balance.currency) ?? {
      amount: 0n,
      fetchedAt: null
    };

    totalsByCurrency.set(balance.currency, {
      amount: current.amount + parseDecimal(balance.amount),
      fetchedAt:
        !current.fetchedAt || balance.fetched_at > current.fetchedAt
          ? balance.fetched_at
          : current.fetchedAt
    });
  }

  return Array.from(totalsByCurrency.entries()).map(([currency, total]) => ({
    amount: formatDecimal(total.amount),
    currency,
    fetchedAt: total.fetchedAt
  }));
}

function parseDecimal(value: string): bigint {
  const trimmed = value.trim();
  const sign = trimmed.startsWith("-") ? -1n : 1n;
  const unsigned = trimmed.replace(/^[+-]/, "");
  const [whole = "0", fraction = ""] = unsigned.split(".");
  const normalizedFraction = fraction
    .padEnd(DECIMAL_SCALE, "0")
    .slice(0, DECIMAL_SCALE);

  return (
    sign *
    (BigInt(whole || "0") * DECIMAL_FACTOR + BigInt(normalizedFraction || "0"))
  );
}

function formatDecimal(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  const whole = absolute / DECIMAL_FACTOR;
  const fraction = (absolute % DECIMAL_FACTOR)
    .toString()
    .padStart(DECIMAL_SCALE, "0")
    .replace(/0+$/, "");

  return `${sign}${whole.toString()}${fraction ? `.${fraction}` : ""}`;
}

function getPublicErrorReason(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.startsWith("Missing ")) {
    return "Falta configuración privada en el servidor.";
  }

  return fallback;
}
