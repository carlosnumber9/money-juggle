import type {
  MonthlyReportData,
  MonthlyTransactionCategory,
  MonthlyTransactionRange
} from "@/definitions";
import { formatDecimal, parseDecimal } from "@/lib/domain/decimal";
import { buildReportingMovementSet } from "@/lib/domain/reportingMovements";
import { getSelectedTransactionMonth } from "@/lib/domain/transactionRanges";

import { selectReportBalances } from "./accountBalances";
import { isInReportRange } from "./period";
import type {
  CategoryTreatment,
  MonthlyExportReport,
  ReportAccountRow,
  ReportCategoryRow
} from "./types";

export function buildMonthlyExportReport(
  data: MonthlyReportData,
  month: string,
  generatedAt: Date
): MonthlyExportReport {
  const period = getSelectedTransactionMonth(month, generatedAt);
  if (period.value !== month) throw new Error("Invalid monthly report period.");
  const range = period.range;
  const observations = [
    "Informe parcial: la cobertura bancaria completa del mes no puede verificarse con los datos guardados.",
    "Se incluyen solo movimientos contabilizados. Categorías usa fecha económica; Cuentas usa fecha bancaria.",
    "Ingresos y gastos son netos por categoría; pueden ser negativos. Los campos no aplicables quedan vacíos y los desconocidos se explican en observaciones.",
    "No disponibles en esta versión: recurrencia, nóminas pendientes, reservas para pagos, colchón y valoraciones de inversiones.",
    "El excedente excluye movimientos sin categoría y no representa por sí solo variación del efectivo ni del patrimonio."
  ];
  const accountsById = new Map(
    data.accounts.map((account) => [account.id, account])
  );
  const incomeGroupIds = new Set(
    data.categoryGroups
      .filter((group) => group.slug === "income")
      .map((group) => group.id)
  );
  const rows = new Map<string, ReportCategoryRow>();
  const economicTransactions = data.transactions.filter(
    (transaction) =>
      transaction.booking_status === "booked" &&
      isInReportRange(transaction.reporting_date, range)
  );
  const reporting = buildReportingMovementSet({
    transactions: economicTransactions,
    adjustments: data.adjustments.filter((adjustment) =>
      isInReportRange(adjustment.reportingDate, range)
    )
  });
  const originalById = new Map(
    economicTransactions.map((transaction) => [transaction.id, transaction])
  );

  function addCategory(
    accountId: string | null,
    category: MonthlyTransactionCategory | null,
    currency: string,
    amount: string,
    treatment: CategoryTreatment,
    note = ""
  ) {
    const account = accountId ? accountsById.get(accountId) : null;
    if (accountId && !account)
      throw new Error("Report transaction account was not loaded.");
    const key = JSON.stringify([
      accountId,
      category?.id ?? null,
      currency,
      treatment
    ]);
    const current = rows.get(key);
    const net = formatDecimal(
      parseDecimal(current?.net ?? "0") + parseDecimal(amount)
    );
    rows.set(key, {
      account: account
        ? `${account.institution} · ${account.name}`
        : "Ajustes sin cuenta",
      category: category?.group.name ?? "Sin categoría",
      subcategory: category?.name ?? "Sin categoría",
      currency,
      treatment,
      net,
      income:
        treatment === "income" ? net : treatment === "expense" ? "0" : null,
      expenses:
        treatment === "expense"
          ? formatDecimal(-parseDecimal(net))
          : treatment === "income"
            ? "0"
            : null,
      observations: [current?.observations, note]
        .filter(Boolean)
        .filter((value, index, values) => values.indexOf(value) === index)
        .join(" ")
    });
  }

  for (const movement of reporting.movements) {
    const transaction = originalById.get(movement.id);
    addCategory(
      transaction?.account_id ?? null,
      movement.category,
      movement.currency,
      movement.amount,
      getTreatment(movement.category, incomeGroupIds),
      movement.source === "reconciliation_adjustment"
        ? "Ajuste de compensación: importe y fecha configurados, contado una sola vez."
        : ""
    );
  }
  for (const excluded of reporting.excludedTransactions) {
    if (excluded.reason !== "internal_transfer") continue;
    const transaction = excluded.transaction;
    const treatment = getTreatment(transaction.category, incomeGroupIds);
    addCategory(
      transaction.account_id,
      transaction.category,
      transaction.currency,
      transaction.amount,
      treatment === "savings" || treatment === "investment"
        ? treatment
        : "internal_transfer",
      "Transferencia interna: excluida de ingresos y gastos."
    );
  }

  const categories = [...rows.values()].sort(
    (left, right) =>
      left.account.localeCompare(right.account, "es") ||
      left.category.localeCompare(right.category, "es") ||
      left.subcategory.localeCompare(right.subcategory, "es") ||
      left.currency.localeCompare(right.currency) ||
      left.treatment.localeCompare(right.treatment)
  );
  const currencies = [
    ...new Set([
      ...categories.map((row) => row.currency),
      ...data.accounts.map((account) => account.currency)
    ])
  ].sort();
  const totals = currencies.map((currency) => {
    const currencyRows = categories.filter((row) => row.currency === currency);
    const income = currencyRows.reduce(
      (sum, row) => sum + parseDecimal(row.income ?? "0"),
      0n
    );
    const expenses = currencyRows.reduce(
      (sum, row) => sum + parseDecimal(row.expenses ?? "0"),
      0n
    );
    const uncategorized = currencyRows
      .filter((row) => row.treatment === "uncategorized")
      .reduce((sum, row) => sum + parseDecimal(row.net), 0n);
    const neutral = currencyRows
      .filter(
        (row) =>
          row.treatment !== "income" &&
          row.treatment !== "expense" &&
          row.treatment !== "uncategorized"
      )
      .reduce((sum, row) => sum + parseDecimal(row.net), 0n);
    return {
      currency,
      income: formatDecimal(income),
      expenses: formatDecimal(expenses),
      surplus: formatDecimal(income - expenses),
      uncategorized: formatDecimal(uncategorized),
      neutral: formatDecimal(neutral)
    };
  });
  if (categories.some((row) => row.treatment === "uncategorized")) {
    observations.push(
      "Movimientos sin categoría: se muestra únicamente su saldo neto, fuera de ingresos y gastos del Resumen."
    );
  }
  if (economicTransactions.length === 0 && data.adjustments.length === 0)
    observations.push(
      "No hay movimientos económicos guardados para este mes; esto no demuestra ausencia de actividad bancaria."
    );
  const reviewCount = new Set(
    data.transactions
      .filter((transaction) => transaction.reconciliation?.requiresReview)
      .map((transaction) => transaction.reconciliation!.id)
  ).size;
  if (reviewCount)
    observations.push(
      `${reviewCount} compensaciones requieren revisión; se conserva el tratamiento configurado.`
    );
  if (data.unavailableAdjustmentCount)
    observations.push(
      `${data.unavailableAdjustmentCount} ajustes de compensación no disponibles: datos incompletos o miembros no contabilizados.`
    );
  const missingEconomicDates = data.transactions.filter(
    (transaction) =>
      transaction.booking_status === "booked" && !transaction.reporting_date
  ).length;
  if (missingEconomicDates)
    observations.push(
      `${missingEconomicDates} movimientos bancarios sin fecha económica no participan en Categorías.`
    );
  const accounts = buildAccountRows(data, range);
  const provisional =
    month === getSelectedTransactionMonth(undefined, generatedAt).value;
  if (provisional)
    observations.push(
      "Mes en curso: informe provisional hasta el cierre y la actualización de los datos."
    );
  return {
    month,
    generatedAt,
    provisional,
    totals,
    categories,
    accounts,
    observations
  };
}

