# Security

This app handles financial data. Even as a personal project, it should be designed with explicit security boundaries from the beginning.

## Basic Threat Model

Important assets:

- Bank account metadata.
- Balances.
- Transactions.
- Transaction categories and category rules.
- Consent state.
- Manual asset data.
- Supabase sessions.
- Supabase service role key.
- Enable Banking signing keys and provider credentials.
- Enable Banking access or authorization tokens if used.

Relevant threats:

- Unauthorized login.
- Unauthorized access to financial records.
- Leaked environment variables.
- Accidental exposure of server secrets to the browser.
- Overbroad service role usage.
- Broken RLS policies.
- Compromised email account.
- Browser or mobile device compromise.
- Sync jobs writing data to the wrong owner.

## Magic Link Authentication

Magic link login is convenient and appropriate for an early personal app, but it makes the email inbox a critical security factor.

The app should:

- Restrict sign-in to the owner email or an explicit allowlist.
- Reject unapproved emails after authentication.
- Keep private routes protected by session checks.
- Consider MFA or passkeys later.

## Email Allowlist

The allowlist should be enforced server-side. It may also be reflected in UI messaging, but UI checks are not enough.

Future options:

- A single configured owner email.
- A small environment-based allowlist.
- A database-backed allowlist if multi-user support becomes real.

## Supabase Row Level Security

RLS must be enabled on financial tables. Policies should enforce that users can only access rows they own.

Conceptual policy shape:

- `select`: authenticated user can read rows where `user_id = auth.uid()`.
- `insert`: authenticated user can insert rows for their own `user_id`.
- `update`: authenticated user can update rows they own.
- `delete`: usually restricted or avoided for imported financial history unless a feature requires it.

The service role bypasses RLS and should be treated as highly sensitive.

## Secrets Management

Server-only secrets should be stored in Vercel environment variables and local development secret files when implementation begins.

Never expose:

- `ENABLE_BANKING_PRIVATE_KEY`
- Enable Banking access or authorization tokens
- Supabase service role key
- Internal sync secrets
- Webhook or cron secrets

Only variables intended for browser use may use `NEXT_PUBLIC_`.

## Sensitive Data Categories

High sensitivity:

- Credentials and API secrets.
- Access tokens and refresh tokens.
- Supabase service role key.

Financial sensitivity:

- Account identifiers.
- Balances.
- Transactions.
- Transaction categories and category rules.
- Institution connections.
- Consent records.
- Manual asset values.

Operational sensitivity:

- Sync error details.
- Logs containing external IDs.
- Audit trails.

Logs should avoid secrets and should minimize financial detail.

## What Must Never Reach The Client

The browser must never receive:

- Enable Banking private key or provider credentials.
- Supabase service role key.
- Enable Banking access or authorization tokens.
- Raw server-side error payloads containing secrets.
- Credentials for any bank.
- Any key that can bypass RLS.

The client may receive user-owned financial data only after authentication and authorization.

## Browser And Mobile Risks

The app may be used on mobile and desktop browsers. Risks include:

- Lost or unlocked devices.
- Browser extensions reading page data.
- Shared computers.
- Screenshots and notification previews.
- Cached pages.

Future mitigations may include short sessions, explicit sign-out, careful notification behavior, and avoiding unnecessary local storage.

## Compromised Email Risk

Because magic link login depends on email, a compromised email account may allow app access.

Future mitigations:

- MFA.
- Passkeys.
- Login notifications.
- Session revocation.
- Audit logs.

## Leaked Environment Variable Risk

If Enable Banking signing keys, provider tokens, or Supabase service role secrets leak, an attacker may access financial data or external APIs.

Mitigations:

- Keep secrets server-only.
- Avoid printing secrets in logs.
- Rotate leaked credentials immediately.
- Use least-privilege operational patterns.
- Separate development and production credentials.

## Service Role Risk

The Supabase service role bypasses RLS. It should only be used in server-only code when there is a clear reason.

Avoid:

- Using service role from client code.
- Using service role for ordinary user reads.
- Passing service role powered results without checking ownership.
- Making service role the default database client.

## Transaction Sync And Categorization Risks

Imported transactions should be treated as financial records. Transaction categories and category rules are app-owned metadata, but they may still reveal sensitive spending patterns.

Security expectations:

- Transaction rows must include `user_id` ownership and RLS.
- Category and category rule rows must include `user_id` ownership and RLS.
- Server-side sync may insert or update provider-owned transaction fields.
- Sync must preserve user-owned metadata such as `category_id` unless an explicit user action changes it.
- Deduplication identifiers such as `stable_import_key`, provider transaction IDs, and fingerprints should not be exposed beyond authenticated owner views.
- Logs should avoid printing full transaction descriptions, raw provider payloads, or large batches of transaction identifiers.
- Scheduled sync should not run until transaction upsert and deduplication behavior has been tested.

## Future Recommendations

- Add MFA or passkeys.
- Add audit logs for login, connection, sync, and export actions.
- Configure database backups and restore drills.
- Add rate limiting for auth-related and sync-related endpoints.
- Monitor sync failures and unusual access patterns.
- Add structured error handling that avoids leaking secrets.
- Review RLS policies before every schema expansion.
