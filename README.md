# money-juggle

A very custom finance tracker for my own accounts.

The current implementation includes a private Next.js App Router application
with Supabase email-and-password authentication, owner email allowlist checks, a
server-only Enable Banking Account Information integration, connected account
storage, balance synchronization, current-month transaction synchronization,
monthly cashflow cards, current-year evolution charts, category expense
visualization, and inline transaction categorization.

## Development

Install dependencies:

```bash
npm install
```

Create local environment variables:

```bash
cp .env.example .env.local
```

Then fill the Supabase values in `.env.local`.

For local UI development without Supabase or Enable Banking, enable demo mode:

```bash
MONEY_JUGGLE_DEMO_MODE=true
```

Demo mode only works during local Next.js development. It serves mock users,
bank connections, accounts, balances, and transactions through the same app data
source contract used by the real integration. In demo mode, the login screen
remains reachable after signing out, and submitting the login form enters the
home page even when the email field is empty.

Configure the allowed login emails as a comma-separated list:

```bash
ALLOWED_EMAILS=owner@example.com
```

The owner user must already exist in Supabase Auth with a strong password
because the app does not expose public registration or password recovery.

## Database Schema

The local migration chain is defined in:

```text
supabase/migrations/20260704143000_create_initial_schema.sql
supabase/migrations/20260704170000_add_enable_banking_connection_fields.sql
supabase/migrations/20260707120000_add_account_fingerprints_for_internal_transfers.sql
supabase/migrations/20260709120000_seed_initial_transaction_categories.sql
supabase/migrations/20260719120000_add_transaction_labels.sql
supabase/migrations/20260719214000_add_shared_expense_settlement_category.sql
supabase/migrations/20260804120000_add_personal_care_and_rename_vehicle_insurance.sql
```

Apply pending migrations to the Supabase project to create and evolve the
tables, indexes, constraints, RLS policies, Enable Banking connection fields,
internal transfer fingerprints, owner-scoped transaction category catalog, and
transaction labels. After applying them, the tables should appear in the
Supabase Dashboard Table Editor under the `public` schema.

Prefer applying migrations through the Supabase CLI so the remote migration
history stays in sync with the repository:

```bash
npm run db:link
npm run db:push
```

If the CLI is not authenticated yet, run `npx supabase login` first. Do not make
schema changes directly in the remote Table Editor once migrations are in use.

In non-interactive environments, set `SUPABASE_ACCESS_TOKEN` in the shell or CI
secret store before running the database scripts. Never commit that token.

Start the local Next.js app:

```bash
npm run dev
```

This command is for intentional local development. Agents should not start the
local app for testing or verification unless the prompt specifically asks for a
local app run or browser-based local testing.

Run the basic checks:

```bash
npm run check
```

Or run them separately:

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run test:coverage
npm run build
```

Use `npm run test:watch` while developing a focused unit. Coverage is written
to `coverage/` for local inspection and CI artifacts; it is diagnostic and does
not enforce a global percentage threshold.

Format files:

```bash
npm run format
```
