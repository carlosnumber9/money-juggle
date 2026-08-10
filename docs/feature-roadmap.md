# Feature Roadmap

This roadmap is intentionally incremental. Do not implement these phases unless requested. Each phase should become a small, reviewable task when requested.

## Implementation Tracker

Use this checklist as the source of truth for what remains to be implemented. Keep completed items checked, and keep the detailed phase notes below for context.

- [x] 1. Bootstrap the Next.js project.
- [x] 2. Configure basic project tooling.
- [x] 3. Set up Supabase project.
- [x] 4. Configure quick UI foundation with shadcn/ui.
- [x] 5. Configure Supabase Auth.
- [x] 6. Implement initial magic link login (superseded by phase 31).
- [x] 7. Add email allowlist.
- [x] 8. Create basic private layout.
- [x] 9. Design initial database schema.
- [x] 10. Enable RLS.
- [x] 11. Add conceptual Enable Banking configuration.
- [x] 12. Implement first Enable Banking signed API call.
- [x] 13. List available ASPSPs.
- [x] 14. Start bank connection flow.
- [x] 15. Store authorization and consent data.
- [x] 16. Handle Enable Banking callback.
- [x] 17. Store connected accounts.
- [x] 18. Sync balances.
- [x] 19. Sync transactions.
- [x] 20. Build a basic dashboard.
- [x] 21. Add current-month transaction review.
- [x] 22. Add transaction categorization.
- [ ] 23. Add monthly reports.
- [ ] 24. Add manual assets for Trade Republic / investments.
- [ ] 25. Add scheduled sync with Vercel Cron.
- [ ] 26. Add error and reconnection flows.
- [ ] 27. Security hardening.
- [ ] 28. Add transaction labels for trips, events, and ad hoc reporting.
- [ ] 29. Explore Cobee by Pluxee consumption reports.
- [x] 30. Add monthly period navigation for transactions and charts.
- [x] 31. Replace magic links with owner password login and session refresh.
- [x] 32. Investigate neutral cash-flow reconciliation for debts and reimbursements.

## 1. Bootstrap The Next.js Project

Status:

- Completed.

Implemented result:

- Minimal Next.js App Router project with TypeScript.
- First Spanish user-visible page.
- Basic local development, type check, build, and audit commands.
- Public npm registry configured through `.npmrc`.

Goal:

- Create the minimal Next.js App Router project.

Expected result:

- A working local app shell with TypeScript.

Concepts learned:

- App Router basics.
- Server and client component distinction.

Possible future files:

- `app/`
- `package.json`
- `tsconfig.json`

Risks or decisions:

- Choosing defaults that fit Vercel and Supabase.

Do not do yet:

- Build finance features.

## 2. Configure Basic Project Tooling

Status:

- Completed.

Implemented result:

- ESLint configured with the Next.js core web vitals and TypeScript rules.
- Prettier configured for consistent formatting.
- Development scripts added for linting, formatting, and combined checks.

Goal:

- Add formatting, linting, and basic checks.

Expected result:

- Consistent development commands.

Concepts learned:

- Type checking.
- Linting.
- Formatting.

Possible future files:

- Tool configuration files.
- Package scripts.

Risks or decisions:

- Avoid overloading the project with unnecessary tooling.

Do not do yet:

- Add complex CI/CD.

## 3. Set Up Supabase Project

Status:

- Completed.

Implemented result:

- Supabase client dependencies were installed.
- Public Supabase environment variables were added for local development.
- Browser and server Supabase client helpers were created with `@supabase/ssr`.
- Environment variable documentation was added without committing local secret files.

Goal:

- Prepare Supabase for auth and database work.

Expected result:

- Supabase project exists and required keys are understood.

Concepts learned:

- Supabase project structure.
- Public anon key vs service role key.

Possible future files:

- Environment variable documentation.

Risks or decisions:

- Secret handling.

Do not do yet:

- Store real financial data before RLS exists.

## 4. Configure Quick UI Foundation With shadcn/ui

Status:

- Completed.

Implemented result:

- Tailwind CSS v4 was installed with the required PostCSS integration.
- shadcn/ui was initialized with the selected preset `b6thgHlWC`.
- `components.json` was created with the `base-sera` style, olive base color, Lucide icons, and project aliases.
- Minimal starter UI components were added: `button` and `card`.
- The existing Spanish home page was updated to display the starter card and button without adding product functionality.

Goal:

- Add a minimal shadcn/ui foundation so future screens can use a consistent component style.

Expected result:

- The project has the required shadcn/ui configuration and minimal styling foundation.
- Only the smallest useful starter component set is added.
- Existing Spanish user-visible text remains unchanged unless a UI check requires a tiny adjustment.

Concepts learned:

- shadcn/ui CLI initialization.
- Tailwind CSS integration for Next.js.
- Component aliases and project styling conventions.

Possible future files:

- `components.json`
- `app/globals.css`
- `components/ui/`
- `lib/utils.ts`
- Tailwind or PostCSS configuration files if required by the selected setup.

Risks or decisions:

- Keep this as UI infrastructure only, not a dashboard build.
- Review generated configuration before accepting it.
- Do not expose or touch financial credentials.
- User-visible app text must stay in Spanish.

Do not do yet:

- Build full application pages.
- Create a broad design system.
- Add finance-specific components.

## 5. Configure Supabase Auth

Status:

- Completed; the initial magic-link configuration was superseded by phase 31.

Goal:

- Enable email magic link authentication.

Implemented result:

- Required Supabase Auth dashboard settings are listed in `docs/supabase.md`.
- Local and production callback URL expectations are documented.
- The configured magic-link flow has been manually verified with the local app.
- The distinction between authentication and server-side email authorization is
  explicit.

Expected result:

- Supabase can send login links.

Concepts learned:

- Auth providers.
- Redirect URLs.

Possible future files:

- Auth documentation.
- Supabase dashboard settings.

Risks or decisions:

- Correct production and local redirect URLs.

Do not do yet:

- Add public registration behavior without allowlist.

