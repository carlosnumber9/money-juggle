# Feature Roadmap

This roadmap is intentionally incremental. Do not implement these phases unless requested. Each phase should become a small, reviewable task when requested.

## Implementation Tracker

Use this checklist as the source of truth for what remains to be implemented. Keep completed items checked, and keep the detailed phase notes below for context.

- [x] 1. Bootstrap the Next.js project.
- [x] 2. Configure basic project tooling.
- [x] 3. Set up Supabase project.
- [x] 4. Configure quick UI foundation with shadcn/ui.
- [x] 5. Configure Supabase Auth.
- [x] 6. Implement magic link login.
- [x] 7. Add email allowlist.
- [x] 8. Create basic private layout.
- [x] 9. Design initial database schema.
- [x] 10. Enable RLS.
- [ ] 11. Add conceptual GoCardless configuration.
- [ ] 12. Implement first GoCardless token call.
- [ ] 13. List available institutions.
- [ ] 14. Start bank connection flow.
- [ ] 15. Store requisition and consent data.
- [ ] 16. Handle GoCardless callback.
- [ ] 17. Store connected accounts.
- [ ] 18. Sync balances.
- [ ] 19. Sync transactions.
- [ ] 20. Build a basic dashboard.
- [ ] 21. Add transaction categorization.
- [ ] 22. Add monthly reports.
- [ ] 23. Add manual assets for Trade Republic / investments.
- [ ] 24. Add scheduled sync with Vercel Cron.
- [ ] 25. Add error and reconnection flows.
- [ ] 26. Security hardening.

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

- Completed.

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

- Completed.

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

## 11. Add Conceptual GoCardless Configuration

Goal:

- Document and prepare required server-only configuration.

Expected result:

- Required secrets and integration boundaries are clear.

Concepts learned:

- Server-only environment variables.
- External API credentials.

Possible future files:

- Environment variable docs.
- `lib/gocardless/` later.

Risks or decisions:

- Never expose credentials to the client.

Do not do yet:

- Implement the full consent flow.

## 12. Implement First GoCardless Token Call

Goal:

- Make one server-side token request.

Expected result:

- Server code can authenticate with GoCardless.

Concepts learned:

- Server-only API calls.
- Secret management.

Possible future files:

- `lib/gocardless/`
- A controlled server endpoint or script.

Risks or decisions:

- Token storage and logging.

Do not do yet:

- Fetch transactions.

## 13. List Available Institutions

Goal:

- Fetch supported institutions for relevant countries.

Expected result:

- The app can show supported banks such as CaixaBank and ING if available.

Concepts learned:

- Institution IDs.
- Provider reference data.

Possible future files:

- Server route or server action.
- Institution persistence.

Risks or decisions:

- Cache strategy.

Do not do yet:

- Start consent automatically.

## 14. Start Bank Connection Flow

Goal:

- Create the initial requisition flow for a selected bank.

Expected result:

- User can be redirected to bank consent.

Concepts learned:

- End user agreements.
- Requisitions.
- Redirect URLs.

Possible future files:

- `app/api/bank-connections/start/route.ts`
- `lib/gocardless/`

Risks or decisions:

- Persist pending consent state safely.

Do not do yet:

- Assume the bank connection succeeded before callback verification.

## 15. Store Requisition And Consent Data

Goal:

- Persist consent lifecycle data.

Expected result:

- The app can track pending, linked, expired, and failed connections.

Concepts learned:

- Consent state machines.
- External IDs.

Possible future files:

- Database migrations.
- Domain consent helpers.

Risks or decisions:

- Avoid duplicate active connections for the same bank unless intentional.

Do not do yet:

- Sync account data before consent is valid.

## 16. Handle GoCardless Callback

Goal:

- Complete the consent return flow.

Expected result:

- The app verifies the requisition and updates connection state.

Concepts learned:

- Callback validation.
- Redirect handling.

Possible future files:

- `app/api/bank-connections/callback/route.ts`
- Consent event persistence.

Risks or decisions:

- Prevent linking callbacks to the wrong user.

Do not do yet:

- Trust callback query parameters without server verification.

## 17. Store Connected Accounts

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

- Transaction tables.
- Transaction normalization tests.
- Transaction identity helpers.
- Sync persistence logic.

Risks or decisions:

- Duplicate transactions and raw data sensitivity.
- GoCardless transaction identifiers are useful but optional, so the app must not depend on one field always being present.
- Pending transactions can later become booked with stronger identifiers or changed fields.
- User-owned transaction metadata, such as categories, must not be overwritten by provider sync.

Recommended scope:

- Normalize GoCardless transaction fields into the app data model.
- Store external identifiers such as `internalTransactionId`, `transactionId`, `entryReference`, and `endToEndId` when available.
- Compute a deterministic `stable_import_key` using the documented priority:
  `internalTransactionId`, then `transactionId`, then `entryReference`, then meaningful `endToEndId`, then fallback fingerprint.
- Store `identity_source` and `deduplication_fingerprint`.
- Upsert by `user_id`, `account_id`, and `stable_import_key`.
- Reconcile against recent same-account candidates before inserting when the stable key has changed because a pending or incomplete transaction gained stronger identifiers.
- Preserve app-owned fields such as `category_id` during sync updates.
- Prefer booked transactions as the source for permanent reports.

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

## 21. Add Transaction Categorization

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

- A user can create, update, archive, and list only their own category groups.
- A user can create, update, archive, and list only their own categories.
- A user can assign one of their categories to one of their category groups.
- A user can assign one of their categories to one of their transactions.
- Transactions without manual assignment remain uncategorized.
- A later transaction sync does not erase that assignment.
- Reports can group transactions by `category_id`.
- Reports can optionally roll category totals up to `transaction_category_groups`.
- RLS prevents access to another user's category groups, categories, or category assignments.

Do not do yet:

- Build machine learning classification.
- Build a complex budgeting system.

## 22. Add Monthly Reports

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

- Handling transfers between own accounts.

Do not do yet:

- Add tax or accounting features.

## 23. Add Manual Assets For Trade Republic / Investments

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

## 24. Add Scheduled Sync With Vercel Cron

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

## 25. Add Error And Reconnection Flows

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

## 26. Security Hardening

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
