# money-juggle

A very custom finance tracker for my own accounts.

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

The owner user must already exist in Supabase Auth because the app disables
public self-registration for magic links.

## Database Schema

The initial schema is defined in:

```text
supabase/migrations/20260704143000_create_initial_schema.sql
```

Apply that SQL to the Supabase project to create the initial tables, indexes,
constraints, and RLS policies. After applying it, the tables should appear in
the Supabase Dashboard Table Editor under the `public` schema.

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

Run the basic checks:

```bash
npm run check
```

Or run them separately:

```bash
npm run typecheck
npm run lint
npm run format:check
npm run build
```

Format files:

```bash
npm run format
```
