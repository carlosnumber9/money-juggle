# Enable Banking

This app should use Enable Banking as the primary Open Banking / PSD2 provider
for read-only bank account data.

GoCardless Bank Account Data was initially considered, but new private signups
were not available when the project reached the banking-provider step. Enable
Banking supports the project's immediate personal-use path because it allows a
restricted production application to link the owner's own accounts.

## Current Provider Decision

Status:

- Enable Banking application created.
- Environment: production.
- Service: Account Information.
- Application mode: restricted to own linked accounts.
- CaixaBank and ING appear as available ASPSPs and have been linked manually in
  the Enable Banking portal.
- Trade Republic does not appear as an available ASPSP and remains outside the
  initial PSD2 banking path.

Registered application URLs:

```text
Application URL:
https://money-juggle.vercel.app/

Redirect URL:
https://money-juggle.vercel.app/api/bank-connections/enable-banking/callback

Privacy policy URL:
https://money-juggle.vercel.app/privacy

Terms of service URL:
https://money-juggle.vercel.app/terms
```

The privacy and terms routes should exist before relying on the production
registration. They can start as short static pages because the first app version
is personal and read-only.

## Read-Only Scope

Allowed:

- List supported ASPSPs for relevant countries.
- Start an account information authorization flow.
- Redirect the owner to the bank for consent.
- Read linked accounts.
- Read account details.
- Read balances.
- Read transactions.
- Refresh data for previously linked own accounts while consent remains valid.

Not allowed:

- Payment initiation.
- Transfers.
- Mandates.
- Checkout.
- Scraping.
- Storing bank credentials.
- Exposing provider credentials or signing keys to the browser.

Enable Banking also offers payment-related capabilities, but this app must only
use Account Information.

## Important Concepts

### ASPSP

An ASPSP is an Account Servicing Payment Service Provider. In practice, for this
app, it usually means the bank or financial institution that holds the account,
such as CaixaBank or ING.

The app's `institutions` table can store Enable Banking ASPSP references as
provider-specific institution identifiers.

### Application Certificate

Enable Banking uses an RSA private key and public certificate for authorizing API
requests. The private key signs JWTs from the server. Enable Banking stores the
public certificate and uses it to verify that requests come from the registered
application.

The public certificate is safe to provide to Enable Banking. The private key is
a secret and must remain server-only.

The local generated files currently live under:

```text
.secrets/enable-banking/private.key
.secrets/enable-banking/public.crt
```

`.secrets/` is ignored by Git. Do not commit the private key.

### Own Linked Accounts

The current Enable Banking application is not a public multi-user integration.
It is a production application restricted to accounts that the owner explicitly
links through the Enable Banking portal or flow.

This fits the initial `money-juggle` scope:

- The app is personal.
- The owner is the only intended user.
- CaixaBank and ING can be linked without requesting general commercial
  availability.
- The app should still model ownership with `user_id` so it can grow safely.

## Conceptual Integration Flow

1. The owner signs in to `money-juggle`.
2. The app offers a bank connection flow for supported ASPSPs.
3. Server-only code creates or starts an Enable Banking authorization flow.
4. The browser is redirected to the authorization URL.
5. The owner completes consent with the bank.
6. Enable Banking redirects back to the registered callback URL.
7. Server-only code validates the callback and stores consent state.
8. Server-only code lists linked accounts.
9. Server-only code fetches account details, balances, and transactions.
10. The app stores normalized data under the authenticated user.

Implementation details may differ once the first API spike is built. Keep the
first technical slice narrow: authenticate server-side and fetch a harmless
resource before starting a full app UI flow.

## What To Store

Store enough information to understand and manage consent and synchronization:

- Provider name: `enable_banking`.
- Enable Banking ASPSP identifier.
- Internal institution row.
- External authorization or session identifier if provided by the API.
- Consent status.
- Consent expiration date if provided.
- Linked Enable Banking account identifiers.
- Last successful sync time.
- Sync failures.
- Consent lifecycle events.

For transactions, store normalized fields plus identity fields that make sync
idempotent:

- Internal account row.
- Provider name: `enable_banking`.
- Booking status: for example `booked`, `pending`, or `information`.
- Transaction amount and currency.
- Booking date and value date when available.
- Description or remittance information.
- Counterparty or merchant fields when available.
- Provider transaction ID when available.
- Provider internal transaction ID if available.
- Bank-provided references when available.
- App-computed `stable_import_key`.
- App-computed `deduplication_fingerprint`.
- `identity_source`, so it is clear which identity rule was used.
- First and last time the transaction was seen by sync.

Avoid storing:

- Enable Banking private keys in the database.
- Bank credentials.
- Unnecessary raw payloads.
- Sensitive tokens unless a clear server-side design requires them.

Raw transaction payloads should be avoided by default. If a limited
`raw_provider_data` field is useful for debugging, it should be intentionally
scoped and should not become a dumping ground for every API response.

## Transaction Identity

Transaction sync must be idempotent. If the same bank transaction is fetched
repeatedly, the app should update the existing row instead of creating a
duplicate.