## 6. Implement Magic Link Login

Status:

- Completed historically; superseded by phase 31.

Goal:

- Add a minimal login flow.

Implemented result:

- `app/login/page.tsx` provides a Spanish email form.
- The form uses a server action to request a Supabase magic link.
- `app/auth/callback/route.ts` exchanges the Supabase code for a session.
- New user creation is disabled in magic-link requests.
- The login flow has been manually verified end to end.

Expected result:

- The owner can sign in by email.

Concepts learned:

- Auth callback.
- Session handling.
- SSR auth in Next.js.

Possible future files:

- `app/login/`
- `app/auth/callback/`
- `lib/supabase/`

Risks or decisions:

- Avoid leaking auth implementation into unrelated UI.

Do not do yet:

- Build dashboard data features.

## 7. Add Email Allowlist

Status:

- Completed.

Goal:

- Restrict access to the owner email or explicit allowlist.

Implemented result:

- `lib/auth/allowlist.ts` reads `ALLOWED_EMAILS` from server-only environment.
- `OWNER_EMAIL` is still accepted as a compatibility fallback.
- Login requests are rejected before sending an email when the address is not
  allowed.
- The auth callback and private layout also enforce the allowlist server-side.
- The allowlist has been manually verified in the MVP login flow.

Expected result:

- Unapproved emails cannot access private areas.

Concepts learned:

- Server-side authorization.
- Defense beyond login.

Possible future files:

- `lib/auth/`
- Middleware or private layout checks.

Risks or decisions:

- Decide between single owner email and allowlist variable.

Do not do yet:

- Build multi-user admin management.

## 8. Create Basic Private Layout

Status:

- Completed.

Goal:

- Add a minimal authenticated app area.

Implemented result:

- The existing home screen now lives under the private route group at
  `app/(private)/page.tsx`.
- `app/(private)/layout.tsx` requires a valid Supabase user and allowed email.
- A minimal session header and sign-out action are available.
- The private home and sign-out flow have been manually verified.

Expected result:

- A private shell exists after login.

Concepts learned:

- Protected routes.
- Shared layouts.

Possible future files:

- `app/(private)/layout.tsx`
- Basic navigation components.

Risks or decisions:

- Keep UI simple and Spanish for visible text.

Do not do yet:

- Build full dashboard.

## 9. Design Initial Database Schema

Status:

- Completed.

Goal:

- Turn the conceptual model into an initial schema proposal.

Implemented result:

- `docs/data-model.md` now documents the initial executable schema scope.
- `supabase/migrations/20260704143000_create_initial_schema.sql` creates the
  initial tables, relationships, constraints, indexes, and RLS policies.
- The initial migration was applied to the linked Supabase project with
  `npm run db:push`.
- The initial schema includes profiles, institutions, bank connections,
  accounts, balances, transactions, category groups, categories, sync runs, and
  consent events.
- Category rules, manual assets, report caches, and advanced scheduler metadata
  are intentionally deferred.

Expected result:

- Tables and relationships are reviewed before migration.

Concepts learned:

- Ownership columns.
- External provider IDs.
- Financial data modeling.
- Idempotent transaction identity.
- User-owned categorization metadata.
- Category groups as simple reporting metadata.

Possible future files:

- `supabase/migrations/`
- Schema docs.

Risks or decisions:

- Avoid storing unnecessary sensitive raw data.
- Model transaction identity before importing real transaction history.
- Keep provider-owned transaction data separate from user-owned metadata such as category groups and categories.
- Transactions should start uncategorized unless the user assigns a category or a later explicit rule feature applies one.
- Category grouping should start as a simple one-to-many relationship: each category belongs to one category group.

Do not do yet:

- Create every possible reporting table.

## 10. Enable RLS

Status:

- Completed for the initial schema.

Goal:

- Enable RLS and add baseline policies for initial tables.

Implemented result:

- The initial migration enables RLS for every created table.
- The initial migration is recorded as applied in the remote Supabase migration
  history.
- Owner-scoped read policies are defined for user-owned financial tables.
- Category group and category tables include owner-scoped CRUD policies.
- `institutions` is readable by authenticated users as non-sensitive reference
  data.
- Deeper policy verification with real rows is deferred to the features that
  first create bank connections, accounts, balances, transactions, and
  categories.

Expected result:

- Initial tables are not left publicly readable or writable.

Concepts learned:

- RLS policies.
- `auth.uid()`.
- Owner-scoped access.

Possible future files:

- Supabase migrations.
- Policy tests or SQL checks.

Risks or decisions:

- Avoid relying on service role for normal app reads.
- Keep this app personal for now, while still modeling ownership for future
  safety.

Do not do yet:

- Build multi-user test fixtures before the app has data-writing features.

## 11. Add Conceptual Enable Banking Configuration

Status:

- Completed.

Implemented result:

- GoCardless Bank Account Data was evaluated and rejected for the initial path
  because new private signups were disabled.
- Enable Banking was selected as the primary PSD2 Account Information provider.
- A production restricted Enable Banking application was created for own linked
  accounts.
- CaixaBank and ING appear as available ASPSPs and have been linked manually.
- Trade Republic does not appear as an available ASPSP and remains a manual or
  future separate-integration case.
- The app is deployed at `https://money-juggle.vercel.app/`.
- Enable Banking registered URLs are documented in `docs/enable-banking.md`.
- A local RSA private key and public certificate were generated under
  `.secrets/enable-banking/`, with `.secrets/` ignored by Git.

Goal:

- Document and prepare required server-only configuration.

Expected result:

- Required secrets and integration boundaries are clear.

Concepts learned:

- Server-only environment variables.
- External API credentials.

Possible future files:

- Environment variable docs.
- `docs/enable-banking.md`.
- `lib/enable-banking/` later.

Risks or decisions:

- Never expose credentials to the client.
- Keep the Enable Banking private key server-only.
- Use only Account Information, never payment initiation.

Do not do yet:

- Implement the full consent flow.

