# Supabase

Supabase provides authentication, Postgres persistence, and Row Level Security.

The app should treat Supabase as a security boundary, not just a database.

## Authentication With Email And Password

Authentication uses the existing owner email and a strong password managed by
Supabase Auth. The app does not expose sign-up, password recovery, or password
change flows.

Conceptual flow:

1. The owner enters email and password.
2. The server rejects missing or unapproved email input before authentication.
3. Supabase verifies the credentials with `signInWithPassword`.
4. The server checks the authenticated email against the allowlist again.
5. Next.js stores the Supabase session in cookies.
6. The Next.js Proxy refreshes expiring tokens and returns updated cookies.
7. Private app areas become available.

User-visible authentication text is Spanish.

## Supabase Auth Dashboard Configuration

Supabase email authentication is enabled by default for hosted projects. This
project uses only the password sign-in part of that provider.

In the Supabase Dashboard:

1. Open the project used by `money-juggle`.
2. Go to Auth configuration.
3. Keep email authentication enabled.
4. Disable public user creation.
5. Create the owner user if it does not exist and assign its password through a
   controlled server-only admin operation.
6. Remove `/auth/callback` from allowed redirect URLs because password login
   does not use email callbacks.

The app checks `ALLOWED_EMAILS` before sending credentials to Supabase, after
Supabase creates a session, and before rendering private routes. Authentication
proves knowledge of the owner password; the allowlist decides whether that
authenticated email may access `money-juggle`.

The auth flow writes sanitized server-side diagnostics for password sign-in,
Supabase auth cookie writes, and rejected access. Those logs use generated auth
log IDs, masked email addresses, sanitized Supabase error details, and boolean
cookie diagnostics. They must not include passwords, session tokens, cookie
values, full email addresses, or secret keys.

## Next.js SSR

The implementation uses Supabase patterns compatible with Next.js App Router
and server rendering.

Important goals:

- Read sessions on the server.
- Refresh expiring tokens in the Next.js Proxy and return the updated cookies.
- Protect private routes.
- Avoid exposing secret keys or other elevated Supabase credentials.
- Do not add an email auth callback while password login remains the only flow.
- Make redirects predictable.

## Owner Password Provisioning And Recovery

The app must not expose an admin password endpoint. Before deploying password
login, assign a strong password to the existing owner user through a one-off
server-only call to `auth.admin.updateUserById`. Enter the password
interactively and never place it in a committed script, shell argument, log, or
persistent environment variable during provisioning. The separate local
report CLI may read `REPORT_PASSWORD` from the shell or ignored `.env.local`
for ordinary owner authentication; it never provisions users or uses admin access.

Use the same controlled admin procedure if the password is forgotten or needs
rotation. The normal login path uses only the publishable key and never receives
the Supabase secret key.

## RLS Mindset

RLS is mandatory for user-owned financial data.

Assume every financial table needs:

- A `user_id` column.
- RLS enabled.
- Policies for authenticated owners.
- Tests or manual checks proving users cannot see other users' data.

Even if the app is personal, this prevents future mistakes and keeps the data model honest.

## Conceptual RLS Policies

For user-owned tables:

- Users can select rows where `user_id = auth.uid()`.
- Users can insert rows only for their own `user_id`.
- Users can update rows where `user_id = auth.uid()`.
- Deletes should be considered carefully and may be restricted.

For reference tables:

- Public read may be acceptable if rows contain no private data.
- Writes should usually be restricted to server-side operations or admin workflows.

## Publishable Key vs Secret Key

The publishable key:

- May be used in the browser.
- Must rely on RLS for safety.
- Should not grant broad data access by itself.

The secret key:

- Bypasses RLS.
- Must never reach the browser.
- Must only be used in server-only code.
- Should not be the default client for normal user reads.

Supabase secret keys authorize the built-in Postgres `service_role`, so they
must be treated with the same sensitivity as the legacy service role key.

## When Secret Keys May Be Used

Possible valid cases:

- Controlled server-side sync jobs.
- Admin-only maintenance scripts.
- Operations where RLS would block required system behavior and ownership is checked separately.

Every use should be intentional and easy to audit.

## When Secret Keys Must Not Be Used

Do not use secret keys:

- In browser code.
- In shared modules that may be imported by client components.
- For ordinary user-facing reads when an authenticated RLS-aware client is enough.
- As a shortcut around policy design.

## Environment Variables

Current required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `ALLOWED_EMAILS`

Server-only variables used by the current banking implementation:

- `SUPABASE_SECRET_KEYS`
- `ENABLE_BANKING_APPLICATION_ID`
- `ENABLE_BANKING_PRIVATE_KEY` or ignored local `ENABLE_BANKING_PRIVATE_KEY_PATH`
- `ENABLE_BANKING_REDIRECT_URL`
- `ENABLE_BANKING_API_BASE_URL` (optional override)
- `MONEY_JUGGLE_ACCOUNT_FINGERPRINT_SECRET` (account HMAC matching)

