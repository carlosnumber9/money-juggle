# Current Implementation State

Reviewed against repository source (`c1ebf10`) on 2026-10-11. This describes local
implementation, not a certification of production configuration or provider
availability. Update the affected entry when a feature changes.

## Runtime And Tooling

The app uses Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/Base UI,
Supabase SSR, and Enable Banking Account Information. Node.js 24.x and npm are
declared in [package.json](../package.json); use the lockfile for exact installed
versions. The deployment target is Vercel.

`npm run check` combines typecheck, lint, and formatting. Vitest tests are
colocated with source and run separately through `npm run test` or
`npm run test:coverage`. The [Quality workflow](../.github/workflows/quality.yml)
runs static checks and coverage on pushes to `main` and pull requests. It does
not build the application or apply migrations. Vercel Deployment Checks and
remote settings require independent operational verification.

## Capability Map

| Area                   | Implemented behavior                                                                                                                             | Entry points                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Authentication         | Owner password login, allowlist, cookie refresh, sign-out; no public registration or self-service recovery                                       | `app/login/`, `lib/auth/`, `lib/supabase/`, `proxy.ts`                                                  |
| Private home           | Dashboard, Transacciones, Evolución, Inversiones, Configuración; only the active panel loads its financial data                                  | `app/(private)/page.tsx`, `lib/views/privateHomeView/getPrivateHomeView.ts`                             |
| Bank authorization     | AIS discovery, authorization, state-validated callback, empty-account failure, iOS return page                                                   | `app/api/bank-connections/enable-banking/`, `app/bank-connection-result/`                               |
| Reconnection           | Reuses connection/history, strong account matching, authenticated owner review for ambiguous matches                                             | `lib/db/enableBankingConnections/`, `app/(private)/bank-connections/[connectionId]/review/`             |
| Synchronization        | Balance snapshots, overlapping recent transaction sync, current-year backfill, per-connection leases, cooldowns, partial-page persistence        | `lib/db/enableBankingBalances/`, `lib/db/enableBankingTransactions/`, `lib/db/enableBankingSync/`       |
| Dashboard refresh      | Eligible balances before transactions; six-hour automatic freshness, forced manual update, private SSE or JSON progress                          | `app/api/sync/dashboard/`, `app/(private)/DashboardSyncControls/`                                       |
| Transaction review     | Stored-month navigation, institution/direction/category filters, category assignment, labels, editable reporting date                            | `app/(private)/MonthlyTransactionsPanel/`, `lib/views/transactionMonthView.ts`                          |
| Browser cache          | Per-user/month memory cache, five-minute freshness, thirty-minute inactive retention, invalidation after writes/sync and cleanup after auth loss | `app/(private)/PrivateQueryProvider.tsx`, `app/(private)/MonthlyTransactionsPanel/monthCache.ts`        |
| Reconciliations        | Finalized same-currency booked groups, optional reportable residual, edit/delete, live balance and review state                                  | `lib/db/transactionReconciliations.ts`, `lib/domain/reconciliations.ts`, reconciliation dialogs/actions |
| Reporting UI           | Monthly cashflow, annual income/expense evolution, net category radar, annual labeled spending, net categorized savings                          | `lib/views/privateHomeView/`, `app/(private)/MonthlyEvolutionPanel/`                                    |
| Portfolio imports      | Reviewed Trade Republic EUR PDF snapshots, positions, cash/investment history, same-date replacement and responsive proximity navigation         | `app/(private)/investments/import/`, `lib/imports/tradeRepublic/`, `lib/db/portfolio/`                  |
| Excel export           | Four sheets from authenticated saved-data reads, including a dated portfolio observation; no bank refresh                                        | `app/api/reports/monthly/route.ts`, `lib/db/monthlyReportData.ts`, `lib/reports/monthlyExport/`         |
| Report CLI             | Shares Excel logic, authenticates owner with RLS, replaces one workbook per month atomically                                                     | `scripts/report-monthly.ts`, `scripts/monthlyReport.ts`                                                 |
| Provider display cache | Five-minute normalized application/catalog metadata cache; no financial-data cache at this boundary                                              | `lib/enableBanking/displayMetadata.ts`                                                                  |

CaixaBank, ING, and Trade Republic current-account cash use the same AIS path.
Trade Republic portfolio valuation and positions use reviewed PDF snapshots;
crypto imports and a brokerage API client remain deferred. See
[Portfolio imports](portfolio-imports.md). Dashboard balances
select latest saved observations; Excel uses historical observations and admits
Trade Republic `OTHR` cash only, without treating it as booked opening/closing
balance evidence. Its separate `Inversiones` sheet selects the latest confirmed
PDF report date up to the selected month end, preserves quote dates and declared
valuations, and omits PDF cash from economic and account totals.

