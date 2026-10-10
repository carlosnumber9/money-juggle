import type {
  BankingDataSource,
  InvestmentsView,
  PortfolioSnapshot,
  PortfolioSnapshotSummary
} from "@/definitions";
import { parseDecimal } from "@/lib/domain/decimal";

export function buildInvestmentsView(
  latest: PortfolioSnapshot | null,
  history: PortfolioSnapshotSummary[],
  error: string | null = null
): InvestmentsView {
  return {
    latest: latest
      ? {
          ...latest,
          positions: [...latest.positions].sort((a, b) => {
            const difference = parseDecimal(b.value) - parseDecimal(a.value);
            return difference > 0n
              ? 1
              : difference < 0n
                ? -1
                : a.isin.localeCompare(b.isin);
          })
        }
      : null,
    points: [...history]
      .sort((a, b) => a.reportDate.localeCompare(b.reportDate))
      .map((row) => ({
        date: row.reportDate,
        timestamp: Date.parse(`${row.reportDate}T00:00:00Z`),
        cash: Number(row.cash),
        investments: Number(row.investments)
      })),
    error
  };
}

export async function loadLatestPortfolio(
  dataSource: BankingDataSource,
  userId: string
) {
  try {
    return {
      latest: await dataSource.getLatestPortfolioSnapshot(userId),
      error: null
    };
  } catch {
    return { latest: null, error: "No se pudieron cargar las inversiones." };
  }
}

export async function loadInvestmentsView(
  dataSource: BankingDataSource,
  userId: string
): Promise<InvestmentsView> {
  try {
    const [latest, history] = await Promise.all([
      dataSource.getLatestPortfolioSnapshot(userId),
      dataSource.listPortfolioHistory(userId)
    ]);
    return buildInvestmentsView(latest, history);
  } catch {
    return buildInvestmentsView(
      null,
      [],
      "No se pudieron cargar las inversiones. Inténtalo de nuevo."
    );
  }
}