## 12. Implement First Enable Banking Signed API Call

Status:

- Completed.

Implemented result:

- Server-only Enable Banking configuration helpers were added.
- Server-only JWT signing with the registered application ID and RSA private
  key was added.
- A minimal Enable Banking client calls `GET /application` to verify the signed
  request against the registered application.
- A protected internal route exposes only safe application metadata to the
  authenticated allowed owner.
- The private home screen now shows a `Tus cuentas` view with a card that checks
  the Enable Banking connection and displays loading, success, or sanitized
  error state.
- No bank consent flow, accounts, balances, transactions, or persistence were
  added in this step.

Goal:

- Make one server-side signed API request.

Expected result:

- Server code can authenticate with Enable Banking using the registered
  application and private key.

Concepts learned:

- Server-only API calls.
- RSA private keys.
- JWT request signing.
- Secret management in local development and Vercel.

Possible future files:

- `lib/enable-banking/`
- A controlled server endpoint or script.

Risks or decisions:

- Private key storage and logging.
- Provider token storage if the API returns temporary tokens.
- Avoid printing signed JWTs or raw provider credentials.

Do not do yet:

- Fetch transactions.

## 13. List Available ASPSPs

Status:

- Completed.

Implemented result:

- `lib/enable-banking/client.ts` can call `GET /aspsps` with country, PSU
  type, and service filters.
- `app/api/bank-connections/enable-banking/aspsps/route.ts` exposes a
  protected internal ASPSP list for authenticated allowed users.
- The private home screen loads Spanish personal Account Information ASPSPs and
  shows the initial CaixaBank / ING options when Enable Banking returns them.

Goal:

- Fetch supported ASPSPs for Spain.

Expected result:

- The app can confirm supported banks such as CaixaBank and ING.

Concepts learned:

- ASPSP IDs.
- Provider reference data.

Possible future files:

- Server route or server action.
- Institution persistence.

Risks or decisions:

- Cache strategy.

Do not do yet:

- Start consent automatically.

## 14. Start Bank Connection Flow

Status:

- Completed.

Implemented result:

- `app/api/bank-connections/enable-banking/start/route.ts` validates the
  authenticated user and email allowlist before starting any provider flow.
- The route verifies the selected ASPSP through Enable Banking and calls
  `POST /auth` with Account Information access for balances and transactions.
- The flow uses `psu_type: personal`, Spanish language, an app-generated
  callback `state`, and the Supabase user ID as the anonymized `psu_id`.
- Available private bank cards expose a connection icon that submits the
  selected ASPSP to the start route.
- Failed bank connection cards keep their institution metadata and expose the
  same connection icon as a retry action.
- The browser is redirected to the provider authorization URL returned by
  Enable Banking.

Goal:

- Create the initial account information authorization flow for a selected bank.

Expected result:

- User can be redirected to bank consent.

Concepts learned:

- Account information authorization.
- ASPSP selection.
- Redirect URLs.

Possible future files:

- `app/api/bank-connections/enable-banking/start/route.ts`
- `lib/enable-banking/`

Risks or decisions:

- Persist pending consent state safely.

Do not do yet:

- Assume the bank connection succeeded before callback verification.

## 15. Store Authorization And Consent Data

Status:

- Completed.

Implemented result:

- `supabase/migrations/20260704170000_add_enable_banking_connection_fields.sql`
  adds explicit Enable Banking authorization, session, callback state, PSU hash,
  and provider metadata fields to `bank_connections`.
- Server-only persistence creates the user profile if needed, upserts the
  selected institution, stores a `linking` bank connection, and records
  `created` / `redirected` consent events.
- The pending connection stores consent expiration from the access requested by
  the app, because the provider authorization response may not echo the access
  object.
- `SUPABASE_SECRET_KEYS` is now required for controlled server-side provider
  writes that RLS intentionally blocks for browser clients.

Goal:

- Persist consent lifecycle data.

Expected result:

- The app can track pending, linked, expired, and failed connections.

Concepts learned:

- Consent state machines.
- External IDs.
- Provider authorization state.

Possible future files:

- Database migrations.
- Domain consent helpers.

Risks or decisions:

- Avoid duplicate active connections for the same bank unless intentional.

Do not do yet:

- Sync account data before consent is valid.

## 16. Handle Enable Banking Callback

Status:

- Completed.

Implemented result:

- `app/api/bank-connections/enable-banking/callback/route.ts` receives the
  Enable Banking callback at the registered callback path.
- The route verifies the returned `state` against a pending connection created
  by the authenticated allowed start flow, then uses that stored connection
  owner for the callback update.
- Provider errors are stored as failed consent events.
- Successful callbacks exchange the returned `code` through `POST /sessions`
  and mark the connection as `linked`.

Goal:

- Complete the consent return flow.

Expected result:

- The app verifies the returned authorization state and updates connection
  state.

Concepts learned:

- Callback validation.
- Redirect handling.

Possible future files:

- `app/api/bank-connections/enable-banking/callback/route.ts`
- Consent event persistence.

Risks or decisions:

- Prevent linking callbacks to the wrong user.

Do not do yet:

- Trust callback query parameters without server verification.

## 17. Store Connected Accounts

Status:

- Completed.

Implemented result:

- Authorized accounts returned by `POST /sessions` are normalized and upserted
  into `accounts`.
- The app stores Enable Banking account `uid`, display name, currency, account
  type, and only the last four IBAN characters when an IBAN is available.
- The private home screen lists connected banks, consent expiration, and stored
  account metadata.
- Balance and transaction synchronization remain deferred to roadmap items 18
  and 19.

Goal:

- Fetch and store linked accounts.

Expected result:

- Account metadata is available in the app.

Concepts learned:

- Account identifiers.
- Safe display fields.

Possible future files:

- Account tables.
- Account sync logic.

Risks or decisions:

- Avoid storing full IBAN unnecessarily.

Do not do yet:

- Build detailed reports.

## 18. Sync Balances

Status:

- Completed.

Implemented result:

