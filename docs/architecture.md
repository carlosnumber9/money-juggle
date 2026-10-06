# Architecture

The app should be built as a small, incremental Next.js application with server-side integration boundaries.

```text
Browser / mobile
  -> Next.js App Router on Vercel
  -> Supabase Auth
  -> Supabase Postgres with RLS
  -> Enable Banking Account Information API
  -> Optional future external data sources such as Cobee by Pluxee
```

## Frontend Responsibilities

The frontend should:

- Render user-visible screens in Spanish.
- Start authentication and bank connection flows.
- Show connection, account, balance, transaction, and report states.
- Let the owner add app-owned metadata such as categories and labels.
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
- Store and update user-owned financial annotations such as categories and
  labels without letting provider sync overwrite them.
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
`lib/data/` exposes the single application-facing banking data source.
`lib/db/` owns persistence helpers. `lib/enable-banking/` owns server-only
provider calls and request signing.

## Data Source Boundary

UI components should receive prepared props and should not fetch financial data
directly. Route TSX files should stay thin and delegate data preparation to
server-side view functions under `lib/views/`.

Data collection should go through the application-facing contract under
`lib/data/`. Its single server-only implementation reads Supabase Auth/Postgres
and Enable Banking. This keeps provider and persistence details out of UI code
without maintaining alternate runtime behavior.

The private home view loads only the active tab. Transactions reads its month
and review catalogs; Dashboard reads bank state and monthly cashflow; Evolution
alone reads annual movements and adjustments. Inactive panels are not mounted,
so a hidden Dashboard cannot start its automatic synchronization. Tab changes
update the URL while retaining the selected month.

`HomeTabs` selects the requested tab immediately, before server navigation
finishes. A client navigation store blocks competing tab selections while the
React transition is pending. Other tab buttons are disabled for both pointer
and keyboard input; the selected tab remains visually active. Completed
navigation reconciles the selection with the server, including browser history
changes and interrupted transitions.

The tab panel and its shared `LoadingOverlay` remain mounted across section
changes. Outgoing content unmounts as soon as a tab is selected, and only the
completed section's content mounts when its response is ready. The overlay
retains the previous content height with a 320 px minimum and reuses the
transaction list's Liquid Orb, 500 ms fades, and reduced-motion/GPU fallbacks.
Cached responses do not incur an artificial loading delay. Monthly transaction
loading continues to use the same overlay through `TransactionListLoading`.

The Base UI tab list owns one persistent underline indicator. Its position uses
`transform: translateX(...)`, and its transform and width animate for 200 ms.
Reduced motion disables the transition. This explicit transform is required
because Tailwind 4 translation utilities set the separate CSS `translate`
property, which a `transform`-only transition does not animate.

Navigation state and overlay timing are verified with unit tests. Local app
startup was not requested, so section transitions and shader appearance still
need visual verification when browser-based testing is authorized.

The current private home view is prepared under `lib/views/privateHomeView/`.
It loads provider status, bank card state, selected-month transactions,
transaction category groups, and active transaction labels before the route
renders UI components. The
validated `month=YYYY-MM` URL value is resolved into a range in
`lib/domain/transactionRanges.ts`, so the tabs receive prepared reporting data
instead of querying persistence directly. Malformed and future periods fall
back to the current month.

The private UI is split into three tabs:

- `Dashboard`: bank institution cards, connected accounts, latest balances, and
  per-bank balance totals, plus selected-month income and expense cards.
- `Transacciones`: selected-month transaction review with date grouping,
  institution cues, signed amounts, client-side filters over already-loaded
  owner data, category filtering, inline manual category assignment, label
  chips, detail-dialog label assignment, and month navigation.
- `Evolución`: current-year income and expense trend chart with 12 monthly
  points, annual income and spending totals, a selected-month category expense
  radar, and a same-sized radial current-year expense breakdown that includes
  only labeled transactions. A full-width annual savings line chart appears
  last and totals positive original transaction rows categorized as
  `savings_transfer` by month, regardless of their financial-neutrality state.
  The visualizations are calculated from cached transaction rows with
  shadcn/Recharts.

The selected month is shared by transaction rows, cashflow cards, and the
category expense radar. Transactions updates the month through the native History API and reads only
`GET /api/transactions/month`. The initial page and endpoint share the same
server-side monthly view. The endpoint validates session and allowlist, derives
ownership from the session, and reads Supabase through RLS. Its responses are
private and not HTTP-cached. It never calls Enable Banking. Evolution continues
to use server navigation. Moving between periods does not trigger historical
Enable Banking requests.
The category expense radar owns its month navigation transition. Clicking a
month arrow immediately displays the requested month, disables both arrows,
and covers the old chart with the shared Liquid Orb overlay, centered in the
chart area. The previous amount is hidden while loading. The chart keeps its
height and uses the same 500 ms fades and reduced-motion/GPU fallbacks as
transactions. When the transition settles, the server's month, amount, and
chart are displayed, including empty or error results; interrupted navigation
returns to the committed month. Its subtitle contains only the formatted
expense amount, with no repeated month, category list, or uncategorized count.
The annual evolution line, labeled-expense radial, and annual savings line do
not change with the selected month.

