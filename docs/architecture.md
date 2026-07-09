# Architecture

The app should be built as a small, incremental Next.js application with server-side integration boundaries.

```text
Browser / mobile
  -> Next.js App Router on Vercel
  -> Supabase Auth
  -> Supabase Postgres with RLS
  -> Enable Banking Account Information API
```

## Frontend Responsibilities

The frontend should:

- Render user-visible screens in Spanish.
- Start authentication and bank connection flows.
- Show connection, account, balance, transaction, and report states.
- Render the private account area as separate dashboard and transaction review
  sections.
- Call internal Next.js endpoints or server actions when server work is required.
- Never call Enable Banking directly.
- Never receive Enable Banking signing keys, provider tokens, service role keys, or raw sensitive integration credentials.

## UI System

The project uses shadcn/ui with the selected preset as its default UI foundation.

Default UI directive:

- Prefer shadcn/ui components from `components/ui/` before creating custom UI primitives.
- Add new shadcn/ui components through the configured preset when a feature needs them.
- Keep `app/globals.css` focused on shadcn imports, theme tokens, and base rules.
- Avoid building local one-off card, button, input, tooltip, dialog, or layout primitives when a shadcn/ui component can cover the need.
- Use Tailwind utilities for screen-specific composition and spacing instead of accumulating named global CSS classes.
- Create custom UI only when the selected preset cannot express a required product interaction, and document that exception.

## Backend Responsibilities Inside Next.js

Next.js server-side code should:

- Validate the authenticated user.
- Enforce email allowlist behavior.
- Talk to Enable Banking from server-only code.
- Store and update consent, account, balance, transaction, and sync state.
- Use Supabase server clients appropriately.
- Keep sensitive environment variables private.
- Normalize external API responses before persistence.

Server-side code currently lives in:

```text
app/api/
lib/auth/
lib/domain/
lib/db/
lib/enable-banking/
lib/supabase/
lib/views/
```

`app/api/` owns thin Route Handlers. `lib/views/` prepares route-level props.
`lib/data/` selects the real or demo data source. `lib/db/` owns persistence
helpers. `lib/enable-banking/` owns server-only provider calls and request
signing.

## Data Source Boundary

UI components should receive prepared props and should not fetch financial data
directly. Route TSX files should stay thin and delegate data preparation to
server-side view functions under `lib/views/`.

Data collection should go through interfaces under `lib/data/`. The current
pattern is a small ports-and-adapters boundary:

- A real adapter reads Supabase Auth/Postgres and Enable Banking.
- A demo adapter reads local mock financial data.
- A single selector chooses the adapter from server-only configuration.

This keeps demo mode, provider details, and persistence details out of UI code.

The current private home view is prepared under `lib/views/privateHomeView/`.
It loads provider status, bank card state, current-month transactions, and
transaction category groups before the route renders UI components. The
current-month range is calculated in `lib/domain/transactionRanges.ts`, so the
transaction tab receives a prepared range and rows instead of querying
persistence directly.

The private UI is split into two tabs:

- `Dashboard`: bank institution cards, connected accounts, latest balances, and
  per-bank balance totals, plus current-month income and expense cards.
- `Transacciones`: current-month transaction review with date grouping,
  institution cues, signed amounts, client-side filters over already-loaded
  owner data, category filtering, and inline manual category assignment.

## Supabase Responsibilities

Supabase should provide:

- Email magic link authentication.
- Session management for the app.
- Postgres persistence.
- Row Level Security for financial data.
- Ownership boundaries through `user_id`.
- Production database backups and operational visibility.

Supabase should not be treated as a place to bypass security. RLS must be part of the design from the first schema migration.

## Enable Banking Responsibilities

Enable Banking Account Information should provide PSD2 access for supported banks:

- ASPSP discovery.
- Account information authorization flows.
- Bank consent redirects.
- Linked accounts.
- Account details.
- Balances.
- Transactions.

Enable Banking should not be used for payment initiation, transfers, mandates, checkout, billing requests, or scraping.

## Authentication Flow

Conceptual flow:

1. User enters email.
2. Supabase sends a magic link.
3. User opens the link.
4. Next.js receives the authenticated Supabase session.
5. The app checks whether the email is allowed.
6. Private routes become available only to allowed authenticated users.

The allowlist check is important even for a personal app because a magic link login page can otherwise become a public entry point.

## Bank Connection Flow

Conceptual flow:

1. Authenticated user selects a bank.
2. Server code requests or confirms the Enable Banking ASPSP.
3. Server code creates or starts an account information authorization flow.
4. The app redirects the user to the bank consent page.
5. User completes consent at the bank.
6. Enable Banking redirects back to the app.
7. Server code verifies the returned authorization state.
8. Server code lists linked accounts.
9. The app stores bank connection and account metadata.

The database should preserve the consent state clearly enough to answer: which institution or ASPSP was connected, which provider authorization flow was used, which accounts were linked, when consent expires, and what the current status is.

## Synchronization Flow

Conceptual flow:

1. A sync is triggered manually or by a scheduled job.
2. Server code loads active bank connections for the user.
3. Server code fetches account details, balances, and transactions from Enable Banking.
4. Data is normalized and stored.
5. A `sync_runs` record captures success, failure, timing, and error details.
6. Expired or failed consents are marked for reconnection.

Scheduled sync may later use Vercel Cron, but it should not be introduced before the manual sync path is understood.

## Current Folder Separation

The implemented project now follows this broad separation:

```text
app/
  (private)/
  api/
components/
lib/
  auth/
  db/
  domain/
  enable-banking/
  supabase/
supabase/
  migrations/
```

Responsibilities:

- UI routes and layouts belong in `app/`.
- Shared UI belongs in `components/`.
- Business rules belong in `lib/domain/`.
- Database access belongs in `lib/db/` or integration-specific modules.
- Enable Banking calls belong in `lib/enable-banking/` and must be server-only.
- Supabase client setup belongs in `lib/supabase/`.

## Server-Only Isolation

Enable Banking credentials, signing keys, provider tokens, and service role operations must only appear in server-side modules. Future implementation should use clear boundaries such as:

- Server-only modules for Enable Banking clients.
- Route Handlers for bank connection callbacks and sync triggers.
- Environment variables without `NEXT_PUBLIC_` for secrets.
- Small domain functions that can be tested without external calls.

## Implemented Route Handler Locations

The current banking and sync Route Handlers are:

```text
app/api/bank-connections/enable-banking/start/route.ts
app/api/bank-connections/enable-banking/callback/route.ts
app/api/bank-connections/enable-banking/aspsps/route.ts
app/api/integrations/enable-banking/application/route.ts
app/api/sync/balances/route.ts
app/api/sync/transactions/route.ts
```

They must remain thin, authenticated server boundaries. Provider calls,
normalization, and database writes should stay in server-only helper modules.

## Future Domain Logic Locations

Possible future domain modules:

```text
lib/domain/accounts.ts
lib/domain/balances.ts
lib/domain/transactions.ts
lib/domain/reports.ts
lib/domain/consents.ts
```

Domain modules should describe financial concepts without depending directly on React components or raw external API responses.