- Linked Enable Banking accounts can fetch account balances through the
  server-only Enable Banking client.
- Balance responses are normalized into `balances` snapshots with account
  ownership preserved through `user_id`.
- Balance synchronization is triggered automatically after a new connection is
  completed and by an internal `POST /api/sync/balances` call when the private
  home screen loads stale or missing balances.
- The private institution cards show the latest account balances and per-bank
  totals by currency.
- Local review uses the same authenticated Supabase and Enable Banking path as
  the deployed application.

Goal:

- Fetch and store account balances.

Expected result:

- Latest balance data appears in the private app.

Concepts learned:

- Balance types.
- Snapshot timing.

Possible future files:

- Balance tables.
- Sync route or server action.

Risks or decisions:

- Currency and date handling.

Do not do yet:

- Aggregate net worth before manual assets are modeled.

## 19. Sync Transactions

Status:

- Completed as a first current-month slice.

Implemented result:

- The private home screen now loads cached current-month transactions from
  Supabase and displays them below the account cards.
- A client-side refresh triggers `POST /api/sync/transactions`, which runs
  server-only Enable Banking transaction fetches for each linked account.
- Transaction sync stores normalized provider-owned fields, stable import keys,
  identity source, fallback fingerprints, and sync run observability.
- Re-running the same sync updates rows with the same `user_id`, `account_id`,
  and `stable_import_key` instead of inserting duplicates.
- Rows are visually associated with the source institution through corporate
  row coloring instead of an extra account column.

Goal:

- Fetch and store transactions.
- Make repeated transaction syncs idempotent.

Expected result:

- Transaction history is available for reporting.
- Fetching the same transactions again updates existing rows instead of creating duplicates.
- The app stores enough external identifiers to debug and improve future sync behavior.

Concepts learned:

- Deduplication.
- Booking date vs value date.
- Provider transaction IDs.
- Stable import keys.
- Pending vs booked transaction behavior.
- Reconciliation before insert.

Possible future files:

- Transaction normalization tests.
- Transaction identity helpers.

Risks or decisions:

- Duplicate transactions and raw data sensitivity.
- Provider transaction identifiers are useful but optional, so the app must not depend on one field always being present.
- Pending transactions can later become booked with stronger identifiers or changed fields.
- User-owned transaction metadata, such as categories, must not be overwritten by provider sync.

Recommended scope:

- Normalize Enable Banking transaction fields into the app data model.
- Store external provider and bank identifiers when available, such as provider transaction IDs, bank transaction IDs, entry references, and meaningful end-to-end IDs.
- Compute a deterministic `stable_import_key` using the documented priority:
  `internalTransactionId`, then `transactionId`, then `entryReference`, then meaningful `endToEndId`, then fallback fingerprint.
- Store `identity_source` and `deduplication_fingerprint`.
- Upsert by `user_id`, `account_id`, and `stable_import_key`.
- Reconcile against recent same-account candidates before inserting when the stable key has changed because a pending or incomplete transaction gained stronger identifiers.
- Preserve app-owned fields such as `category_id` during sync updates.
- Prefer booked transactions as the source for permanent reports.

Current limitations:

- The first implementation matches existing rows by the computed stable import
  key. The broader same-account reconciliation path for pending transactions
  that later gain stronger identifiers is still deferred.
- Focused transaction identity tests are still deferred.

Suggested acceptance criteria:

- Running the same transaction sync twice does not create duplicates.
- A transaction with a provider ID is matched by provider ID within the same account.
- A transaction without provider IDs receives a deterministic fingerprint fallback.
- Sync can update provider-owned fields without overwriting manual categorization.
- Tests cover at least one repeated sync case and one fallback fingerprint case.

Do not do yet:

- Build complex categorization.
- Build machine learning classification.
- Treat pending transactions as final reporting data without an explicit decision.

## 20. Build A Basic Dashboard

Status:

- Completed.

Implemented result:

- The private home screen is a tabbed account area with `Dashboard` and
  `Transacciones` sections.
- The dashboard tab shows available and connected bank institution cards.
- The dashboard tab now shows current-month income and expense summary cards
  before the bank institution cards, computed from the same Supabase transaction
  rows used by the `Transacciones` tab.
- Connected bank cards show stored account metadata, latest account balances,
  and per-bank currency totals.
- The provider status indicator remains visible next to the private page title.
- Balance refresh still runs through the existing server-only synchronization
  boundary; the dashboard does not call Enable Banking directly from the
  browser.

Goal:

- Show the first useful financial overview.

Expected result:

- The owner can see accounts and current balances.

Concepts learned:

- Private data rendering.
- Loading and error states.

Possible future files:

- Private dashboard route.
- Account and balance components.

Risks or decisions:

- Keep visible text Spanish.

Do not do yet:

- Create advanced analytics.

## 21. Add Current-Month Transaction Review

Status:

- Completed as a first review UI for synced transactions.

Implemented result:

- The private home screen includes a `Transacciones` tab that shows current-month
  transactions loaded from Supabase through the app data source boundary.
- A client-side refresh triggers the existing server-only
  `POST /api/sync/transactions` route while cached rows remain available for
  review.
- Transactions are grouped by booking date instead of using a repeated date
  column.
- The table is intentionally compact: no header row, no outer border, and no
  separate visible account column.
- Each row shows a bank logo or fallback initial, an accessible account label,
  the transaction concept, and the signed amount.
- Filter chips let the owner narrow the current-month view by institution
  (`ING`, `CaixaBank`) and by direction (`Ingresos`, `Gastos`).
- Local transaction review uses synchronized owner data from Supabase.

Goal:

- Make synced transactions reviewable before adding categorization or reports.

Expected result:

- The owner can inspect current-month movements, identify the source bank, and
  filter income and spending quickly.

Concepts learned:

- Current-month date ranges.
- Cached data with background refresh.
- UI filtering over prepared view data.
- Date grouping for transaction lists.
- Keeping bank identity visible without adding table clutter.

Possible future files:

