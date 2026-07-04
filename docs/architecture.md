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
- Call internal Next.js endpoints or server actions when server work is required.
- Never call Enable Banking directly.
- Never receive Enable Banking signing keys, provider tokens, service role keys, or raw sensitive integration credentials.

## UI System

The project does not have a component library yet.

shadcn/ui should be introduced as its own explicit feature, separate from
backend, Supabase, or integration work, so the styling, folder aliases, and
component conventions can be reviewed together.

Keep the first UI system step small: initialize the required configuration and
add only the minimal starter components needed for upcoming screens.

## Backend Responsibilities Inside Next.js

Next.js server-side code should:

- Validate the authenticated user.
- Enforce email allowlist behavior.
- Talk to Enable Banking from server-only code.
- Store and update consent, account, balance, transaction, and sync state.
- Use Supabase server clients appropriately.
- Keep sensitive environment variables private.
- Normalize external API responses before persistence.

Future server-side code may live in:

```text
app/api/
lib/auth/
lib/domain/
lib/enable-banking/
lib/supabase/
```

Do not create these folders until a feature needs them.

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

## Suggested Future Folder Separation

Potential structure when implementation begins:

```text
app/
  (auth)/
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
tests/
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

## Future Route Handler Locations

Possible future Route Handlers:

```text
app/api/bank-connections/enable-banking/start/route.ts
app/api/bank-connections/enable-banking/callback/route.ts
app/api/sync/balances/route.ts
app/api/sync/transactions/route.ts
```

These are examples only. Do not create them until the relevant feature is requested.

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
