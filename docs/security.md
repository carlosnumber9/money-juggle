# Security

This app handles financial data. Even as a personal project, it should be designed with explicit security boundaries from the beginning.

## Basic Threat Model

Important assets:

- Bank account metadata.
- Balances.
- Transactions.
- Transaction categories and category rules.
- Transaction labels and label assignments.
- Consent state.
- Manual asset data.
- Cobee consumption data.
- Supabase sessions.
- Supabase secret keys.
- Enable Banking signing keys and provider credentials.
- Enable Banking access or authorization tokens if used.
- Cobee client credentials and JWT access tokens if used.

Relevant threats:

- Unauthorized login.
- Unauthorized access to financial records.
- Leaked environment variables.
- Accidental exposure of server secrets to the browser.
- Overbroad secret key usage.
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
- Log server-side authentication milestones with a per-request auth log ID,
  masked email addresses, sanitized Supabase errors, and cookie diagnostics that
  do not include cookie values.
- Consider MFA or passkeys later.

Authentication logs are operational diagnostics, not an audit log. They should
help debug missing allowlist configuration, Supabase rate limits, callback code
exchange failures, and auth cookie write behavior without exposing secrets,
magic-link codes, session tokens, or full email addresses.

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

Supabase secret keys authorize the built-in Postgres `service_role`, bypass
RLS, and should be treated as highly sensitive.

## Secrets Management

Server-only secrets should be stored in Vercel environment variables and local
development secret files.

Never expose:

- `ENABLE_BANKING_PRIVATE_KEY`
- Enable Banking access or authorization tokens
- Supabase secret keys
- Internal sync secrets
- Webhook or cron secrets

Only variables intended for browser use may use `NEXT_PUBLIC_`.

## Sensitive Data Categories

High sensitivity:

- Credentials and API secrets.
- Access tokens and refresh tokens.
- Supabase secret keys.

Financial sensitivity:

- Account identifiers.
- Balances.
- Transactions.
- Transaction categories and category rules.
- Transaction labels and label assignments.
- Institution connections.
- Consent records.
- Manual asset values.
- Cobee consumption reports.

Operational sensitivity:

- Sync error details.
- Logs containing external IDs.
- Audit trails.

Logs should avoid secrets and should minimize financial detail.

Auth logs may include masked email addresses, request origins, redirect targets,
boolean cookie diagnostics, sanitized error names or status codes, and generated
correlation IDs. They must not include full emails, magic-link codes, access
tokens, refresh tokens, cookie values, private keys, or raw provider payloads.

## What Must Never Reach The Client

The browser must never receive:

- Enable Banking private key or provider credentials.
- Cobee client credentials or JWT access tokens.
- Supabase secret keys.
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

If Enable Banking signing keys, provider tokens, or Supabase secret keys leak, an attacker may access financial data or external APIs.

Mitigations:

- Keep secrets server-only.
- Avoid printing secrets in logs.
- Rotate leaked credentials immediately.
- Use least-privilege operational patterns.
- Separate development and production credentials.

## Secret Key Risk

Supabase secret keys authorize the built-in Postgres `service_role` and bypass
RLS. They should only be used in server-only code when there is a clear reason.

The Enable Banking connection flow uses a secret-key-backed client only for
controlled provider writes. The start step validates the authenticated user and
email allowlist; the callback step validates the provider `state` against the
pending connection before updating financial records. Ordinary user-facing reads
should continue to use the RLS-aware Supabase server client.

Avoid:

- Using secret keys from client code.
- Using secret keys for ordinary user reads.
- Passing secret-key-powered results without checking ownership.
- Making secret-key-backed clients the default database client.

## Transaction Sync And Categorization Risks

Imported transactions should be treated as financial records. Transaction categories and category rules are app-owned metadata, but they may still reveal sensitive spending patterns.

Security expectations:

- Transaction rows must include `user_id` ownership and RLS.
- Category and category rule rows must include `user_id` ownership and RLS.
- Server-side sync may insert or update provider-owned transaction fields.
- Sync must preserve user-owned metadata such as `category_id` unless an explicit user action changes it.
- Deduplication identifiers such as `stable_import_key`, provider transaction IDs, and fingerprints should not be exposed beyond authenticated owner views.
- Full IBAN values should not be stored for internal transfer matching. Store
  only server-generated HMAC fingerprints and keep the fingerprint secret
  server-only.
- Logs should avoid printing full transaction descriptions, raw provider payloads, or large batches of transaction identifiers.
- Scheduled sync should not run until transaction upsert and deduplication behavior has been tested.

Transaction labels follow the same security model as categorization:

- Labels and assignments must include owner-scoped access checks.
- Server actions should verify that the transaction and selected label belong
  to the same authenticated owner.
- Provider sync must not overwrite label assignments.
- Label names are normalized and unique per owner, and assignment foreign keys
  include `user_id` to prevent cross-owner relationships at the database level.

## Cobee By Pluxee Risks

Cobee by Pluxee is a future candidate integration for flexible compensation
consumption reports. It is not a PSD2 bank provider and should have its own
server-only boundary.

Security expectations:

- Keep Cobee `clientId`, `clientSecret`, and JWT access tokens server-only.
- Do not expose Cobee credentials or raw API responses to the browser.
- Use the narrowest useful read scope first, likely consumption report reads.
- Avoid employee administration, payroll mutation, or benefit-management writes
  unless the owner explicitly decides to expand the scope.
- Treat consumption reports as financial data owned by `user_id` and protected
  by RLS.
- Sanitize errors because company, employee, payroll, and benefit identifiers
  may be sensitive operational data.

## Future Recommendations

- Add MFA or passkeys.
- Add audit logs for login, connection, sync, and export actions.
- Configure database backups and restore drills.
- Add rate limiting for auth-related and sync-related endpoints.
- Monitor sync failures and unusual access patterns.
- Add structured error handling that avoids leaking secrets.
- Review RLS policies before every schema expansion.