- Transaction detail or review state components.
- Focused tests for filter behavior.
- Transaction list accessibility refinements.

Risks or decisions:

- Filtering is client-side over already-authorized owner data; it is not an
  authorization boundary.
- The current UI is for review, not final reporting.
- Bank logos and corporate colors are presentational cues and should not be the
  only way to understand data if more institutions are added.

Do not do yet:

- Treat this as a completed reporting system.
- Add manual categorization in the same slice.

## 22. Add Transaction Categorization

Status:

- Completed as a first manual assignment slice.

Implemented result:

- The initial owner-scoped category group and category catalog is seeded by
  `20260709120000_seed_initial_transaction_categories.sql` for profiles that
  already exist when the migration runs.
- The private home view loads category groups through the same data source
  boundary used by transactions.
- Each current-month transaction row shows an inline category affordance under
  the transaction concept.
- The category picker is a searchable popover grouped by category group and
  includes a `Sin categoría` option that stores `null`.
- Category changes are saved through a small server action that validates input,
  the current Supabase user, the email allowlist, transaction ownership, and
  category ownership.
- Category changes always use the authenticated, owner-scoped persistence path.
- Current-month transaction filters can narrow by selected categories or
  uncategorized transactions.

Goal:

- Categorize transactions for reporting.
- Let the owner define categories according to their own financial review habits.
- Group categories into simple category groups, such as food-related categories under a broader food group.

Expected result:

- Transactions can be grouped by category.
- Categories can be grouped by category group.
- Categories are stored as app-owned metadata in Supabase and can be queried quickly.
- Manual categorization survives later provider syncs.
- Imported transactions remain uncategorized by default until the owner categorizes them manually or a future explicit rule applies.

Concepts learned:

- User-owned metadata.
- Rule-based classification.
- Manual category assignment.
- Category groups vs categories.
- Provider data vs app-owned annotations.
- Signed transaction amounts for income and spending reports.

Possible future files:

- Category tables.
- Categorization domain logic.
- Category rule tests.
- Transaction list or editor UI later.

Risks or decisions:

- Manual vs automatic categorization.
- Provider category hints should not become the source of truth.
- User-visible category names in the app should be Spanish.
- Internal table and column names should remain English.
- Income and expenses should not require separate category trees at first. Reports can use transaction direction or signed amounts, allowing refunds, reimbursements, or shared payments to reduce the net total of the same category.
- Category groups should stay simple. A separate many-to-many relationship is unnecessary unless one category needs to belong to multiple groups later.

Recommended scope:

- Add user-owned `transaction_category_groups`.
- Add user-owned `transaction_categories`.
- Link each category to one category group through `group_id`.
- Link transactions through a nullable `category_id`.
- Allow manual category assignment first.
- Add optional `transaction_category_rules` only when it helps categorize repeated merchants or descriptions.
- Keep rules simple at first, for example matching description or counterparty name.
- Do not overwrite a manually assigned category during later syncs.

Suggested acceptance criteria:

- A user can list only their own category groups and categories in the
  transaction review UI.
- A user can assign one of their categories to one of their transactions.
- Transactions without manual assignment remain uncategorized.
- A later transaction sync does not erase that assignment.
- Current-month transactions can be filtered by category or by uncategorized
  state.
- Future reports can group transactions by `category_id`.
- Future reports can optionally roll category totals up to
  `transaction_category_groups`.
- RLS and server-side ownership checks prevent access to another user's
  category groups, categories, or category assignments.

Current limitations:

- There is no category management UI yet; the first catalog is migration-seeded.
- There are no automatic categorization rules yet.
- Category totals and rollups are still part of the future monthly reports work.

Do not do yet:

- Build machine learning classification.
- Build a complex budgeting system.

## 23. Add Monthly Reports

Status:

- Started with a small dashboard summary and a first annual evolution chart,
  not yet a full reporting system.

Implemented so far:

- Current-month income and expense totals are visible in the dashboard as two
  summary cards.
- Totals are grouped by currency and use signed transaction amounts: positive
  amounts count as income, negative amounts count as expenses.
- Transfers between the owner's own accounts are excluded from every
  transaction-derived financial metric when detected from server-only account
  fingerprints, matched through the conservative paired last-4 fallback, or
  categorized by the owner as `internal_transfer`.
- The shared internal-transfer rule applies to monthly income and expense
  totals, annual evolution, category and label reports, their transaction
  counts, and report currency selection. The original movements remain visible
  for review but do not appear under transaction-list income or expense
  filters.
- The paired last-4 fallback loads three days of matching context around report
  boundaries so a transfer crossing a month or year remains neutral in both
  periods.
- The private home screen includes an `Evolución` tab after `Transacciones`.
  Its first chart shows the current year's 12 monthly points for income and
  expenses, using cached transaction rows and leaving months without data at
  zero.
- The annual chart is titled `Progreso anual`, summarizes annual income and
  spending in its subtitle, and keeps the lines continuous without permanent
  point markers.
- A current-month category expense radar visualization is present in the
  working tree, using categorized expense rows and the shared internal-transfer
  exclusion.
- The category radar excludes categories listed by stable internal slug so
  fixed costs, savings, and shared-expense settlements do not hide anomalies in
  the remaining categories. The exclusions are `mortgage`, `community_fees`,
  `home_insurance`, `internet_mobile`, `savings_transfer`, and
  `shared_expense_settlement`.
- Refunds and other positive movements reduce the net spending of their
  assigned category. The radar and its summary include only categories whose
  final monthly net spending is greater than zero, omitting net income and
  zero-value categories.
- This first slice reuses cached Supabase transaction rows and does not add new
  report tables or external integrations.

Goal:

- Summarize income, spending, and trends by month.

Expected result:

- A basic monthly report exists.

Concepts learned:

- Aggregation.
- Date ranges.
- Currency consistency.

Possible future files:

- Report domain logic.
- Report UI.

Risks or decisions:

- Internal transfer detection depends on provider counterparty data. When the
  provider omits the counterparty account identifier, the app should prefer
  conservative matching over false exclusions and allow the owner-assigned
  `internal_transfer` category to provide the explicit override.

