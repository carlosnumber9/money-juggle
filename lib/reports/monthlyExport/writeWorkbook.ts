import "server-only";

import writeExcelFile, {
  type Cell,
  type Row,
  type SheetData
} from "write-excel-file/node";
import { parseDecimal } from "@/lib/domain/decimal";

import type { CategoryTreatment, MonthlyExportReport } from "./types";

const TREATMENT_LABELS: Record<CategoryTreatment, string> = {
  income: "Ingreso",
  expense: "Gasto",
  uncategorized: "Sin categoría",
  internal_transfer: "Transferencia interna",
  savings: "Ahorro",
  investment: "Inversión",
  cash: "Movimiento de efectivo"
};

function text(value: string): Cell {
  return { type: String, value, wrap: true };
}

function money(value: string | null, currency: string): Cell {
  if (value === null) return null;
  const number = Number(value);
  if (
    !Number.isFinite(number) ||
    Math.abs(number) >= 1e15 ||
    parseDecimal(number.toFixed(6)) !== parseDecimal(value)
  ) {
    throw new Error("Report amount exceeds Excel numeric precision.");
  }
  return {
    type: Number,
    value: number,
    format: `#,##0.00####" ${currency}";[Red]-#,##0.00####" ${currency}"`
  };
}

function date(value: string | Date | null): Cell {
  if (value === null) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return {
      type: Date,
      value: new Date(`${value}T00:00:00Z`),
      format: "dd/mm/yyyy"
    };
  }
  const original = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(original);
  const part = (type: string) =>
    Number(parts.find((entry) => entry.type === type)?.value);
  return {
    type: Date,
    value: new Date(
      Date.UTC(
        part("year"),
        part("month") - 1,
        part("day"),
        part("hour"),
        part("minute"),
        part("second")
      )
    ),
    format: "dd/mm/yyyy hh:mm:ss"
  };
}

function header(values: string[]): Row {
  return values.map((value) => ({
    type: String,
    value,
    fontWeight: "bold",
    backgroundColor: "#163D3B",
    textColor: "#FFFFFF",
    wrap: true
  }));
}

export async function writeMonthlyWorkbook(
  report: MonthlyExportReport
): Promise<Buffer> {
  const summary: SheetData = [
    header(["Campo", "Valor"]),
    [
      text("Mes económico"),
      {
        type: Date,
        value: new Date(`${report.month}-01T00:00:00Z`),
        format: "yyyy-mm"
      }
    ],
    [text("Fecha de generación (Europe/Madrid)"), date(report.generatedAt)],
    [
      text("Estado del periodo"),
      text(report.provisional ? "Provisional" : "Periodo terminado")
    ],
    [
      text("Cobertura del informe"),
      text("Parcial; cobertura bancaria completa no verificada")
    ],
    [
      text("Cuentas incluidas"),
      text(
        [
          ...new Set(
            report.accounts.map(
              (account) => `${account.institution} · ${account.account}`
            )
          )
        ].join("\n") || "No hay cuentas guardadas"
      )
    ],
    [],
    header([
      "Moneda",
      "Ingresos netos",
      "Gastos netos",
      "Excedente",
      "Sin categoría: saldo neto",
      "Otros flujos excluidos: saldo neto"
    ]),
    ...report.totals.map((total) => [
      text(total.currency),
      money(total.income, total.currency),
      money(total.expenses, total.currency),
      money(total.surplus, total.currency),
      money(total.uncategorized, total.currency),
      money(total.neutral, total.currency)
    ]),
    [],
    header(["Observaciones"]),
    ...report.observations.map((observation) => [text(observation)])
  ];
  const categories: SheetData = [
    header([
      "Cuenta",
      "Categoría",
      "Subcategoría",
      "Moneda",
      "Tratamiento",
      "Ingresos netos",
      "Gastos netos",
      "Saldo neto",
      "Observaciones"
    ]),
    ...report.categories.map((row) => [
      text(row.account),
      text(row.category),
      text(row.subcategory),
      text(row.currency),
      text(TREATMENT_LABELS[row.treatment]),
      money(row.income, row.currency),
      money(row.expenses, row.currency),
      money(row.net, row.currency),
      text(row.observations)
    ])
  ];
  const accounts: SheetData = [
    header([
      "Cuenta",
      "Entidad",
      "Moneda",
      "Primer saldo disponible",
      "Fecha del primer saldo",
      "Origen de fecha inicial",
      "Último saldo disponible",
      "Fecha del último saldo",
      "Origen de fecha final",
      "Variación entre saldos",
      "Entradas bancarias del mes",
      "Salidas bancarias del mes",
      "Diferencia de cuadre mensual",
      "Última sincronización registrada",
      "Observaciones"
    ]),
    ...report.accounts.map((row) => [
      text(row.account),
      text(row.institution),
      text(row.currency),
      money(row.firstBalance, row.currency),
      date(row.firstDate),
      row.firstDateSource
        ? text(
            row.firstDateSource === "bank"
              ? "Fecha bancaria"
              : "Fecha de captura"
          )
        : null,
      money(row.lastBalance, row.currency),
      date(row.lastDate),
      row.lastDateSource
        ? text(
            row.lastDateSource === "bank"
              ? "Fecha bancaria"
              : "Fecha de captura"
          )
        : null,
      money(row.variation, row.currency),
      money(row.inflows, row.currency),
      money(row.outflows, row.currency),
      money(row.reconciliationDifference, row.currency),
      date(row.lastSync),
      text(row.observations)
    ])
  ];
  return writeExcelFile(
    [
      {
        sheet: "Resumen",
        data: summary,
        columns: [
          { width: 58 },
          { width: 48 },
          ...Array.from({ length: 4 }, () => ({ width: 25 }))
        ]
      },
      {
        sheet: "Categorías",
        data: categories,
        stickyRowsCount: 1,
        columns: [38, 28, 30, 10, 26, 22, 22, 22, 65].map((width) => ({
          width
        }))
      },
      {
        sheet: "Cuentas",
        data: accounts,
        stickyRowsCount: 1,
        columns: [
          30, 20, 10, 24, 25, 22, 24, 25, 22, 24, 25, 25, 25, 28, 70
        ].map((width) => ({ width }))
      }
    ],
    { fontFamily: "Calibri", fontSize: 11 }
  ).toBuffer();
}