## Supabase Responsibilities

Supabase should provide:

- Email and password authentication.
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

## Future Cobee By Pluxee Responsibilities

Cobee by Pluxee is a candidate external data source for flexible compensation
consumption data, especially restaurant expenses paid through Cobee.

This integration should stay separate from PSD2 banking:

- Cobee API calls should happen only in server-side code.
- Cobee `clientId`, `clientSecret`, and JWT access tokens must remain
  server-only.
- Cobee data should be normalized into app-owned rows before being used by
  reports.
- The first useful scope should be read-only consumption reporting, not employee
  administration, payroll mutation, or benefit management.
- Any overlap with bank transactions should be treated as reconciliation or
  comparison data, not as a replacement for synced bank movements.

See `docs/cobee.md` for the initial research notes.

## Authentication Flow

Conceptual flow:

1. User enters the owner email and password.
2. The server checks whether the submitted email is allowed.
3. Supabase verifies the credentials and creates a cookie-backed session.
4. The app checks the authenticated Supabase email against the allowlist again.
5. A Next.js Proxy refreshes expiring auth tokens and returns updated cookies.
6. Private routes become available only to allowed authenticated users.

The allowlist check is important even for a personal app because the login page
is still publicly reachable. The app does not expose sign-up, password recovery,
or password-change routes.

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
lib/domain/labels.ts
lib/domain/reports.ts
lib/domain/consents.ts
lib/domain/cobee.ts
```

Domain modules should describe financial concepts without depending directly on React components or raw external API responses.

## Transaction Month Loading

The transaction list has a persistent, data-driven loading overlay. Only a
request for the selected month may reveal its rows; old-month rows remain
hidden. The supplied Liquid Orb style 9 is rendered at 160 CSS pixels with
500 ms opacity transitions, no visible text, and a 320 px minimum list height.
The overlay reverses an interrupted fade and exits on failure as well as success.

This canvas is a deliberate custom UI exception because the existing spinner
cannot render the requested shader. The renderer keeps the source's emissive
Siri band, idle/thinking colors and timing; unrelated presets, glass, audio and
particle pipelines are omitted. It renders at 30 fps with DPR capped at 2 and
uses a CSS fallback during initialization or GPU failure. Reduced motion uses
that static fallback without fades. GPU work stops when the overlay disappears
or the document is hidden, and all resources are released on unmount.

Local browser startup was not requested. Shader fidelity and fade appearance
must be verified visually when browser-based testing is authorized.

## Browser Month Cache

Transactions uses TanStack Query v5 in the authenticated layout. Keys contain
both the authenticated user ID and resolved month. Successful initial data is
seeded with its server read time, so hydration does not issue a duplicate read.
Entries remain fresh for five minutes and inactive entries are collected after
thirty minutes. There is no prefetch, polling, automatic retry or persistent
browser storage. Stale entries revalidate on selection, focus or reconnect.

A new uncached or stale selected month covers the list with the orb until its
request completes. Focus and mutation revalidation within the same month retain
its current rows. The query cache is the source of movement and label data;
filters and dialog state reset only when the selected month changes.

Category and label writes invalidate the affected month. Label creation,
reconciliation changes and any completed or uncertain sync invalidate all months
of that user. Date edits remove out-of-period rows and invalidate both original
and destination months, including across years. In-flight reads are cancelled
before optimistic updates or invalidation. Successful writes no longer re-render
the entire home page. Dashboard and Evolution read current data on entry.

Each private layout owns its query client. Sign-out clears it before form
submission; auth changes and 401/403 responses clear it and leave the private
area. A browser back-forward cache restore reloads the server session check.
Financial reads remain authenticated and RLS-protected; caching never grants
server access. Other devices may remain out of date until the next revalidation
of a stale entry. Action failures may include an optional 401/403 status so the
client can distinguish rejected access from a recoverable save error.

## Provider Display Metadata Cache

The data-source boundary caches only normalized application display metadata and
supported-bank catalogs for five minutes through Next.js `unstable_cache`.
Keys include deployment environment, API base URL, application ID and catalog
filters. Keys and values exclude signing keys, JWTs and other credentials.
Failed reads throw before any successful value can be stored. Next.js may serve
a previous successful value while revalidating it; the displayed check time
therefore describes the last successful check, not current provider availability.

The status tooltip shows its check time and explicitly describes the result as
informational. This cache does not wrap session authorization, account reads,
balance/transaction synchronization or financial Supabase reads. Those calls
continue through their authenticated, uncached integration paths.
