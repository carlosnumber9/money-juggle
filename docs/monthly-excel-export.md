# Monthly Excel Export

The dashboard exports an aggregate `.xlsx` workbook for a single economic month.
It is intended for later interpretation with Codex in an Obsidian vault, without
copying the transaction database into the vault.

## Interaction

- The spreadsheet icon beside Refresh opens the export dialog.
- The only inputs are the filename and month. The default is
  `Finanzas-YYYY-MM.xlsx` for the previous month in `Europe/Madrid`.
- The current month is allowed and explicitly provisional. Future months and
  malformed periods are rejected rather than silently replaced.
- Generation reads saved data. It does not refresh banks or contact the provider.
- A successful download closes the dialog. Failures leave it open for retry.
  Closing cancels the browser request.

## Stable Workbook Contract

The workbook has three Spanish worksheet names: `Resumen`, `Categorías`, and
`Cuentas`. Headers are stable. Tables have no merged cells or transaction rows.
Amounts are numeric cells with currency formatting; dates are Excel date cells.
Timestamp cells show Madrid wall-clock time, identified as `Europe/Madrid`.

`Resumen` contains the economic month, generation timestamp, provisional status,
included accounts, and separate currency totals for net income, net expenses,
surplus, uncategorized net balance, and excluded flows. Observations explain
coverage and unavailable data. The generation timestamp identifies the latest
export when the same month is exported again.

`Categorías` has these columns:

`Cuenta`, `Categoría`, `Subcategoría`, `Moneda`, `Tratamiento`, `Ingresos netos`,
`Gastos netos`, `Saldo neto`, `Observaciones`.

One row represents an account, category, currency, and reporting treatment.
Existing category groups map to `Categoría`; existing categories map to
`Subcategoría`. Treatments distinguish income, expense, uncategorized balance,
internal transfer, savings, investment, and cash movement. Reconciliation
adjustments use `Ajustes sin cuenta`, without inventing account attribution.

`Cuentas` has these columns:

`Cuenta`, `Entidad`, `Moneda`, `Primer saldo disponible`,
`Fecha del primer saldo`, `Origen de fecha inicial`, `Último saldo disponible`,
`Fecha del último saldo`, `Origen de fecha final`, `Variación entre saldos`,
`Entradas bancarias del mes`, `Salidas bancarias del mes`,
`Diferencia de cuadre mensual`, `Última sincronización registrada`, `Observaciones`.

All saved owner accounts are included, including inactive accounts. An account
with multiple currencies has separate rows. Account names can include a masked
IBAN suffix for disambiguation; internal and provider identifiers are not exported.

## Financial Rules

- Only booked transactions participate. Economic aggregates use `reporting_date`;
  bank inflows and outflows use `booking_date` and include neutral movements.
- The stable `income` category-group slug identifies income categories. Signed
  amounts are netted within each account/category/currency. Expense categories
  use the negated signed sum. Refunds therefore reduce category expenses rather
  than being counted as income. Negative and zero category totals are retained.
- Transactions without a category, or categorized as `uncategorized`, appear
  only as a separate net balance. They do not participate in income or expenses.
- Internal transfers, both directions of `savings_transfer` and
  `investment_transfer`, and `cash_withdrawal` do not participate in economic
  income or expenses. Their net aggregates remain visible separately.
- Reconciliation members remain neutral. A configured reportable residual is
  counted once, at its configured economic date and category. A residual with
  missing or unbooked members is unavailable and explicitly flagged.
- Summary totals derive from the same category rows. Surplus is income minus
  net expenses, excluding uncategorized and neutral flows. Currencies are never
  combined or converted.

Historical cash balances use their bank reference dates. Without a reference
date, the capture timestamp is shown and marked as a capture. Only observations
whose effective date lies in the selected month are used. The first and last
available observations are not silently described as opening and closing balances.
Monthly reconciliation is calculated only with an opening booked balance (`OPBD`)
on the first day and a closing booked balance (`CLBD`) on the last day, with no
loaded movements lacking booking dates. Any difference is shown explicitly.

The export is explicitly partial because complete provider coverage cannot be
proven from cached rows. Zero denotes an aggregate of the available rows, not
proof of no bank activity. Unknown numeric cells remain blank and are explained;
non-applicable income/expense cells remain blank and are identified by treatment.
Recurrence, pending salaries, reserved cash, liquidity cushions, loan principal
tracking, positions, and portfolio valuations are not inferred.

## Server Boundary And Verification

`POST /api/reports/monthly` accepts `{ "month": "YYYY-MM" }`. Session and email
allowlist are checked before reads. The owner comes from the session, never the
request. Reads use the existing Supabase server client, explicit owner filters,
and RLS; no service role or migration is needed. Transactions, matching context,
accounts, balances, category groups, and reconciliation members are paginated.

`write-excel-file/node` generates the workbook in memory. The response uses the
XLSX MIME type and `Cache-Control: private, no-store`. No file is persisted on the
server, and no workbook library enters the dashboard client bundle. Browser-owned
names are literal text cells, never interpreted as formulas. Unsupported numeric
precision fails rather than silently rounding an amount.

Tests verify financial aggregation, date separation, missing balances,
reconciliation, pagination, authorization, workbook structure, real date and
numeric cells, and exclusion of raw transactions. Local application startup and
browser testing are intentionally omitted unless explicitly requested.
