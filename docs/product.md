# Product

`money-juggle` is a personal finance application for reviewing the owner's financial situation from mobile and desktop.

The product should reduce manual work by connecting to financial institutions through Open Banking / PSD2 wherever possible, reading account balances and transactions, and turning them into useful personal reports.

## Problem

Personal finance tracking often depends on manual exports from banking websites, spreadsheets, and repeated reconciliation. That creates friction, stale data, and inconsistent reports.

This app should make financial review easier by collecting read-only financial data through secure server-side integrations and presenting it in one place.

## Goals

- Provide a private view of accounts, balances, and transactions.
- Avoid routine manual bank statement exports.
- Support mobile and desktop usage.
- Keep bank integrations read-only.
- Use PSD2/Open Banking for supported banks.
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

- Sign in securely with an email magic link.
- Connect a supported bank through a PSD2 consent flow.
- View connected accounts.
- Review latest balances.
- Review transactions.
- Understand monthly income and spending.
- Track assets that may not be available through PSD2.
- Reconnect a bank when consent expires.

## Target Banks And Platforms

| Institution or platform | Initial approach                 | Notes                                              |
| ----------------------- | -------------------------------- | -------------------------------------------------- |
| CaixaBank               | GoCardless Bank Account Data API | Primary PSD2 path.                                 |
| ING                     | GoCardless Bank Account Data API | Primary PSD2 path.                                 |
| Trade Republic          | Special case                     | Investment data may not be available through PSD2. |

## Initial Limitations

- The first versions should prioritize authentication, ownership, consent tracking, account sync, balance sync, and transaction sync.
- Reporting should start simple and become richer later.
- Investment data should not block the banking foundation.
- Trade Republic may begin as manual assets or another isolated approach.
- No banking credentials should ever be stored.

## Read-Only Meaning

Read-only means the app can request permission to read account information, balances, and transactions. It must not move money, initiate payments, create mandates, create transfers, or change anything inside the bank account.

The app should treat bank data as sensitive imported data. It should not behave like a payment app.

## Why Avoid Manual Exports

Manual exports are slow and easy to forget. They often produce inconsistent formats, require repeated cleanup, and make reports stale. PSD2-based synchronization should make the app more useful because the data can be refreshed from the source with less manual effort.

## Why Trade Republic Is Special

PSD2 access is focused on payment accounts. Investment positions, broker statements, cash movements, and portfolio performance may not be exposed through the same APIs or through GoCardless coverage.

Trade Republic should therefore be handled separately. Possible future approaches include:

- Manual asset entries.
- CSV import if available and acceptable.
- A dedicated integration if a safe official option exists.
- A placeholder model until the banking foundation is complete.