function getTreatment(
  category: MonthlyTransactionCategory | null,
  incomeGroupIds: Set<string>
): CategoryTreatment {
  if (!category || category.slug === "uncategorized") return "uncategorized";
  if (category.slug === "internal_transfer") return "internal_transfer";
  if (category.slug === "savings_transfer") return "savings";
  if (category.slug === "investment_transfer") return "investment";
  if (category.slug === "cash_withdrawal") return "cash";
  return incomeGroupIds.has(category.group.id) ? "income" : "expense";
}

function buildAccountRows(
  data: MonthlyReportData,
  range: MonthlyTransactionRange
): ReportAccountRow[] {
  return data.accounts
    .flatMap((account) => {
      const transactions = data.transactions.filter(
        (transaction) =>
          transaction.account_id === account.id &&
          transaction.booking_status === "booked"
      );
      const currencies = [
        ...new Set([
          account.currency,
          ...transactions.map((transaction) => transaction.currency),
          ...data.balances
            .filter((balance) => balance.account_id === account.id)
            .map((balance) => balance.currency)
        ])
      ].sort();
      return currencies.map((currency): ReportAccountRow => {
        const movements = transactions.filter(
          (transaction) => transaction.currency === currency
        );
        const booked = movements.filter((transaction) =>
          isInReportRange(transaction.booking_date, range)
        );
        const inflows = booked.reduce(
          (sum, transaction) =>
            sum +
            (parseDecimal(transaction.amount) > 0n
              ? parseDecimal(transaction.amount)
              : 0n),
          0n
        );
        const outflows = booked.reduce(
          (sum, transaction) =>
            sum +
            (parseDecimal(transaction.amount) < 0n
              ? -parseDecimal(transaction.amount)
              : 0n),
          0n
        );
        const selected = selectReportBalances(
          data.balances.filter(
            (balance) =>
              balance.account_id === account.id && balance.currency === currency
          ),
          range
        );
        const { first, last } = selected;
        const variation =
          first && last
            ? parseDecimal(last.amount) - parseDecimal(first.amount)
            : null;
        const missingBankDates = movements.some(
          (transaction) => !transaction.booking_date
        );
        const difference =
          selected.comparable && !missingBankDates && variation !== null
            ? inflows - outflows - variation
            : null;
        const notes: string[] = [
          "Entradas y salidas incluyen todos los movimientos bancarios guardados, también transferencias y compensaciones. Cobertura completa no verificada."
        ];
        if (!first || !last)
          notes.push(
            "Saldos históricos del mes no disponibles; no se utiliza el saldo actual como cierre."
          );
        else if (!selected.comparable)
          notes.push(
            "Saldos de fechas reales disponibles; no representan necesariamente inicio y cierre. Cuadre mensual no comparable."
          );
        if (first?.reference_date === null || last?.reference_date === null)
          notes.push(
            "Sin fecha bancaria de saldo: se indica fecha de captura en Europe/Madrid."
          );
        if (difference !== null && difference !== 0n)
          notes.push(
            "Diferencia de cuadre: revisar cobertura de movimientos y saldos."
          );
        if (missingBankDates)
          notes.push(
            "Hay movimientos sin fecha bancaria; entradas y salidas pueden estar incompletas."
          );
        for (const [label, relevant] of [
          [
            "Imputado económicamente a este mes, contabilizado fuera",
            movements.filter(
              (transaction) =>
                isInReportRange(transaction.reporting_date, range) &&
                transaction.booking_date !== null &&
                !isInReportRange(transaction.booking_date, range)
            )
          ],
          [
            "Contabilizado este mes, imputado económicamente fuera",
            booked.filter(
              (transaction) =>
                transaction.reporting_date !== null &&
                !isInReportRange(transaction.reporting_date, range)
            )
          ]
        ] as const) {
          if (relevant.length)
            notes.push(
              `${label}: saldo neto ${formatDecimal(relevant.reduce((sum, transaction) => sum + parseDecimal(transaction.amount), 0n))} ${currency}.`
            );
        }
        const sync = data.syncs.find(
          (value) => value.connectionId === account.connectionId
        );
        if (!sync?.finishedAt)
          notes.push(
            "Fecha de última sincronización finalizada no disponible."
          );
        if (sync?.status !== "succeeded")
          notes.push(
            "Última sincronización no completada correctamente o estado no disponible."
          );
        if (account.status !== "active")
          notes.push("Cuenta inactiva: se incluyen sus datos guardados.");
        return {
          account: account.name,
          institution: account.institution,
          currency,
          firstBalance: first?.amount ?? null,
          firstDate: first ? (first.reference_date ?? first.fetched_at) : null,
          firstDateSource: first
            ? first.reference_date
              ? "bank"
              : "capture"
            : null,
          lastBalance: last?.amount ?? null,
          lastDate: last ? (last.reference_date ?? last.fetched_at) : null,
          lastDateSource: last
            ? last.reference_date
              ? "bank"
              : "capture"
            : null,
          variation: variation === null ? null : formatDecimal(variation),
          inflows: formatDecimal(inflows),
          outflows: formatDecimal(outflows),
          reconciliationDifference:
            difference === null ? null : formatDecimal(difference),
          lastSync: sync?.finishedAt ?? null,
          observations: notes.join(" ")
        };
      });
    })
    .sort(
      (left, right) =>
        left.institution.localeCompare(right.institution, "es") ||
        left.account.localeCompare(right.account, "es") ||
        left.currency.localeCompare(right.currency)
    );
}