See [.env.example](../.env.example) and
[Enable Banking](enable-banking.md#secret-handling) for configuration. Signing
JWTs are generated server-side; no separate provider-token environment variable
is used. The report CLI's `REPORT_EMAIL` and `REPORT_PASSWORD` are documented in
[Monthly Excel export](monthly-excel-export.md#local-command).

Only values explicitly intended for browser use should use `NEXT_PUBLIC_`.

Local development uses `.env.local`, which is ignored by Git. Shared examples
belong in `.env.example`.

Supabase now labels browser-safe API keys as publishable keys. This project uses
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` instead of the older anon key variable
name.

Supabase now labels elevated backend API keys as secret keys. This project uses
`SUPABASE_SECRET_KEYS` instead of the older `SUPABASE_SERVICE_ROLE_KEY`
variable name. The value is a JSON object keyed by Supabase API key name, for
example:

```text
SUPABASE_SECRET_KEYS={"default":"sb_secret_..."}
```

Use the `default` secret key for the current server-side helper unless a future
backend component needs its own separately rotatable named key.

## Client Helpers

The project provides authenticated Supabase helpers:

- `lib/supabase/client.ts` creates the browser client.
- `lib/supabase/server.ts` creates the cookie-backed server client.
- `lib/supabase/proxy.ts` refreshes sessions through root `proxy.ts`.
- `lib/supabase/currentUser.ts` verifies the user for server-side access checks.

Browser and cookie-backed server clients use the publishable key, not secret keys.

The server-only elevated helper reads the `default` key from
`SUPABASE_SECRET_KEYS`. It is used for controlled provider persistence and the existing
owner-checked category/reporting-date updates, as documented in
[Security](security.md#secret-key-risk). Ordinary reads, labels, reconciliations,
and reports use authenticated clients. Do not add another elevated path without
a documented need and explicit ownership enforcement.

## Migration Workflow

Database schema changes should be made through SQL files in
`supabase/migrations/`.

The project uses the Supabase CLI as a local dev dependency. For this Supabase
project, the helper scripts are:

- `npm run db:link`: links the local repo to the remote Supabase project.
- `npm run db:push`: applies pending local migrations to the linked remote
  project.
- `npm run db:migrations`: lists local and remote migration status.

The full ordered local migration inventory is maintained in
[Data model](data-model.md). The executable files are in
[supabase/migrations/](../supabase/migrations/); avoid duplicating a partial
inventory here.

Use `npm run db:migrations` to confirm which local migrations are applied to the
linked remote Supabase project before pushing new schema changes.

Run `npx supabase login` once before linking if the CLI is not authenticated.
In non-interactive environments, provide `SUPABASE_ACCESS_TOKEN` through the
shell or secret manager instead. Do not commit access tokens.

Do not make schema changes directly in the remote Table Editor or SQL Editor
once migrations are in use. Direct remote schema changes bypass migration
history and can make later `db:push` runs fail with sync errors.

Schema deployment should stay manual for now. Automated `db:push` from CI can be
considered later when production deployment is more formal.

After applying the reconciliation-state RPC migration, run
`npx supabase db query --linked --file supabase/tests/transaction_reconciliation_states.sql`
to verify full-group balances, exact decimal drift, duplicate inputs, and owner
isolation. This SQL check creates synthetic fixtures in one transaction and
rolls them all back. It does not modify existing user transactions. The unit
tests mock HTTP and verify POST bodies, response pagination, and failures.

## Local Development Practices

When local development starts:

- Keep local and production secrets separate.
- Use a local `.env.local` that is not committed.
- Document required variables without committing real values.
- Test RLS policies early.
- Seed only safe development data.

## Production Considerations

Production should include:

- Confirmed email allowlist.
- RLS enabled before real financial data is stored.
- Backups.
- Secret rotation process.
- Minimal secret key usage.
- Monitoring for sync failures.
- Clear handling for consent expiration.

## Restricting Access To The Owner

The first version may support only one owner email.

Conceptual options:

- `ALLOWED_EMAILS` for a comma-separated allowlist.
- `OWNER_EMAIL` for a single allowed email. This is still accepted as a
  compatibility fallback, but `ALLOWED_EMAILS` is the preferred variable.
- A future database table for allowed users.

The check happens server-side before password authentication, after Supabase
authentication, and before private route rendering. UI-only filtering is not
sufficient.

## Ownership Even For A Personal App

Design every user-owned financial row as if more users may exist later.

This keeps the app safer and prevents future refactors from becoming dangerous. The current owner may be the only user, but `user_id` should still be part of financial records.