## Category Rules

The private Settings tab provides a half-width rule card with a fixed-height
scrolling table showing status icons, editable names and removal. Rows open the
detail/edit dialog; icons toggle active/paused rules directly. Authenticated
rule CRUD and confirmed MiniLM proposals share
owned storage. Discovery uses a pinned q8 multilingual model server-side over
up to twelve months of saved history; it never sends transaction text to a
hosted inference service. Future deterministic assignment runs after provider
persistence through an owner-checked service-only RPC, preserving manual
categories and manually cleared categories. Conflicting categories require
review. See [Category rules](category-rules.md) for limits and operational checks.

The additive rule migration is applied separately after implementation checks.
Local source does not establish remote schema or Vercel invocation status.

## Important Financial And Ownership Boundaries

- Reporting uses app-owned `reporting_date`; bank movement and account export
  calculations use `booking_date`. Internal transfer detection keeps bank dates.
- Original internal-transfer and reconciled rows remain visible for review but
  are financially neutral in the shared reporting pipeline. Configured residual
  adjustments contribute once. The separate savings chart sums original signed
  `savings_transfer` rows, including neutral rows.
- Dashboard cashflow and Excel totals have different contracts. Evolution nets
  categorized movements by month, while Excel separates income/expense category
  groups, uncategorized balances, and neutral cash flows. Do not assume equality.
- Excel includes booked transactions only. Dashboard/chart functions do not
  impose that same booking-status restriction on their supplied rows.
- Provider persistence upserts by `user_id`, `account_id`, and `stable_import_key`
  in batches of 100. It preserves first-seen time, existing reporting dates, and
  omitted user metadata. Matching changed identities to older rows is not
  implemented; fallback fingerprints are imperfect.
- Financial reads/export use authenticated RLS. Provider writes, category
  assignment, and reporting-date edits use narrow server-only elevated helpers
  with explicit ownership checks. Labels and reconciliation mutations use the
  authenticated persistence path. Portfolio reads and writes also use authenticated
  RLS; exact-decimal read views preserve the underlying owner policies. See
  [Security](security.md).

## Schema Evidence

The executable local schema is the ordered chain in
[Supabase migrations](../supabase/migrations/), documented in
[Data model](data-model.md). It includes provider connection fields, account
fingerprints, category seeds, labels, provider cooldowns, connection leases,
transaction freshness, reporting dates, category rules and assignment provenance, reconciliations, and reconciliation
state RPCs, portfolio drafts/snapshots/positions and exact-decimal read views.
Owned tables enable RLS; institutions are authenticated reference data.

[Reconciliation SQL verification](../supabase/tests/transaction_reconciliation_states.sql)
uses rollback fixtures. Applying migrations and running linked database checks
are explicit operational actions, not incidental documentation verification.
[Portfolio SQL verification](../supabase/tests/portfolio_imports.sql) was executed
in isolated PostgreSQL during implementation. Local files do not establish which
migrations are deployed remotely.

## Remaining Work And Verification Limits

- No Vercel Cron or unattended sync route is implemented.
- No general manual asset UI/table, brokerage API client, crypto import, or Cobee
  client exists. Reviewed portfolio PDF imports are implemented; Cobee remains
  dated research.
- No automatic categorization rules, global category/label management UI, or
  transaction-list label filter exists. Annual label reporting is implemented.
- No dedicated `/privacy` or `/terms` page exists, despite URLs recorded in
  provider-registration notes. Confirm deployment requirements before relying
  on those URLs.
- Historical coverage is not proven complete. Stored-month exploration and
  report export do not fetch missing bank history. Ordinary monthly transaction
  reads do not paginate, whereas export and reconciliation-state reads do.
- Identity promotion, pending-to-booked merging, and focused persistence
  idempotency coverage remain work to evaluate before scheduled sync.
- MFA/passkeys, durable audit logs, backup restore drills, broader rate limiting,
  and production monitoring remain hardening work.
- Browser appearance, iOS bank return behavior, provider access, remote RLS,
  deployed migrations, and production settings need their own explicit checks.
  Static and mocked tests cannot establish these external facts.

See [Roadmap](feature-roadmap.md) for incremental planning and
[Monthly Excel export](monthly-excel-export.md) for the workbook contract.