Do not do yet:

- Add tax or accounting features.

## 24. Add Manual Assets For Trade Republic / Investments

Goal:

- Track assets not available through PSD2.

Expected result:

- Manual Trade Republic or investment values can be included.

Concepts learned:

- Manual financial data.
- Valuation dates.

Possible future files:

- `manual_assets` table.
- Manual asset UI.

Risks or decisions:

- Avoid pretending manual data is automatically synced.

Do not do yet:

- Scrape Trade Republic.

## 25. Add Scheduled Sync With Vercel Cron

Goal:

- Refresh data periodically.

Expected result:

- Sync can run without manual action.

Concepts learned:

- Scheduled jobs.
- Idempotent sync.
- Operational monitoring.
- Why transaction identity must be stable before automation.

Possible future files:

- Cron route.
- Vercel configuration.

Risks or decisions:

- Protect cron endpoints.
- Scheduled sync multiplies the impact of duplicate transaction bugs, so transaction idempotency should be tested before cron is enabled.

Do not do yet:

- Run scheduled sync before manual sync is stable.

## 26. Add Error And Reconnection Flows

Goal:

- Make expired consent and sync failures understandable.

Expected result:

- User can see when action is needed and reconnect banks.

Concepts learned:

- Error states.
- Consent lifecycle UX.

Possible future files:

- Connection status UI.
- Reconnection route.

Risks or decisions:

- Avoid hiding sync failures.

Do not do yet:

- Auto-reconnect without explicit bank consent.

## 27. Security Hardening

Goal:

- Improve the security posture before relying on the app heavily.

Expected result:

- Reduced operational and access risk.

Concepts learned:

- MFA/passkeys.
- Audit logs.
- Monitoring.
- Backups.

Possible future files:

- Audit log schema.
- Security documentation.
- Monitoring configuration.

Risks or decisions:

- Balance convenience with protection.

Do not do yet:

- Add security theater without addressing real risks.

## 28. Add Transaction Labels For Trips, Events, And Ad Hoc Reporting

Status:

- Assignment slice implemented; reporting and global management remain
  planned.

Goal:

- Let the owner optionally group transactions across categories and
  institutions for one-off contexts such as a trip.

Preferred terminology:

- Internal name: `labels`.
- Spanish UI name: `Etiquetas`.

Rationale:

- Categories describe what a transaction is.
- Labels describe what broader context it belongs to.
- `Labels` fits the model better than reusing `categories` and is clearer than
  `tags` in repository documentation.

Expected result:

- Most transactions remain unlabeled.
- Selected transactions can be assigned a label such as `Viaje Lisboa 2026`.
- Reports can show total income or spending for that label across flights,
  hotels, restaurants, transport, and other categories.

Concepts learned:

- Optional user-owned metadata.
- Many-to-many assignment tables.
- Cross-category reporting.

Implemented slice:

- Owner-scoped label and assignment tables with RLS and ownership constraints.
- Multiple labels per transaction.
- Existing-label suggestions and create-and-assign behavior in transaction
  detail.
- Removable detail chips and compact transaction-row summaries.
- Optimistic interaction with rollback when authenticated persistence fails.

Still planned:

- Label archive, rename, and global management UI.
- Report and transaction-list filters by label.

Risks or decisions:

- A transaction can have multiple labels through a join table.
- Labels can reveal sensitive travel, medical, family, or project context, so
  they require the same owner-scoped RLS mindset as categories.
- Labels should not be overwritten by provider sync.
- Avoid confusing labels with categories in the UI.

Suggested acceptance criteria:

- A user can create their own labels. Archiving remains a later management UI.
- A user can assign and remove labels only on their own transactions.
- Unlabeled transactions remain the default state.
- A future report can filter or group transactions by label across categories.
- RLS and server-side checks prevent assigning another user's label.

Do not do yet:

- Build a complex project management model.
- Replace categories with labels.

## 29. Explore Cobee By Pluxee Consumption Reports

Status:

- Planned / exploratory.

Goal:

- Determine whether Cobee by Pluxee can provide useful restaurant and flexible
  compensation spending data for personal reporting.

Current research:

- The public API requires `clientId` and `clientSecret`, then returns a Bearer
  JWT through `POST /oauth/token`.
- The API has company and employee endpoints that appear to be needed before
  reading consumption reports.
- The likely report endpoint is
  `GET /companies/{companyId}/employees/{employeeId}/consumptions`.
- Consumption reports can include category, behaviour, sum type, amount in
  cents, currency, and payroll cycle context.
- The endpoint appears oriented around payroll-cycle reports. It still needs
  validation before assuming transaction-level restaurant detail exists.

Expected result:

- A documented integration decision: either defer, add read-only aggregate
  reporting, or add a richer transaction-level integration if the API supports
  it and access is allowed.

Concepts learned:

- External non-bank financial data.
- Credential-based API authentication.
- Payroll-cycle consumption reports.
- Separating PSD2 bank data from benefit-provider data.

Possible future files:

- `docs/cobee.md`.
- `lib/cobee/` for server-only API calls, if approved later.
- Cobee-specific database migrations, if persistence becomes useful.
- Report view additions that compare or include Cobee consumption.

Risks or decisions:

- API credentials may require employer or customer-success access.
- The API may expose payroll-cycle aggregates rather than individual purchases.
- Cobee credentials and JWTs must remain server-only.
- Cobee data should not be mixed into Enable Banking connection tables.
- Do not implement employee administration or payroll mutation endpoints for
  this app's first scope.

Suggested acceptance criteria for a future spike:

- Confirm API access is available and allowed for this personal reporting use.
- Authenticate server-side without exposing credentials.
- Fetch one safe company/employee/consumption response.
- Document whether data granularity is aggregate-only or transaction-level.
- Decide whether persistence is needed before creating migrations.

Do not do yet:

- Build a full Cobee integration before credentials and data shape are known.
- Use Cobee write endpoints.

