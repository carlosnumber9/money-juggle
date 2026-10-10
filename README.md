# money-juggle

A very custom finance tracker for my own accounts.

The current implementation includes a private Next.js App Router application
with Supabase email-and-password authentication, owner email allowlist checks, a
server-only Enable Banking Account Information integration, connected account
storage, balance synchronization, current-month transaction synchronization,
monthly cashflow cards, current-year evolution charts, category and label
expense visualization, net savings, inline transaction categorization, reporting
date edits, finalized reconciliations, reconnection review, and monthly Excel
exports from the dashboard or command line.

See the [documentation index](docs/README.md) for task-specific reading,
[current implementation](docs/current-state.md) for capabilities and limits, and
[AGENTS.md](AGENTS.md) for agent instructions.

Use Node.js 24.x and npm (declared package manager: npm 10.8.2).

## Development

Install dependencies:

```bash
npm ci
```

Create local environment variables:

```bash
cp .env.example .env.local
```

Then fill the Supabase values in `.env.local`.

Local development uses the same authenticated Supabase, Postgres, and Enable
Banking paths as the deployed application. Configure those services before
using private screens or bank synchronization locally.

Configure the allowed login emails as a comma-separated list:

```bash
ALLOWED_EMAILS=owner@example.com
```

The owner user must already exist in Supabase Auth with a strong password
because the app does not expose public registration or password recovery.

## Database Schema

The ordered local migration chain lives in [supabase/migrations/](supabase/migrations/).
See [Data model](docs/data-model.md) for its inventory, ownership constraints,
and RLS, and [Supabase](docs/supabase.md#migration-workflow) for deployment steps.
Local migration files do not prove that the remote project is up to date.

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

Run static checks (typecheck, lint, and formatting; tests run separately):

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

## Monthly Reports From The Command Line

Generate the same monthly Excel workbook as the dashboard, without starting
the local app:

```bash
npm run report:monthly -- --month 2026-09
```

Omit `--month` to use the previous month in `Europe/Madrid`. Each run writes
`reports/Finanzas-YYYY-MM.xlsx`, replacing the previous report for that month.
Reports for other months are preserved, and the directory remains ignored by
Git. The command reads saved Supabase data without synchronizing banks.

Configure `REPORT_PASSWORD` with the existing owner's Supabase Auth password
in the shell environment or ignored `.env.local`. Configure `REPORT_EMAIL` as
well if the allowlist has more than one email. These credentials are used for
an authenticated, RLS-protected session; no service role is used. Never put a
password in command arguments or commit credentials or generated workbooks.

See [Monthly Excel Export](docs/monthly-excel-export.md) for the workbook
contract and command details. Run `npm run report:monthly -- --help` for usage.

Format files:

```bash
npm run format
```
