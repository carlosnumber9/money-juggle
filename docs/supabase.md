# Supabase

Supabase will provide authentication, Postgres persistence, and Row Level Security.

The app should treat Supabase as a security boundary, not just a database.

## Authentication With Magic Link

Initial authentication should use email magic links.

Conceptual flow:

1. User enters email.
2. Supabase sends a magic link.
3. User opens the link.
4. Next.js receives and stores the session.
5. Server-side checks verify that the email is allowed.
6. Private app areas become available.

User-visible authentication text should be Spanish when the UI is implemented.

## Supabase Auth Dashboard Configuration

Supabase email authentication methods, including magic links, are enabled by
default for hosted projects. This project should still make the required Auth
settings explicit before the login UI is implemented.

In the Supabase Dashboard:

1. Open the project used by `money-juggle`.
2. Go to Auth configuration.
3. Keep email authentication enabled.
4. Configure the Site URL:
   - Local development: `http://localhost:3000`
   - Production: the final Vercel production URL when it exists.
5. Add allowed redirect URLs:
   - Local callback: `http://localhost:3000/auth/callback`
   - Production callback: `https://<production-domain>/auth/callback`
   - Optional Vercel preview callback only when preview deployments need login.
6. Keep the email template as a magic-link flow unless the app deliberately
   changes to OTP codes later.

The future login implementation should pass `/auth/callback` as the redirect
target when requesting a magic link. Supabase will only redirect to URLs that
match the configured allow list.

The current login implementation passes the runtime origin plus
`/auth/callback` as the redirect target and uses `shouldCreateUser: false`.
The runtime origin is resolved from forwarded request headers so production and
preview deployments generate magic links for the domain that served the login
request, not a hard-coded local URL. This prevents public self-registration
through the login form. The owner user must exist in Supabase before the login
request can succeed.

The app checks `ALLOWED_EMAILS` before requesting a magic link, after the
callback creates a session, and before rendering private routes. Authentication
proves the user owns an email inbox; the allowlist decides whether that email
may access `money-juggle`.

## Next.js SSR

Future implementation should use Supabase patterns compatible with Next.js App Router and server rendering.

Important goals:

- Read sessions on the server.
- Protect private routes.
- Avoid exposing service role keys.
- Keep auth callback behavior explicit.
- Make redirects predictable.

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

## Anon Key vs Service Role Key

The anon key:

- May be used in the browser.
- Must rely on RLS for safety.
- Should not grant broad data access by itself.

The service role key:

- Bypasses RLS.
- Must never reach the browser.
- Must only be used in server-only code.
- Should not be the default client for normal user reads.

## When Service Role May Be Used

Possible valid cases:

- Controlled server-side sync jobs.
- Admin-only maintenance scripts.
- Operations where RLS would block required system behavior and ownership is checked separately.

Every use should be intentional and easy to audit.

## When Service Role Must Not Be Used

Do not use service role:

- In browser code.
- In shared modules that may be imported by client components.
- For ordinary user-facing reads when an authenticated RLS-aware client is enough.
- As a shortcut around policy design.

## Environment Variables

Current required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `ALLOWED_EMAILS`

Future server-only variables:

- `SUPABASE_SERVICE_ROLE_KEY`
- `ENABLE_BANKING_APPLICATION_ID`
- `ENABLE_BANKING_PRIVATE_KEY`
- Enable Banking provider tokens or authorization secrets if the implementation requires them.

Only values explicitly intended for browser use should use `NEXT_PUBLIC_`.

Local development uses `.env.local`, which is ignored by Git. Shared examples
belong in `.env.example`.

Supabase now labels browser-safe API keys as publishable keys. This project uses
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` instead of the older anon key variable
name.

## Client Helpers

The project provides two small Supabase helpers:

- `lib/supabase/client.ts` creates a browser client for future client
  components.
- `lib/supabase/server.ts` creates a server client for future Server
  Components, Route Handlers, and Server Actions.

Both helpers use the publishable key. They do not use the service role key.

Do not add service role clients until a server-only feature has a documented
need to bypass RLS.

## Migration Workflow

Database schema changes should be made through SQL files in
`supabase/migrations/`.

The project uses the Supabase CLI as a local dev dependency. For this Supabase
project, the helper scripts are:

- `npm run db:link`: links the local repo to the remote Supabase project.
- `npm run db:push`: applies pending local migrations to the linked remote
  project.
- `npm run db:migrations`: lists local and remote migration status.

Current remote migration status:

- `20260704143000_create_initial_schema.sql` is applied to the linked Supabase
  project.

Run `npx supabase login` once before linking if the CLI is not authenticated.
In non-interactive environments, provide `SUPABASE_ACCESS_TOKEN` through the
shell or secret manager instead. Do not commit access tokens.

Do not make schema changes directly in the remote Table Editor or SQL Editor
once migrations are in use. Direct remote schema changes bypass migration
history and can make later `db:push` runs fail with sync errors.

Schema deployment should stay manual for now. Automated `db:push` from CI can be
considered later when production deployment is more formal.

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
- Minimal service role usage.
- Monitoring for sync failures.
- Clear handling for consent expiration.

## Restricting Access To The Owner

The first version may support only one owner email.

Conceptual options:

- `ALLOWED_EMAILS` for a comma-separated allowlist.
- `OWNER_EMAIL` for a single allowed email. This is still accepted as a
  compatibility fallback, but `ALLOWED_EMAILS` is the preferred variable.
- A future database table for allowed users.

The check happens server-side before email sending, after Supabase
authentication, and before private route rendering. UI-only filtering is not
sufficient.

## Ownership Even For A Personal App

Design every user-owned financial row as if more users may exist later.

This keeps the app safer and prevents future refactors from becoming dangerous. The current owner may be the only user, but `user_id` should still be part of financial records.
