# Product

`money-juggle` is a personal finance application for reviewing the owner's financial situation from mobile and desktop.

The product should reduce manual work by connecting to financial institutions through Open Banking / PSD2 wherever possible, reading account balances and transactions, and turning them into useful personal reports.

## Problem

Personal finance tracking often depends on manual exports from banking websites, spreadsheets, and repeated reconciliation. That creates friction, stale data, and inconsistent reports.

This app should make financial review easier by collecting read-only financial data through secure server-side integrations and presenting it in one place.

## Goals

- Provide a private view of accounts, balances, and transactions.
- Avoid routine manual bank statement exports.
- Store imported transactions in a way that avoids duplicates across repeated syncs.
- Let the owner categorize transactions according to their own reporting preferences.
- Let the owner optionally label transactions for cross-category groupings such
  as trips, events, or one-off projects.
- Support mobile and desktop usage.
- Keep bank integrations read-only.
- Use PSD2/Open Banking for supported banks.
- Keep non-bank benefit data, such as Cobee by Pluxee consumption reports,
  separate from PSD2 bank data while still making it visible in personal
  reports when useful.
- Build reports incrementally instead of creating a large product all at once.
- Keep the system understandable enough that the owner can learn from each feature.

## Non-Goals

- Payment initiation.
- Transfers.
- Billing, checkout, mandates, or collections.
- Online banking scraping.
- Storage of bank credentials.
- A public SaaS product in the initial phase.
- Automated investment trading.
- A complete accounting system.
- Full app generation before the core concepts are understood.

## Primary Use Cases

- Sign in securely with the owner email and password.
- Connect a supported bank through a PSD2 consent flow.
- View connected accounts.
- Review latest balances.
- Review transactions.
- Review selected-month transactions grouped by date.
- Filter selected-month transactions by institution and by income or spending.
- Categorize transactions quickly for personal reporting.
- Label selected transactions so a temporary context, such as a specific trip,
  can be reported across many categories.
- Understand monthly income and spending.
- Move month by month through stored data to review older transactions and the
  matching visualizations.
- Compare bank spending with external benefit consumption data when a safe
  official integration exists.
- Import and review Trade Republic portfolio PDFs, inspect positions and compare
  observed cash/investment values over time.
- Reconnect a bank when consent expires.

## Target Banks And Platforms

| Institution or platform | Initial approach                   | Notes                                                                       |
| ----------------------- | ---------------------------------- | --------------------------------------------------------------------------- |
| CaixaBank               | Enable Banking Account Information | Primary PSD2 path; linked as an own account.                                |
| ING                     | Enable Banking Account Information | Primary PSD2 path; linked as an own account.                                |
| Trade Republic          | Enable Banking Account Information | AIS cash/movements; reviewed PDFs for portfolio positions. Crypto deferred. |
| Cobee by Pluxee         | Exploratory official API           | Flexible compensation consumptions; separate from bank Account Information. |

## Current Capabilities And Limitations

See [current state](current-state.md) for code entry points and verification
limits, and [roadmap](feature-roadmap.md) for remaining scope.

- The current implemented foundation covers authentication, owner allowlist
  checks, consent tracking, account sync, balance sync, transaction sync, a
  first private dashboard, selected-month transaction review, and inline manual
  transaction categorization and labeling.
- Reporting includes selected-month cashflow cards, current-year net category
  income/spending evolution, a selected-month category radar, annual labeled
  spending, and signed net categorized savings. Monthly Excel export is
  implemented from both the dashboard and CLI, with a distinct aggregate
  contract and explicitly unverified historical coverage. It is not a complete
  accounting, budgeting, or portfolio system.
- Reporting dates are owner-editable without changing bank booking dates.
  Finalized reconciliations exclude grouped principal movements and optionally
  report a residual difference once.
- Reconnection preserves historical accounts and offers an owner review when
  strong account matching cannot resolve renewed consent.
- Transfers between the owner's own accounts remain visible as imported
  movements for review, but they are financially neutral. When the app detects
  them from account data or the owner assigns the `internal_transfer` category,
  they must not affect transaction-derived income, spending, report totals,
  report currency selection, category or label charts, or income/expense
  filters.
- Previous/next month controls explore stored Supabase data from the transaction
  review and category expense chart. They do not automatically request more
  history from Enable Banking.
- Transaction sync should gain focused idempotency tests before scheduled sync is introduced.
- Reporting should start simple and become richer later.
- Categorization has started as user-owned app metadata. Automated rules remain
  future work.
- Labels can be created, assigned, and removed from transaction detail; annual
  labeled expense reporting is implemented. Global management and
  transaction-list label filtering remain future work. Labels complement
  categories rather than replacing them.
- Cobee by Pluxee is a future exploratory integration. Real implementation
  should wait until API access, available data granularity, and credential
  handling are confirmed.
- Investment data should not block the banking foundation.
- Trade Republic current-account cash and movements use Enable Banking AIS.
  Portfolio positions and valuation come from reviewed PDF snapshots, with
  separate observed cash/investment history. Crypto and general manual assets
  remain deferred. See [Portfolio imports](portfolio-imports.md).
- No banking credentials should ever be stored.

## Read-Only Meaning

Read-only means the app can request permission to read account information, balances, and transactions. It must not move money, initiate payments, create mandates, create transfers, or change anything inside the bank account.

The app should treat bank data as sensitive imported data. It should not behave like a payment app.

## Why Avoid Manual Exports

Manual exports are slow and easy to forget. They often produce inconsistent formats, require repeated cleanup, and make reports stale. PSD2-based synchronization should make the app more useful because the data can be refreshed from the source with less manual effort.

## Why Trade Republic Is Special

PSD2 access is focused on payment accounts. Enable Banking can read the Trade
Republic current-account cash balance and booked cash movements, but it does
not expose investment positions, crypto holdings, or portfolio performance.

The current account uses the standard Enable Banking path. Brokerage valuation
is imported from reviewed PDFs without modifying AIS cash or inferring
performance. Crypto remains deferred. Possible future extensions include:

- Manual asset entries.
- CSV import if available and acceptable.
- A dedicated integration if a safe official option exists.
- Additional broker and document formats after explicit scope review.