## 30. Add Monthly Period Navigation For Transactions And Charts

Status:

- Completed.

Implemented:

- The private route accepts a validated `month=YYYY-MM` query parameter and
  falls back to the current month for malformed or future values.
- Previous and next controls are available in the transaction review and the
  category expense radar. The next control is disabled for the current month.
- Navigation preserves its source tab in the URL and loads the selected range
  from cached Supabase transactions without starting a provider backfill.
- Transaction rows, dashboard cashflow cards, and the category expense radar
  share the same selected month. The annual evolution chart remains scoped to
  the current year and labels that year explicitly.
- Empty transaction and category states name the selected month in Spanish.

Goal:

- Let the owner move backward and forward by month to review stored
  transactions and month-specific visualizations for periods other than the
  current month.

Expected result:

- The transaction review can show a selected month, not only the current month.
- Month-specific visualizations, such as category expense charts and monthly
  cashflow cards, update to the same selected month.
- The current year evolution chart can remain annual, but it should coexist
  with the selected-month controls without confusing the user.

Concepts learned:

- URL-backed UI state.
- Date range calculation from a selected period.
- Coordinating multiple panels from the same reporting period.
- Historical data exploration over cached synced rows.

Implemented files:

- `lib/domain/transactionRanges.ts` for selected-month range helpers.
- `lib/views/privateHomeView/getPrivateHomeView.ts` to accept or derive a
  selected month.
- Private home route props and definitions for the selected period.
- Transaction review header controls for previous and next month.
- Chart panel controls or shared period controls.

Risks or decisions:

- The selected month should not trigger broad historical sync automatically
  until sync cost and provider limits are understood.
- If a month has no stored transactions, the UI should distinguish "no data
  stored" from "sync failed".
- URL state should validate invalid months and fall back predictably.
- Reports should use the user's stored data for the selected month and avoid
  presenting incomplete historical coverage as complete financial history.

Suggested acceptance criteria:

- The owner can move to the previous and next month from the private app.
- The selected month is reflected in the URL and survives refresh.
- Transaction rows, monthly cashflow cards, and category expense visualization
  use the same selected month.
- Empty months show a clear Spanish empty state.
- No provider credentials or server-only details reach the browser.

Do not do yet:

- Fetch all historical transactions automatically.
- Add custom arbitrary date ranges before month navigation is useful.
- Replace the annual evolution chart with a month selector unless that becomes
  a deliberate report redesign.

## 31. Replace Magic Links With Owner Password Login And Session Refresh

Status:

- Completed.

Implemented:

- The Spanish login form accepts the owner email and password and authenticates
  through Supabase `signInWithPassword`.
- The allowlist is checked before authentication, after authentication, and on
  private routes.
- Public sign-up, self-service recovery, and in-app password changes remain
  unavailable.
- The previous magic-link request action and email auth callback were removed.
- A Next.js Proxy refreshes expiring Supabase tokens and returns updated cookies
  with the required no-cache response headers.
- Local and deployed authentication both use the password login action and
  Supabase session-refreshing Proxy.
- Password login and cookie refresh behavior have focused automated coverage.

Goal:

- Make authentication reliable inside the installed iOS web app without adding
  custom SMTP or email OTP infrastructure.

Risks or decisions:

- The owner password must be strong, unique, and stored in a password manager.
- Password provisioning and recovery use a controlled server-only Supabase
  admin operation.
- Passwords, tokens, full emails, and cookie values must never appear in logs.
- Existing sessions remain valid and do not need global revocation.

## 32. Investigate Neutral Cash-Flow Reconciliation For Debts And Reimbursements

Status:

- Implemented.

Implemented outcome:

- The owner can create a finalized reconciliation from any eligible booked
  transaction, select at least one additional same-currency movement, and save
  the group atomically.
- Reconciliations support debt, reimbursement, refund, and other reasons. Notes
  are optional except for the `other` reason.
- The signed balance is always calculated from current transaction amounts.
  Exact zero closes without adjustment metadata; a non-zero balance can either
  be neutralized or reported through one category, date, and optional labels.
- Reconciled bank transactions remain visible with a `Compensado` chip but are
  excluded from cashflow cards, evolution, category and label charts, primary
  currency selection, counts, and direction filters.
- A reportable non-zero difference contributes once through the shared
  reporting-movement pipeline and never appears as a synthetic bank row.
- The desktop flow uses a centered shadcn dialog. Narrow screens use a
  borderless bottom sheet that leaves the app visible above it and supports
  swipe-down dismissal.
- The owner can review, edit, or permanently delete a reconciliation. Deleting
  it restores the original movements to reports unless another neutrality rule
  applies.
- The feature is available for eligible authenticated owner transactions.
- Migration `20260810120000_add_transaction_reconciliations.sql` owns the
  schema, RLS policies, candidate search, and atomic save/delete functions.

Problem:

- Some bank movements change the available balance without representing earned
  income or personal consumption.
- For example, receiving a EUR 800 family loan and returning its EUR 800
  principal in a later month should not inflate income in the first month or
  spending in the second one.
- Similar-looking cases can have different reporting semantics. Loan principal,
  shared-payment reimbursements, merchant refunds, fees, and interest should
  not all be treated as the same concept automatically.
- Related movements may differ by a small residual amount. For example, a debt
  repayment may include an extra EUR 0.10. Requiring the full transaction
  amounts to sum to exactly zero would incorrectly prevent reconciliation.
- Own-account transfers are already detected separately and excluded from
  income and spending reports. This feature should complement that behavior,
  not replace or duplicate it.

Historical product direction considered before implementation:

The following research notes are retained as design history. Where they differ
from the implemented outcome above, the implemented outcome is authoritative.

- Distinguish bank balance movements from reportable income and spending.
- Keep every imported transaction visible and unchanged as provider-owned
  financial data.
- Store reconciliation or reporting treatment as app-owned, user-owned
  metadata that provider sync cannot overwrite.
