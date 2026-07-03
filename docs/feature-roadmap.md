# Feature Roadmap

This roadmap is intentionally incremental. Do not implement these phases now. Each phase should become a small, reviewable task when requested.

## 1. Bootstrap The Next.js Project

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

## 4. Configure Supabase Auth

Goal:

- Enable email magic link authentication.

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

## 5. Implement Magic Link Login

Goal:

- Add a minimal login flow.

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

## 6. Add Email Allowlist

Goal:

- Restrict access to the owner email or explicit allowlist.

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

## 7. Create Basic Private Layout

Goal:

- Add a minimal authenticated app area.

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

## 8. Design Initial Database Schema

Goal:

- Turn the conceptual model into an initial schema proposal.

Expected result:

- Tables and relationships are reviewed before migration.

Concepts learned:

- Ownership columns.
- External provider IDs.
- Financial data modeling.

Possible future files:

- `supabase/migrations/`
- Schema docs.

Risks or decisions:

- Avoid storing unnecessary sensitive raw data.

Do not do yet:

- Create every possible reporting table.

## 9. Enable And Test RLS

Goal:

- Add RLS policies for initial tables.

Expected result:

- Users can access only their own rows.

Concepts learned:

- RLS policies.
- `auth.uid()`.
- Policy testing.

Possible future files:

- Supabase migrations.
- Policy tests or SQL checks.

Risks or decisions:

- Avoid relying on service role for normal app reads.

Do not do yet:

- Import financial data before policies are verified.

## 10. Add Conceptual GoCardless Configuration

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

## 11. Implement First GoCardless Token Call

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

## 12. List Available Institutions

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

## 13. Start Bank Connection Flow

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

## 14. Store Requisition And Consent Data

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

## 15. Handle GoCardless Callback

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

## 16. Store Connected Accounts

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

## 17. Sync Balances

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

## 18. Sync Transactions

Goal:

- Fetch and store transactions.

Expected result:

- Transaction history is available for reporting.

Concepts learned:

- Deduplication.
- Booking date vs value date.
- Provider transaction IDs.

Possible future files:

- Transaction tables.
- Transaction normalization tests.

Risks or decisions:

- Duplicate transactions and raw data sensitivity.

Do not do yet:

- Build complex categorization.

## 19. Build A Basic Dashboard

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

## 20. Add Transaction Categorization

Goal:

- Categorize transactions for reporting.

Expected result:

- Transactions can be grouped by category.

Concepts learned:

- User-owned metadata.
- Rule-based classification.

Possible future files:

- Category tables.
- Categorization domain logic.

Risks or decisions:

- Manual vs automatic categorization.

Do not do yet:

- Build machine learning classification.

## 21. Add Monthly Reports

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

## 22. Add Manual Assets For Trade Republic / Investments

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

## 23. Add Scheduled Sync With Vercel Cron

Goal:

- Refresh data periodically.

Expected result:

- Sync can run without manual action.

Concepts learned:

- Scheduled jobs.
- Idempotent sync.
- Operational monitoring.

Possible future files:

- Cron route.
- Vercel configuration.

Risks or decisions:

- Protect cron endpoints.

Do not do yet:

- Run scheduled sync before manual sync is stable.

## 24. Add Error And Reconnection Flows

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

## 25. Security Hardening

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