There is no single external transaction ID that should be assumed to exist for
every transaction across all providers and banks. Provider IDs and bank-provided
references are useful but may be optional or bank-dependent.

Recommended identity priority:

```text
if provider_internal_transaction_id exists:
  provider_internal:{account_id}:{provider_internal_transaction_id}

else if provider_transaction_id exists:
  bank_transaction:{account_id}:{provider_transaction_id}

else if entry_reference exists:
  bank_entry_reference:{account_id}:{entry_reference}

else if end_to_end_id exists and is meaningful:
  bank_end_to_end:{account_id}:{end_to_end_id}

else:
  fingerprint:{account_id}:{deduplication_fingerprint}
```

Important rules:

- Always scope external transaction identifiers to the internal `account_id`.
- Keep the internal Supabase `transactions.id` separate from provider
  identifiers.
- Store the original identifiers even when `stable_import_key` is computed from
  another identifier.
- Store `identity_source` to make future debugging possible.
- Use a unique constraint on `user_id`, `account_id`, and `stable_import_key`.

## Transaction Fingerprints

`deduplication_fingerprint` is the fallback identity when no useful external
identifier is available.

It should be a hash of normalized values such as:

- Internal `account_id`.
- Booking date or value date.
- Amount in minor units.
- Currency.
- Normalized description or remittance text.
- Counterparty or merchant name when available.
- Counterparty account suffix when available.
- Bank transaction code or merchant category code when available.

The fingerprint implementation should normalize whitespace, casing, decimal
precision, missing fields, and date formats before hashing.

Fingerprints are useful but imperfect. They can collide in rare cases, for
example two same-day card payments for the same amount and merchant. They can
also change if the bank later updates text or dates. For that reason,
fingerprints should be treated as fallback identity, not as a stronger source
than provider IDs.

## Transaction Upsert And Reconciliation

Transaction persistence should follow an upsert-like flow:

1. Fetch transactions server-side from Enable Banking.
2. Normalize each transaction into app fields.
3. Compute `stable_import_key`.
4. Search for an existing row with the same `user_id`, `account_id`, and
   `stable_import_key`.
5. If found, update provider-owned fields and `last_seen_at`.
6. Preserve user-owned fields such as `category_id`, user notes, or manual
   review state.
7. If no row exists by `stable_import_key`, search for recent compatible
   same-account candidates using stored external IDs and the fallback
   fingerprint.
8. If a compatible candidate exists, update that row and improve its identity
   fields.
9. If no compatible candidate exists, insert a new transaction.

This reconciliation step matters because a transaction may first arrive as
pending or incomplete and later arrive as booked with stronger identifiers or
slightly different dates/descriptions.

Pending transactions should be treated as provisional:

- They may be shown in the UI later if useful.
- They should not be the main source for permanent reports unless intentionally
  designed.
- Manual categories should primarily apply to booked transactions.
- If a pending row is later reconciled with a booked row, user-owned metadata
  should be preserved where safe.

## Consent Expiration

PSD2 consents expire. The app should make expiration visible in the data model
and UI.

Future behavior should include:

- Marking connections as expired when consent is no longer valid.
- Showing a Spanish user-visible reconnection message.
- Starting a fresh authorization flow when reconnection is requested.
- Preserving historical account and transaction data unless the owner
  intentionally removes it.

## Reconnection

Reconnection should be treated as a normal lifecycle event, not an exceptional
state.

The app should:

- Keep the old connection history.
- Start a new authorization flow or update the existing connection according to
  the chosen design.
- Record a `consent_events` row.
- Resume sync only after consent is valid again.

## Synchronization Errors

Sync errors should be recorded in `sync_runs`.

Useful fields:

- Status.
- Error code.
- Sanitized error message.
- Start and finish times.
- Connection or account affected.
- Retry eligibility.

Do not store secrets or full sensitive API responses in error logs.

## Secret Handling

Enable Banking credentials and signing material must live only in server-side
environment variables or local ignored secret files.

Never expose:

- `ENABLE_BANKING_APPLICATION_ID` if it is not needed by client code.
- `ENABLE_BANKING_PRIVATE_KEY`.
- Provider access tokens or authorization tokens.
- Supabase service role keys.

Any variable containing secrets must not use `NEXT_PUBLIC_`.

## Client/UI Separation

The UI may:

- Show available banks.
- Start a connection flow by calling an internal server endpoint.
- Redirect the browser to the consent URL returned by the server.
- Show connection and sync status.

The UI must not:

- Call Enable Banking directly.
- Hold Enable Banking credentials or signing keys.
- Parse raw Enable Banking payloads.
- Decide whether a user can access another user's connection.

Server-side modules should own the Enable Banking client, request signing,
request handling, normalization, and persistence.

## Future Implementation Notes

When implementation begins, prefer small steps:

1. Document required environment variables.
2. Implement one server-only signed API request.
3. List ASPSPs for Spain.
4. Confirm CaixaBank and ING identifiers.
5. Start one account information authorization flow.
6. Handle callback.
7. Store linked accounts.
8. Add balances.
9. Add transactions.

Each step should be verified before moving to the next one.