- Exclude matched loan principal from income and spending reports while keeping
  any interest or fee as an expense.
- For partial reimbursements, exclude only the reimbursed portion and retain the
  owner's remaining share as spending.
- Let the owner decide when a reconciliation is complete. A zero balance is a
  useful signal, not a mandatory validation rule.
- Show a Spanish status chip in the transaction table and provide a focused
  flow for reviewing linked movements.

Related reporting dependency:

- The current reporting code already excludes automatically detected
  own-account transfers from monthly cards and charts.
- The category catalog also contains the stable `internal_transfer` category,
  but assigning that category does not currently drive the automatic
  `cashflow_type` classification.
- A separate reporting task is expected to make movements categorized as
  internal transfers neutral everywhere: dashboard cards, annual evolution,
  and category charts.
- This reconciliation feature should consume that unified reporting result
  rather than implement another internal-transfer rule.
- Automatic or manually categorized internal transfers should take precedence
  over reconciliation, should not be offered as candidates in the compensation
  dialog, and must never be excluded twice.

Candidate interaction:

- Start from one transaction with an action such as `Compensar` or
  `Relacionar movimientos`; validate the final Spanish wording with the UI.
- Open a focused full-screen dialog on small screens with one search field that
  accepts description text or an amount.
- Prefer candidates with the opposite sign and the same currency, while still
  allowing broader date searches because related movements may occur in
  different months.
- Omit movements already treated as internal transfers by either automatic
  detection or the separate manual-category reporting rule.
- Support multiple selection and keep a calculator-like summary fixed at the
  bottom of the full-screen dialog.
- Recalculate the signed balance after every added or removed movement and show
  the selected movement count alongside it.
- Keep the completion action available once the source has at least one related
  movement. Do not disable it merely because the calculated balance is not
  zero.
- Present an exact zero as the clearest successful state. For a non-zero balance,
  show the difference prominently and make the confirmation wording explicit,
  for example `Terminar con una diferencia de 0,10 EUR`.
- Store the difference when the owner closes the reconciliation so it remains
  explainable later rather than being silently discarded.
- Allow a completed reconciliation to be reviewed, reopened, or edited so an
  omitted or incorrectly selected movement can be corrected.

Data-model direction to investigate:

- Do not start with only a `compensated` boolean or a single pointer to an
  opposite transaction. Those shapes cannot explain why a movement was
  excluded and do not support one-to-many, many-to-many, or partial matching.
- Prefer a user-owned reconciliation group plus user-owned membership rows.
- Give the group an owner-controlled lifecycle such as `open` and `closed`
  rather than deriving completion only from whether its signed total is zero.
- Derive the current balance from the signed amounts of its membership rows and
  record the final difference when the owner closes it.
- In the first slice, closing a group means the owner deliberately treats all
  selected movements and their residual difference as neutral for income and
  spending reports.
- Consider an allocated amount on each membership row in a later slice so one
  transaction can be only partially neutral and the remaining amount can still
  contribute to reports.
- Give the group an explicit reason or type, such as loan principal or
  reimbursement, instead of treating every zero-sum pair identically.
- Keep lifecycle and arithmetic separate: a group can be closed by the owner
  while its calculated balance remains non-zero.
- Keep currencies separate. Nominal amounts in different currencies must not be
  matched without an explicit exchange-rate policy.

Smallest useful implementation options to compare:

1. Allow only full, booked, same-currency transactions in a manually created
   group whose signed total is zero. This covers the initial exact EUR 800
   example but fails for small residual differences, outstanding debts, and
   partial repayments.
2. Allow the owner to close a group of full, booked, same-currency transactions
   with any visible final difference. Record that difference and exclude the
   closed group from income and spending reports. This is the preferred first
   slice because it handles incidental overpayments without requiring partial
   allocation UI.
3. Add allocated amounts later for shared payments, partially neutral
   transactions, or cases where the residual must remain reportable.
4. Add a manual reporting treatment before relationship groups. This is the
   smallest way to correct reports immediately, but it provides less auditability
   and may create unexplained exclusions.

Resolved research questions:

- Is the first scope only loans, or should it also cover shared payments and
  refunds?
- Should linking a later repayment recalculate the historical month, or should
  reports preserve what was known at that time?
- Can a transaction participate in more than one reconciliation group when it
  contains several people's shares?
- Should an open reconciliation affect reports before the owner closes it, or
  should only closed groups be excluded?
- Which reports should exclude neutral amounts, and where should they remain
  visible as financing cash flow?
- How prominently should a non-zero closing difference appear in the table and
  reconciliation detail?
- Is `Compensar`, `Conciliar`, or `Relacionar movimientos` clearest in Spanish?

Security and ownership:

- Reconciliation groups, memberships, reasons, and notes can reveal sensitive
  family or personal debt information and must be owner-scoped with RLS.
- Server-side mutations must verify that every linked transaction and group
  belongs to the authenticated user.
- Provider sync must never delete or overwrite reconciliation metadata.

Original acceptance criteria used for the first slice:

- The owner can start from one of their transactions and find candidate
  movements by description or amount across stored months.
- Only transactions owned by the authenticated user can be linked.
- The UI shows sign, currency, date, account, running selected total, and any
  unmatched amount before confirmation.
- A non-zero difference does not block reconciliation. The completion action
  states the difference explicitly and the closed group retains it for later
  review.
- Neutral principal or allocated reimbursed amounts are excluded consistently
  from monthly cards, annual evolution, and category charts.
- Separately identifiable interest, fees, and non-reimbursed shares remain
  reportable unless the owner deliberately includes them in the reconciliation.
  Splitting an embedded residual requires the later allocation feature.
- Linked transactions remain visible and display a clear Spanish status chip.
- A completed reconciliation can be reopened or edited, and changing it safely
  restores or recalculates report contributions.

Do not do yet:

- Automatically match personal debts based only on equal amounts.
- Add open or partially persisted reconciliation drafts.
- Add allocated partial amounts within one bank transaction.
- Turn this into a complete lending, collections, or accounting system.
