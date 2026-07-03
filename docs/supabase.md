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

Future server-only variables:

- `SUPABASE_SERVICE_ROLE_KEY`
- `ALLOWED_EMAILS` or `OWNER_EMAIL`
- `GOCARDLESS_SECRET_ID`
- `GOCARDLESS_SECRET_KEY`

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

- `OWNER_EMAIL` for a single allowed email.
- `ALLOWED_EMAILS` for a comma-separated allowlist.
- A future database table for allowed users.

The check must happen server-side after Supabase authentication. UI-only filtering is not sufficient.

## Ownership Even For A Personal App

Design every user-owned financial row as if more users may exist later.

This keeps the app safer and prevents future refactors from becoming dangerous. The current owner may be the only user, but `user_id` should still be part of financial records.
